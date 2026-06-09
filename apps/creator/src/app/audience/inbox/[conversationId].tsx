import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { addDoc } from "firebase/firestore";
import { AppHeader, Screen, Skeleton, EmptyState, ErrorState, useToast } from "@micboxx/ui";
import type { DirectMessage, SocialReportReasonKey } from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { getFirebaseClientDb } from "@/config/firebase";
import { ComposeBar } from "@/features/social/components/ComposeBar";
import { MessageBubble } from "@/features/social/components/MessageBubble";
import { SocialReportModal } from "@/features/social/components/SocialReportModal";
import { buildSocialReportPayload, getSocialReportsCollection } from "@/features/social/firestore";
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
import { tokens } from "@micboxx/theme";

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
  const { showToast } = useToast();
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

  const [reportVisible, setReportVisible] = useState(false);
  const [reportReasonKey, setReportReasonKey] = useState<SocialReportReasonKey>("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function handleSubmitReport() {
    if (!session?.user || !otherParticipant?.uuid) return;
    setReportSubmitting(true);
    setReportError(null);
    try {
      const db = getFirebaseClientDb();
      await addDoc(
        getSocialReportsCollection(db),
        buildSocialReportPayload({
          reporterUid: session.user.uuid,
          reporterUsername: session.user.username ?? null,
          reporterDisplayName: session.user.displayName ?? null,
          targetType: "direct_message",
          targetId: conversationId ?? "",
          reportedUserUid: otherParticipant.uuid,
          reasonKey: reportReasonKey,
          detail: reportDetail.trim(),
        }),
      );
      setReportVisible(false);
      setReportDetail("");
      showToast({
        tone: "success",
        title: "Report submitted",
        message: "Thank you. Our moderation team will review this conversation.",
      });
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Unable to submit report. Please try again.",
      );
    } finally {
      setReportSubmitting(false);
    }
  }

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
      showToast({
        tone: "success",
        title: "Message Sent",
        message: "Your direct message has been sent.",
      });
    } catch (nextError) {
      showToast({
        tone: "error",
        title: "Message Not Sent",
        message: nextError instanceof Error ? nextError.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen scroll={false} noPaddingHorizontal={true} header={<AppHeader variant="detail" title={otherParticipantName} fallbackRoute="/audience/inbox" />}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {relationshipSignals.length > 0 ? (
          <View style={styles.signalRail}>
            {relationshipSignals.map((signal) => (
              <View key={signal} style={styles.signalChip}>
                <Text style={styles.signalText}>{signal}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {!session ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Sign in required"
            description="Sign in to open your MicBoxx conversations and send messages."
            action={{
              label: "Sign in",
              onPress: () => void signIn(),
              loading: isSigningIn,
            }}
          />
        ) : error ? (
          <ErrorState
            title="Unable to load conversation"
            message={error}
            onRetry={canRetry ? retry : undefined}
          />
        ) : loading || !isReady ? (
          <View style={styles.listContent}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={`bubble-skeleton-${index}`}
                style={[
                  styles.skeletonBubbleWrap,
                  index % 2 === 0 ? styles.skeletonBubbleMine : styles.skeletonBubbleTheirs,
                ]}
              >
                <Skeleton width={index % 2 === 0 ? "60%" : "40%"} height={36} borderRadius={18} />
              </View>
            ))}
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
                <EmptyState
                  title="No messages yet"
                  description="Say hello to start the conversation."
                />
              }
              ListFooterComponent={
                <ConversationContext
                  role={role}
                  relationshipCue={relationshipCue}
                  contextItems={contextItems}
                  onReport={() => setReportVisible(true)}
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

      <SocialReportModal
        visible={reportVisible}
        title="Report conversation"
        reasonKey={reportReasonKey}
        detail={reportDetail}
        submitting={reportSubmitting}
        error={reportError}
        onChangeReason={setReportReasonKey}
        onChangeDetail={setReportDetail}
        onClose={() => {
          setReportVisible(false);
          setReportError(null);
        }}
        onSubmit={() => void handleSubmitReport()}
      />
    </Screen>
  );
}

function ConversationContext({
  role,
  relationshipCue,
  contextItems,
  onReport,
}: {
  role: string;
  relationshipCue: string;
  contextItems: string[];
  onReport: () => void;
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
      <Pressable
        onPress={onReport}
        style={({ pressed }) => [styles.reportButton, pressed && styles.reportButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Report this conversation"
      >
        <Ionicons name="flag-outline" size={16} color={tokens.colors.textMuted} />
        <Text style={styles.reportButtonLabel}>Report conversation</Text>
      </Pressable>
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
  signalRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  reportButtonPressed: {
    opacity: 0.7,
  },
  reportButtonLabel: {
    color: tokens.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
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
  skeletonBubbleWrap: {
    width: "100%",
    marginBottom: 12,
  },
  skeletonBubbleMine: {
    alignItems: "flex-end",
  },
  skeletonBubbleTheirs: {
    alignItems: "flex-start",
  },
});
