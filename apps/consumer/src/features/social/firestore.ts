import {
    collection,
    doc,
    serverTimestamp,
    Timestamp,
    type CollectionReference,
    type Firestore,
} from "firebase/firestore";

import type { MicboxxSessionUser } from "@micboxx/contracts";
import type {
    DirectConversation,
    DirectMessage,
    SocialReportReasonKey,
    SocialReportTargetType,
    SocialNotification,
    TrackComment,
    TrackSocialMeta,
    UserSocialMeta,
    UserConversationInboxItem,
} from "@micboxx/contracts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function getSortedParticipantUids(
  uidA: string,
  uidB: string,
): [string, string] {
  const [left, right] = [uidA.trim(), uidB.trim()].sort((a, b) =>
    a.localeCompare(b),
  );
  return [left, right];
}

export function getDirectConversationId(uidA: string, uidB: string): string {
  const [left, right] = getSortedParticipantUids(uidA, uidB);
  return `${left}__${right}`;
}

export function getConversationRef(db: Firestore, conversationId: string) {
  return doc(db, "conversations", conversationId);
}

export function getTrackSocialMetaRef(db: Firestore, trackUuid: string) {
  return doc(db, "tracks_meta", trackUuid);
}

export function getTrackSubjectKey(trackUuid: string) {
  return `music.track:${trackUuid}`;
}

export function getUserSocialMetaRef(db: Firestore, userUuid: string) {
  return doc(db, "users_meta", userUuid);
}

export function getTrackLikeDocId(trackUuid: string, userUuid: string) {
  return `${trackUuid}_${userUuid}`;
}

export function getFollowDocId(followerUid: string, followeeUid: string) {
  return `${followerUid}_${followeeUid}`;
}

export function getTrackLikeRef(
  db: Firestore,
  trackUuid: string,
  userUuid: string,
) {
  return doc(db, "trackLikes", getTrackLikeDocId(trackUuid, userUuid));
}

export function getTrackFavoriteRef(
  db: Firestore,
  trackUuid: string,
  userUuid: string,
) {
  return doc(db, "trackFavorites", getTrackLikeDocId(trackUuid, userUuid));
}

export function getFollowRef(
  db: Firestore,
  followerUid: string,
  followeeUid: string,
) {
  return doc(db, "follows", getFollowDocId(followerUid, followeeUid));
}

export function getConversationMessagesCollection(
  db: Firestore,
  conversationId: string,
): CollectionReference {
  return collection(db, "conversations", conversationId, "messages");
}

export function getUserConversationItemsCollection(
  db: Firestore,
  userUid: string,
) {
  return collection(db, "userConversations", userUid, "items");
}

export function getNotificationsCollection(db: Firestore) {
  return collection(db, "notifications");
}

export function getTrackCommentsCollection(db: Firestore) {
  return collection(db, "trackComments");
}

export function getTrackCommentRef(db: Firestore, commentId: string) {
  return doc(db, "trackComments", commentId);
}

export function getSocialReportsCollection(db: Firestore) {
  return collection(db, "socialReports");
}

export function getUserConversationItemRef(
  db: Firestore,
  userUid: string,
  conversationId: string,
) {
  return doc(db, "userConversations", userUid, "items", conversationId);
}

