import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DirectMessage } from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { ComposeBar } from "@/features/social/components/ComposeBar";
import { MessageBubble } from "@/features/social/components/MessageBubble";
import { sendDirectMessage } from "@/features/social/dm-service";
import { useConversation } from "@/features/social/hooks/useConversation";
import { tokens } from "@/theme/tokens";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : null;
  const { session, signIn, isSigningIn } = useAuth();
  const {
    conversation,
    messages,
    loading,
    error,
    isReady,
    canRetry,
    retry,
  } = useConversation(conversationId);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<DirectMessage>>(null);

  const otherParticipantName = useMemo(() => {
    if (!conversation || !session?.user.uuid) {
      return "Conversation";
    }

    const index = conversation.participantUids.findIndex(
      (uid) => uid !== session.user.uuid,
    );
    return (
      conversation.participantDisplayNames[index] ||
      conversation.participantUsernames[index] ||
      "Conversation"
    );
  }, [conversation, session?.user.uuid]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  async function handleSend() {
    if (!session?.user || !conversationId || sending) {
      return;
    }

    try {
      setSending(true);
      await sendDirectMessage({
        conversationId,
        sender: session.user,
        body,
      });
      setBody("");
    } catch (nextError) {
      Alert.alert(
        "Message not sent",
        nextError instanceof Error ? nextError.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons
              name="chevron-back"
              size={20}
              color={tokens.colors.textPrimary}
            />
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            {otherParticipantName}
          </Text>
          <View style={styles.iconSpacer} />
        </View>

        {!session ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Sign in required</Text>
            <Text style={styles.emptyText}>
              Sign in to open your MicBoxx conversations and send messages.
            </Text>
            <Pressable
              onPress={() => void signIn()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              {isSigningIn ? (
                <ActivityIndicator color={tokens.colors.textPrimary} />
              ) : (
                <Text style={styles.primaryButtonLabel}>Sign in</Text>
              )}
            </Pressable>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Unable to load conversation</Text>
            <Text style={styles.emptyText}>{error}</Text>
            {canRetry ? (
              <Pressable
                onPress={retry}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonLabel}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : loading || !isReady ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.colors.accent} />
            <Text style={styles.emptyText}>Loading conversation…</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isMine={item.senderUid === session.user.uuid}
                />
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptyText}>
                    Say hello to start the conversation.
                  </Text>
                </View>
              }
            />
            <ComposeBar
              value={body}
              onChangeText={setBody}
              onSend={handleSend}
              disabled={sending}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  iconSpacer: {
    width: 38,
    height: 38,
  },
  title: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  primaryButton: {
    minWidth: 132,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
  },
  primaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    minWidth: 116,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.88,
  },
});
