// Firestore social layer contract types.
//
// Mirrors the shapes defined in `micboxx-web/src/lib/firebase-social.ts`.
// These are the documents stored in Firestore under the rules declared in
// `micboxx-web/firestore.rules`. Mobile reads/writes Firestore directly
// after obtaining a Firebase custom token via the web bridge endpoint
// `POST /api/social/auth/token` (Authorization: Bearer {drupal_token}).
//
// Timestamps here are ISO 8601 strings AFTER client-side conversion from
// Firestore's native Timestamp objects. When reading with the Firebase
// client SDK, call `.toDate().toISOString()` on every Timestamp field
// before handing the document to any UI layer that expects these types.
//
// For the canonical doc-ID conventions (single vs double underscores,
// sorted uid pairs, etc.) see the "Firestore schema reference" section of
// `docs/micboxx-mobile-api-contract-map.md`.

export type TrackCommentStatus = "active" | "hidden" | "deleted";
export type DirectMessageStatus = "active" | "hidden";
export type SocialReportTargetType = "track_comment" | "direct_message";
export type SocialReportStatus = "open" | "actioned" | "dismissed";
export type SocialNotificationType =
  | "track_like"
  | "follow"
  | "track_comment"
  | "direct_message";

export const SOCIAL_REPORT_REASON_OPTIONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam or scam" },
  { value: "hate", label: "Hate or abusive language" },
  { value: "sexual_content", label: "Sexual or explicit content" },
  { value: "copyright", label: "Copyright or ownership issue" },
  { value: "other", label: "Other" },
] as const;

export type SocialReportReasonKey = (typeof SOCIAL_REPORT_REASON_OPTIONS)[number]["value"];

/** Globally readable aggregated counts — use for display only, never for auth. */
export interface TrackSocialMeta {
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
}

/** Globally readable aggregated counts — use for display only, never for auth. */
export interface UserSocialMeta {
  followerCount: number;
  followingCount: number;
}

export interface UserBlock {
  blockerUid: string;
  blockedUid: string;
  createdAt: string | null;
}

export interface TrackComment {
  id: string;
  authorUid: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  trackId: string;
  subjectType: string;
  subjectKey: string;
  trackOwnerUid: string | null;
  body: string;
  status: TrackCommentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface SocialNotification {
  id: string;
  userUid: string;
  type: SocialNotificationType;
  actorUid: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  trackId: string | null;
  trackTitle: string | null;
  commentId: string | null;
  commentPreview: string | null;
  conversationId: string | null;
  messageId: string | null;
  messagePreview: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string | null;
  readAt: string | null;
  seenAt: string | null;
}

export interface DirectConversation {
  id: string;
  type: "direct";
  /** Exactly two uids on a direct conversation. Typed loosely for Firestore tuple reads. */
  participantUids: string[];
  participantUsernames: string[];
  participantDisplayNames: string[];
  participantHrefs: string[];
  createdAt: string | null;
  updatedAt: string | null;
  lastMessageAt: string | null;
  lastMessageSenderUid: string | null;
  lastMessagePreview: string | null;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderUsername: string | null;
  senderDisplayName: string | null;
  body: string;
  status: DirectMessageStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SocialReport {
  id: string;
  reporterUid: string;
  reporterUsername: string | null;
  reporterDisplayName: string | null;
  targetType: SocialReportTargetType;
  targetId: string;
  reportedUserUid: string | null;
  reasonKey: SocialReportReasonKey;
  detail: string | null;
  targetPreview: string | null;
  subjectKey: string | null;
  conversationId: string | null;
  status: SocialReportStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserConversationInboxItem {
  id: string;
  conversationId: string;
  userUid: string;
  conversationType: "direct";
  otherParticipantUid: string | null;
  otherParticipantUsername: string | null;
  otherParticipantDisplayName: string | null;
  otherParticipantHref: string | null;
  unreadCount: number;
  lastReadAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastMessageAt: string | null;
  lastMessageSenderUid: string | null;
  lastMessagePreview: string | null;
}

/**
 * Successful payload returned by `POST {WEB_BASE_URL}/api/social/auth/token`
 * when the mobile client presents a valid Drupal bearer token in the
 * Authorization header. The `token` is a Firebase custom auth token that
 * mobile should pass to `signInWithCustomToken(auth, token)`. `uid` equals
 * the Drupal user uuid — keep it for display and for constructing document
 * IDs (`{trackId}_{uid}`, `{followerUid}_{followeeUid}`, etc.).
 */
export interface FirebaseSocialAuthTokenResponse {
  token: string;
  uid: string;
}