export function buildDirectConversationPayload({
  currentUser,
  otherUser,
}: {
  currentUser: Pick<MicboxxSessionUser, "uuid" | "username" | "displayName">;
  otherUser: Pick<MicboxxSessionUser, "uuid" | "username" | "displayName">;
}) {
  const participants = [
    {
      uid: currentUser.uuid,
      username: currentUser.username ?? "",
      displayName: currentUser.displayName ?? currentUser.username ?? "",
      href: currentUser.username ? `/user/${currentUser.username}` : "",
    },
    {
      uid: otherUser.uuid,
      username: otherUser.username ?? "",
      displayName: otherUser.displayName ?? otherUser.username ?? "",
      href: otherUser.username ? `/user/${otherUser.username}` : "",
    },
  ].sort((left, right) => left.uid.localeCompare(right.uid));

  return {
    type: "direct" as const,
    participantUids: participants.map((participant) => participant.uid),
    participantUsernames: participants.map(
      (participant) => participant.username,
    ),
    participantDisplayNames: participants.map(
      (participant) => participant.displayName,
    ),
    participantHrefs: participants.map((participant) => participant.href),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildTrackLikePayload(
  trackUuid: string,
  userUuid: string,
  trackOwnerUid: string,
) {
  return {
    trackId: trackUuid,
    ownerUid: userUuid,
    trackOwnerUid,
    createdAt: serverTimestamp(),
  };
}

export function buildTrackSocialPayload(
  trackUuid: string,
  userUuid: string,
  trackOwnerUid: string,
  extras?: {
    actorUsername?: string | null;
    actorDisplayName?: string | null;
    trackTitle?: string | null;
    trackHref?: string | null;
  },
) {
  return {
    ...buildTrackLikePayload(trackUuid, userUuid, trackOwnerUid),
    ...(extras?.actorUsername ? { actorUsername: extras.actorUsername } : {}),
    ...(extras?.actorDisplayName
      ? { actorDisplayName: extras.actorDisplayName }
      : {}),
    ...(extras?.trackTitle ? { trackTitle: extras.trackTitle } : {}),
    ...(extras?.trackHref ? { trackHref: extras.trackHref } : {}),
  };
}

export function buildTrackCommentPayload({
  trackUuid,
  trackOwnerUid,
  authorUid,
  authorUsername,
  authorDisplayName,
  body,
  trackTitle,
  trackHref,
}: {
  trackUuid: string;
  trackOwnerUid: string;
  authorUid: string;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  body: string;
  trackTitle?: string | null;
  trackHref?: string | null;
}) {
  return {
    authorUid,
    trackId: trackUuid,
    subjectType: "music.track",
    subjectKey: getTrackSubjectKey(trackUuid),
    trackOwnerUid,
    body: body.trim(),
    status: "active" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(authorUsername ? { authorUsername } : {}),
    ...(authorDisplayName ? { authorDisplayName } : {}),
    ...(trackTitle ? { trackTitle } : {}),
    ...(trackHref ? { trackHref } : {}),
  };
}

export function buildFollowPayload(
  followerUid: string,
  followeeUid: string,
  extras?: {
    actorUsername?: string | null;
    actorDisplayName?: string | null;
    actorHref?: string | null;
  },
) {
  return {
    followerUid,
    followeeUid,
    createdAt: serverTimestamp(),
    ...(extras?.actorUsername ? { actorUsername: extras.actorUsername } : {}),
    ...(extras?.actorDisplayName
      ? { actorDisplayName: extras.actorDisplayName }
      : {}),
    ...(extras?.actorHref ? { actorHref: extras.actorHref } : {}),
  };
}

export function buildSocialReportPayload({
  reporterUid,
  reporterUsername,
  reporterDisplayName,
  targetType,
  targetId,
  reportedUserUid,
  reasonKey,
  detail,
  targetPreview,
  subjectKey,
  conversationId,
}: {
  reporterUid: string;
  reporterUsername?: string | null;
  reporterDisplayName?: string | null;
  targetType: SocialReportTargetType;
  targetId: string;
  reportedUserUid?: string | null;
  reasonKey: SocialReportReasonKey;
  detail?: string | null;
  targetPreview?: string | null;
  subjectKey?: string | null;
  conversationId?: string | null;
}) {
  return {
    reporterUid,
    targetType,
    targetId,
    reasonKey,
    status: "open" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(reporterUsername ? { reporterUsername } : {}),
    ...(reporterDisplayName ? { reporterDisplayName } : {}),
    ...(reportedUserUid ? { reportedUserUid } : {}),
    ...(detail ? { detail: detail.trim() } : {}),
    ...(targetPreview
      ? { targetPreview: targetPreview.trim().slice(0, 240) }
      : {}),
    ...(subjectKey ? { subjectKey } : {}),
    ...(conversationId ? { conversationId } : {}),
  };
}

export function buildDirectMessagePayload({
  senderUid,
  senderUsername,
  senderDisplayName,
  body,
}: {
  senderUid: string;
  senderUsername?: string | null;
  senderDisplayName?: string | null;
  body: string;
}) {
  return {
    senderUid,
    senderUsername: senderUsername ?? "",
    senderDisplayName: senderDisplayName ?? senderUsername ?? "",
    body: body.trim(),
    status: "active" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function readDirectConversation(
  id: string,
  value: unknown,
): DirectConversation {
  const record = asRecord(value);
  return {
    id,
    type: "direct",
    participantUids: readStringArray(record.participantUids),
    participantUsernames: readStringArray(record.participantUsernames),
    participantDisplayNames: readStringArray(record.participantDisplayNames),
    participantHrefs: readStringArray(record.participantHrefs),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    lastMessageAt: toIsoString(record.lastMessageAt),
    lastMessageSenderUid: readString(record.lastMessageSenderUid),
    lastMessagePreview: readString(record.lastMessagePreview),
  };
}

export function readTrackSocialMeta(value: unknown): TrackSocialMeta {
  const record = asRecord(value);
  return {
    likeCount: readNumber(record.likeCount, 0),
    favoriteCount: readNumber(record.favoriteCount, 0),
    commentCount: readNumber(record.commentCount, 0),
  };
}

export function readUserSocialMeta(value: unknown): UserSocialMeta {
  const record = asRecord(value);
  return {
    followerCount: readNumber(record.followerCount, 0),
    followingCount: readNumber(record.followingCount, 0),
  };
}

export function readDirectMessage(
  id: string,
  conversationId: string,
  value: unknown,
): DirectMessage {
  const record = asRecord(value);
  return {
    id,
    conversationId,
    senderUid: readString(record.senderUid) ?? "",
    senderUsername: readString(record.senderUsername),
    senderDisplayName: readString(record.senderDisplayName),
    body: readString(record.body) ?? "",
    status: (readString(record.status) as DirectMessage["status"]) ?? "active",
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

export function readUserConversationInboxItem(
  id: string,
  value: unknown,
): UserConversationInboxItem {
  const record = asRecord(value);
  return {
    id,
    conversationId: readString(record.conversationId) ?? id,
    userUid: readString(record.userUid) ?? "",
    conversationType: "direct",
    otherParticipantUid: readString(record.otherParticipantUid),
    otherParticipantUsername: readString(record.otherParticipantUsername),
    otherParticipantDisplayName: readString(record.otherParticipantDisplayName),
    otherParticipantHref: readString(record.otherParticipantHref),
    unreadCount: readNumber(record.unreadCount, 0),
    lastReadAt: toIsoString(record.lastReadAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    lastMessageAt: toIsoString(record.lastMessageAt),
    lastMessageSenderUid: readString(record.lastMessageSenderUid),
    lastMessagePreview: readString(record.lastMessagePreview),
  };
}

export function readSocialNotification(
  id: string,
  value: unknown,
): SocialNotification {
  const record = asRecord(value);
  const rawType = readString(record.type);
  const type: SocialNotification["type"] =
    rawType === "direct_message" ||
    rawType === "follow" ||
    rawType === "track_comment"
      ? rawType
      : "track_like";

  return {
    id,
    userUid: readString(record.userUid) ?? "",
    type,
    actorUid: readString(record.actorUid),
    actorUsername: readString(record.actorUsername),
    actorDisplayName: readString(record.actorDisplayName),
    trackId: readString(record.trackId),
    trackTitle: readString(record.trackTitle),
    commentId: readString(record.commentId),
    commentPreview: readString(record.commentPreview),
    conversationId: readString(record.conversationId),
    messageId: readString(record.messageId),
    messagePreview: readString(record.messagePreview),
    href: readString(record.href),
    isRead: record.isRead === true,
    createdAt: toIsoString(record.createdAt),
    readAt: toIsoString(record.readAt),
    seenAt: toIsoString(record.seenAt),
  };
}

export function readTrackComment(id: string, value: unknown): TrackComment {
  const record = asRecord(value);
  const rawStatus = readString(record.status);
  const status: TrackComment["status"] =
    rawStatus === "deleted" || rawStatus === "hidden"
      ? rawStatus
      : "active";

  return {
    id,
    authorUid: readString(record.authorUid) ?? "",
    authorUsername: readString(record.authorUsername),
    authorDisplayName: readString(record.authorDisplayName),
    trackId: readString(record.trackId) ?? "",
    subjectType: readString(record.subjectType) ?? "",
    subjectKey: readString(record.subjectKey) ?? "",
    trackOwnerUid: readString(record.trackOwnerUid),
    body: readString(record.body) ?? "",
    status,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    editedAt: toIsoString(record.editedAt),
    deletedAt: toIsoString(record.deletedAt),
  };
}
