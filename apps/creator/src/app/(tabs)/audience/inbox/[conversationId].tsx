import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
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

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import type { DirectMessage } from "@/contracts/social";
import { useAuth } from "@/features/auth/provider";
import { ComposeBar } from "@/features/social/components/ComposeBar";
import { MessageBubble } from "@/features/social/components/MessageBubble";
import { sendDirectMessage } from "@/features/social/dm-service";
import { useConversation } from "@/features/social/hooks/useConversation";
import { useInbox } from "@/features/social/hooks/useInbox";
import {
  buildCatalogContextCopy,
  buildRelationshipSignals,
  getOtherParticipantFromConversation,
  getRelationshipCue,
  resolveParticipantRole,
} from "@/features/social/message-ui";
import { tokens } from "@/theme/tokens";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : null;
  const { session, signIn, isSigningIn } = useAuth();
  const inbox = useInbox();
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

  const selectedInboxItem = useMemo(
    () =>
      conversationId
        ? inbox.items.find(
            (item) =>
              item.id === conversationId || item.conversationId === conversationId,
          ) ?? null
        : null,
    [conversationId, inbox.items],
  );

  const otherParticipant = useMemo(
    () =>
      getOtherParticipantFromConversation(conversation, session?.user.uuid) ??
      (selectedInboxItem
        ? {
            uuid: selectedInboxItem.otherParticipantUid ?? "",
            username: selectedInboxItem.otherParticipantUsername,
            displayName: selectedInboxItem.otherParticipantDisplayName,
          }
        : null),
    [conversation, selectedInboxItem, session?.user.uuid],
  );

  const otherParticipantName =
    otherParticipant?.displayName ?? otherParticipant?.username ?? "Messages";
  const role = resolveParticipantRole(
    selectedInboxItem ??
      (otherParticipant
        ? {
            username: otherParticipant.username,
            displayName: otherParticipant.displayName,
          }
        : null),
  );
  const relationshipCue = getRelationshipCue(selectedInboxItem, role);
  const relationshipSignals = buildRelationshipSignals({
    item: selectedInboxItem,
    role,
    unreadCount: selectedInboxItem?.unreadCount ?? 0,
  });
  const contextItems = buildCatalogContextCopy(
    selectedInboxItem?.lastMessagePreview ?? conversation?.lastMessagePreview,
    role,
  );

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
        <View style={styles.threadPanel}>
          <View style={styles.header}>
            <ScreenHeader
              title={otherParticipantName}
              subtitle={`${role} · ${relationshipCue}`}
            />
          </View>

          <View style={styles.signalRail}>
            {relationshipSignals.map((signal) => (
              <View key={signal} style={styles.signalChip}>
                <Text style={styles.signalText}>{signal}</Text>
              </View>
            ))}
          </View>
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
                <View style={styles.emptyConversation}>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptyText}>
                    Say hello to start the conversation.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <ConversationContext
                  role={role}
                  relationshipCue={relationshipCue}
                  contextItems={contextItems}
                />
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

function ConversationContext({
  role,
  relationshipCue,
  contextItems,
}: {
  role: string;
  relationshipCue: string;
  contextItems: string[];
}) {
  return (
    <View style={styles.contextSection}>
      <Text style={styles.contextEyebrow}>Context</Text>
      <ContextCard
        icon="sparkles-outline"
        title="Relationship"
        lines={[role, relationshipCue]}
      />
      <ContextCard
        icon="disc-outline"
        title="Catalog context"
        lines={contextItems}
      />
      <ContextCard
        icon="shield-checkmark-outline"
        title="Safety tools"
        lines={[
          "Block, report, and review conversation safety controls from this thread.",
          "Blocked members and moderation tools will appear here once available.",
        ]}
      />
    </View>
  );
}

function ContextCard({
  icon,
  title,
  lines,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  lines: string[];
}) {
  return (
    <View style={styles.contextCard}>
      <View style={styles.contextTitleRow}>
        <Ionicons name={icon} size={15} color={tokens.colors.accent} />
        <Text style={styles.contextTitle}>{title}</Text>
      </View>
      {lines.map((line) => (
        <Text key={line} style={styles.contextLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  threadPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 18,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.025)",
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  signalRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  signalChip: {
    borderRadius: tokens.radii.pill,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  signalText: {
    color: "rgba(247,250,252,0.66)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  emptyConversation: {
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  contextSection: {
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  contextEyebrow: {
    color: "rgba(247,250,252,0.46)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.1,
    textTransform: "uppercase",
  },
  contextCard: {
    borderRadius: 12,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 14,
    gap: 8,
  },
  contextTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  contextTitle: {
    color: "rgba(247,250,252,0.52)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  contextLine: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 13,
    lineHeight: 19,
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
    borderColor: tokens.colors.borderSubtle,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
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
    opacity: 0.84,
  },
});
