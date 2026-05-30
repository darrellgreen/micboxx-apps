import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { SocialReportReasonKey, TrackComment } from "@/contracts/social";
import { ComposeBar } from "@/features/social/components/ComposeBar";
import { SocialReportModal } from "@/features/social/components/SocialReportModal";
import { useTrackComments } from "@/features/social/hooks/useTrackComments";
import { tokens } from "@/theme/tokens";

function formatRelativeDate(value: string | null): string {
  if (!value) {
    return "just now";
  }

  const target = new Date(value);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) >= year) {
    return formatter.format(Math.round(diffMs / year), "year");
  }
  if (Math.abs(diffMs) >= month) {
    return formatter.format(Math.round(diffMs / month), "month");
  }
  if (Math.abs(diffMs) >= day) {
    return formatter.format(Math.round(diffMs / day), "day");
  }
  if (Math.abs(diffMs) >= hour) {
    return formatter.format(Math.round(diffMs / hour), "hour");
  }

  return formatter.format(Math.round(diffMs / minute), "minute");
}

function commentAuthorLabel(comment: TrackComment) {
  return comment.authorDisplayName ?? comment.authorUsername ?? "Unknown";
}

function CommentRow({
  comment,
  ownComment,
  isEditing,
  editingText,
  onChangeEditingText,
  onBeginEditing,
  onCancelEditing,
  onSaveEdit,
  onDelete,
  onReport,
  saving,
  deleting,
  reporting,
}: {
  comment: TrackComment;
  ownComment: boolean;
  isEditing: boolean;
  editingText: string;
  onChangeEditingText: (nextValue: string) => void;
  onBeginEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  saving: boolean;
  deleting: boolean;
  reporting: boolean;
}) {
  const authorLabel = commentAuthorLabel(comment);

  return (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarLabel}>
          {authorLabel.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.commentBody}>
        <View style={styles.commentMetaRow}>
          <Text style={styles.commentAuthor} numberOfLines={1}>
            {authorLabel}
          </Text>
          <Text style={styles.commentTimestamp}>
            {formatRelativeDate(comment.createdAt)}
          </Text>
          {comment.editedAt ? (
            <Text style={styles.commentEdited}>Edited</Text>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.editWrap}>
            <TextInput
              value={editingText}
              onChangeText={onChangeEditingText}
              editable={!saving}
              multiline
              maxLength={2000}
              style={styles.editInput}
            />

            <View style={styles.editActionsRow}>
              <Pressable
                disabled={saving || editingText.trim().length === 0}
                onPress={onSaveEdit}
                style={({ pressed }) => [
                  styles.editActionButton,
                  styles.editActionPrimary,
                  (saving || editingText.trim().length === 0) && styles.disabled,
                  pressed &&
                  !(saving || editingText.trim().length === 0)
                    ? styles.pressed
                    : null,
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={tokens.colors.bgApp} />
                ) : null}
                <Text style={styles.editActionPrimaryLabel}>Save</Text>
              </Pressable>

              <Pressable
                disabled={saving}
                onPress={onCancelEditing}
                style={({ pressed }) => [
                  styles.editActionButton,
                  styles.editActionSecondary,
                  pressed && !saving ? styles.pressed : null,
                ]}
              >
                <Text style={styles.editActionSecondaryLabel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.commentText}>{comment.body}</Text>
        )}
      </View>

      <View style={styles.commentActions}>
        {!ownComment && !isEditing ? (
          <Pressable
            disabled={reporting}
            onPress={onReport}
            style={({ pressed }) => [
              styles.commentActionIcon,
              pressed && !reporting ? styles.pressed : null,
            ]}
          >
            {reporting ? (
              <ActivityIndicator size="small" color={tokens.colors.textSecondary} />
            ) : (
              <Ionicons
                name="flag-outline"
                size={15}
                color={tokens.colors.textSecondary}
              />
            )}
          </Pressable>
        ) : null}

        {ownComment && !isEditing ? (
          <>
            <Pressable
              disabled={saving || deleting}
              onPress={onBeginEditing}
              style={({ pressed }) => [
                styles.commentActionIcon,
                pressed && !(saving || deleting) ? styles.pressed : null,
              ]}
            >
              <Ionicons
                name="pencil-outline"
                size={15}
                color={tokens.colors.textSecondary}
              />
            </Pressable>

            <Pressable
              disabled={saving || deleting}
              onPress={onDelete}
              style={({ pressed }) => [
                styles.commentActionIcon,
                pressed && !(saving || deleting) ? styles.pressed : null,
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={tokens.colors.textSecondary} />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={tokens.colors.textSecondary}
                />
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

export function TrackComments({
  trackUuid,
  trackOwnerUid,
  trackTitle,
  trackHref,
  commentCount,
  commentsAllowed,
}: {
  trackUuid: string;
  trackOwnerUid: string | null;
  trackTitle?: string | null;
  trackHref?: string | null;
  commentCount: number;
  commentsAllowed: boolean;
}) {
  const [composerText, setComposerText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reportTarget, setReportTarget] = useState<TrackComment | null>(null);
  const [reportReasonKey, setReportReasonKey] =
    useState<SocialReportReasonKey>("harassment");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const {
    configured,
    isSignedIn,
    viewerUid,
    socialReady,
    authPending,
    comments,
    loading,
    loadingMore,
    hasMore,
    error,
    interactionError,
    submitting,
    savingCommentId,
    deletingCommentId,
    reportingCommentId,
    clearInteractionError,
    createComment,
    editComment,
    deleteComment,
    reportComment,
    loadMore,
    signIn,
  } = useTrackComments({
    trackUuid,
    trackOwnerUid,
    trackTitle,
    trackHref,
  });
  const total = Math.max(commentCount, comments.length);

  async function handleCreateComment() {
    const submitted = await createComment(composerText);
    if (submitted) {
      setComposerText("");
      setReportSuccess(null);
    }
  }

  function beginEditing(comment: TrackComment) {
    setEditingCommentId(comment.id);
    setEditingText(comment.body);
    clearInteractionError();
  }

  function cancelEditing() {
    setEditingCommentId(null);
    setEditingText("");
  }

  async function handleSaveEdit(comment: TrackComment) {
    const saved = await editComment(comment.id, editingText);
    if (saved) {
      cancelEditing();
    }
  }

  function handleDelete(comment: TrackComment) {
    Alert.alert(
      "Delete comment?",
      "This removes the comment from the public conversation.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const deleted = await deleteComment(comment);
              if (deleted && editingCommentId === comment.id) {
                cancelEditing();
              }
            })();
          },
        },
      ],
    );
  }

  function openReport(comment: TrackComment) {
    setReportTarget(comment);
    setReportReasonKey("harassment");
    setReportDetail("");
    setReportSuccess(null);
    clearInteractionError();
  }

  function closeReport() {
    if (reportingCommentId) {
      return;
    }

    setReportTarget(null);
    setReportDetail("");
  }

  async function submitReport() {
    if (!reportTarget) {
      return;
    }

    const submitted = await reportComment(
      reportTarget,
      reportReasonKey,
      reportDetail,
    );

    if (submitted) {
      setReportTarget(null);
      setReportDetail("");
      setReportSuccess("Report submitted.");
    }
  }

  const composerDisabled =
    !commentsAllowed ||
    !configured ||
    !socialReady ||
    !trackOwnerUid ||
    submitting ||
    authPending;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={15}
            color={tokens.colors.textSecondary}
          />
          <Text style={styles.sectionEyebrow}>
            {total} {total === 1 ? "Comment" : "Comments"}
          </Text>
        </View>
      </View>

      {!commentsAllowed ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comments are turned off</Text>
          <Text style={styles.infoBody}>
            This track is not accepting public comments.
          </Text>
        </View>
      ) : !configured ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comments unavailable</Text>
          <Text style={styles.infoBody}>
            Social features are not configured for this build.
          </Text>
        </View>
      ) : !isSignedIn ? (
        <View style={styles.promptCard}>
          <View style={styles.promptIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={14}
              color={tokens.colors.textSecondary}
            />
          </View>

          <View style={styles.promptCopy}>
            <Text style={styles.infoTitle}>Join the conversation</Text>
            <Text style={styles.infoBody}>
              Sign in to post comments on this track.
            </Text>
          </View>

          <Pressable
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.promptButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.promptButtonLabel}>Sign in</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.composerShell}>
          <ComposeBar
            value={composerText}
            onChangeText={setComposerText}
            onSend={() => void handleCreateComment()}
            disabled={composerDisabled}
            placeholder="Write a comment…"
            maxLength={2000}
          />
        </View>
      )}

      {reportSuccess ? (
        <Text style={styles.successLabel}>{reportSuccess}</Text>
      ) : null}

      {interactionError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Social unavailable</Text>
          <Text style={styles.errorBody}>{interactionError}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load comments</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}

      {!socialReady && isSignedIn && configured && commentsAllowed ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={tokens.colors.accent} />
          <Text style={styles.stateLabel}>Connecting social features…</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={tokens.colors.accent} />
          <Text style={styles.stateLabel}>Loading comments…</Text>
        </View>
      ) : comments.length > 0 ? (
        <View style={styles.list}>
          {comments.map((comment) => {
            const ownComment = Boolean(viewerUid && viewerUid === comment.authorUid);
            const isEditing = editingCommentId === comment.id;

            return (
              <CommentRow
                key={comment.id}
                comment={comment}
                ownComment={ownComment}
                isEditing={isEditing}
                editingText={isEditing ? editingText : comment.body}
                onChangeEditingText={setEditingText}
                onBeginEditing={() => beginEditing(comment)}
                onCancelEditing={cancelEditing}
                onSaveEdit={() => void handleSaveEdit(comment)}
                onDelete={() => handleDelete(comment)}
                onReport={() => openReport(comment)}
                saving={savingCommentId === comment.id}
                deleting={deletingCommentId === comment.id}
                reporting={reportingCommentId === comment.id}
              />
            );
          })}

          {hasMore ? (
            <Pressable
              onPress={() => void loadMore()}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed && styles.pressed,
              ]}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={tokens.colors.textPrimary} />
              ) : null}
              <Text style={styles.loadMoreLabel}>
                {loadingMore ? "Loading more…" : "Load more comments"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>No comments yet</Text>
          <Text style={styles.infoBody}>
            Be the first to join the conversation on this track.
          </Text>
        </View>
      )}

      <SocialReportModal
        visible={reportTarget !== null}
        reasonKey={reportReasonKey}
        detail={reportDetail}
        submitting={Boolean(reportTarget && reportingCommentId === reportTarget.id)}
        error={interactionError ?? null}
        onChangeReason={setReportReasonKey}
        onChangeDetail={setReportDetail}
        onClose={closeReport}
        onSubmit={() => void submitReport()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionEyebrow: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  composerShell: {
    overflow: "hidden",
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  promptIcon: {
    width: 30,
    height: 30,
    borderRadius: tokens.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  promptCopy: {
    flex: 1,
    gap: 4,
  },
  promptButton: {
    minHeight: 36,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  promptButtonLabel: {
    color: tokens.colors.bgApp,
    fontSize: 12,
    fontWeight: "800",
  },
  successLabel: {
    color: tokens.colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 8,
  },
  commentRow: {
    flexDirection: "row",
    gap: 12,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  commentAvatar: {
    marginTop: 2,
    width: 28,
    height: 28,
    borderRadius: tokens.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
    flexShrink: 0,
  },
  commentAvatarLabel: {
    color: tokens.colors.accentLight,
    fontSize: 11,
    fontWeight: "800",
  },
  commentBody: {
    flex: 1,
    gap: 6,
  },
  commentMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  commentAuthor: {
    flexShrink: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  commentTimestamp: {
    color: tokens.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  commentEdited: {
    color: tokens.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commentText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  commentActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editWrap: {
    gap: 10,
  },
  editInput: {
    minHeight: 96,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    color: tokens.colors.textPrimary,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  editActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  editActionButton: {
    minHeight: 34,
    borderRadius: tokens.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 8,
  },
  editActionPrimary: {
    backgroundColor: tokens.colors.accent,
  },
  editActionSecondary: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editActionPrimaryLabel: {
    color: tokens.colors.bgApp,
    fontSize: 12,
    fontWeight: "800",
  },
  editActionSecondaryLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  stateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stateLabel: {
    color: tokens.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    gap: 6,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  infoBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    gap: 6,
    borderRadius: tokens.radii.lg,
    backgroundColor: "rgba(255,96,96,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorTitle: {
    color: "#ffd0d0",
    fontSize: 14,
    fontWeight: "700",
  },
  errorBody: {
    color: "#ffb3b3",
    fontSize: 14,
    lineHeight: 20,
  },
  loadMoreButton: {
    minHeight: 42,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loadMoreLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
