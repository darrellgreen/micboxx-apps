import {
    collection,
    doc,
    limit,
    limitToLast,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    where,
    type FirestoreError,
    type Unsubscribe,
} from "firebase/firestore";

import { env } from "@/config/env";
import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type {
    MobileRoomStateSnapshot,
    RoomActivePollState,
    RoomArtistPresenceState,
    RoomChatMessage,
    RoomChatModerationState,
    RoomChatSenderRole,
    RoomChatVisibility,
    RoomModerationProjection,
    RoomMomentState,
    RoomPinnedMessageState,
    RoomPinnedNoteState,
    RoomPollOption,
    RoomPollProjection,
    RoomPresenceSummaryEntry,
    RoomQnaQuestion,
    RoomQnaState,
    RoomReactionEntry,
    RoomReactionType,
    RoomSupportStats,
} from "@micboxx/contracts";

const emptySnapshot: MobileRoomStateSnapshot = {
  presence: [],
  chat: [],
  reactions: [],
  qna: null,
  questions: [],
  activePoll: null,
  polls: [],
  supportStats: null,
  artistPresence: null,
  activeMoment: null,
  pinnedNote: null,
  pinnedMessage: null,
  moderation: null,
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: unknown }).toMillis;
    if (typeof fn === "function") {
      return fn.call(value) || 0;
    }
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return 0;
}

function isSenderRole(value: unknown): value is RoomChatSenderRole {
  return value === "fan" || value === "artist" || value === "moderator" || value === "admin";
}

function isChatVisibility(value: unknown): value is RoomChatVisibility {
  return value === "public" || value === "hidden" || value === "deleted";
}

function isModerationState(value: unknown): value is RoomChatModerationState {
  return value === "visible" || value === "hidden";
}

function isReactionType(value: unknown): value is RoomReactionType {
  return value === "fire"
    || value === "felt_this"
    || value === "replay"
    || value === "favorite"
    || value === "this_part";
}

function normalizeQuestionStatus(value: unknown): RoomQnaQuestion["status"] {
  if (value === "archive") return "archived";
  if (
    value === "new" ||
    value === "active" ||
    value === "answered" ||
    value === "archived" ||
    value === "flagged"
  ) {
    return value;
  }
  return "new";
}

function readPollOptions(value: unknown): RoomPollOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return {
        id: readString(record.id) ?? "",
        text: readString(record.text) ?? "",
        voteCount: readNumber(record.voteCount) ?? 0,
      };
    })
    .filter((entry) => entry.id.length > 0);
}

function isRoomMomentState(value: unknown): value is RoomMomentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<RoomMomentState>;
  return typeof data.momentId === "string" &&
    typeof data.roomId === "string" &&
    data.status === "active" &&
    typeof data.type === "string" &&
    typeof data.presentation === "string" &&
    typeof data.actorUid === "string" &&
    typeof data.source === "object" &&
    data.source !== null &&
    typeof data.startedAt === "number";
}

function normalizeRoomMomentPolicy(moment: RoomMomentState): RoomMomentState {
  const policy = moment.metadata && typeof moment.metadata === "object"
    ? ((moment.metadata as Record<string, unknown>).policy as Record<string, unknown> | undefined)
    : undefined;

  const fallbackPriority = typeof policy?.priority === "number" ? policy.priority : 1;
  const fallbackAudioBehavior = typeof policy?.audioBehavior === "string" ? policy.audioBehavior : "continue";
  const fallbackDuckVolume = typeof policy?.duckVolume === "number" ? policy.duckVolume : 0.15;
  const fallbackFadeDurationMs = typeof policy?.fadeDurationMs === "number" ? policy.fadeDurationMs : 300;

  const priorityRaw = typeof moment.priority === "number" ? moment.priority : fallbackPriority;
  const priority = Math.max(0, Math.min(Math.trunc(priorityRaw), 3));

  const audioBehaviorRaw = moment.audioBehavior ?? fallbackAudioBehavior;
  const audioBehavior = audioBehaviorRaw === "duck" || audioBehaviorRaw === "pause" || audioBehaviorRaw === "continue"
    ? audioBehaviorRaw
    : "continue";

  const duckVolumeRaw = typeof moment.duckVolume === "number" ? moment.duckVolume : fallbackDuckVolume;
  const duckVolume = Number.isFinite(duckVolumeRaw)
    ? Math.max(0, Math.min(duckVolumeRaw, 1))
    : 0.15;

  const fadeDurationRaw = typeof moment.fadeDurationMs === "number" ? moment.fadeDurationMs : fallbackFadeDurationMs;
  const fadeDurationMs = Number.isFinite(fadeDurationRaw)
    ? Math.max(0, Math.min(Math.trunc(fadeDurationRaw), 5000))
    : 300;

  if (!env.momentHardeningEnabled) {
    return {
      ...moment,
      priority: 1,
      audioBehavior: "continue",
      duckVolume: null,
      fadeDurationMs: null,
    };
  }

  return {
    ...moment,
    priority,
    audioBehavior,
    duckVolume,
    fadeDurationMs,
  };
}

export function isRoomMuteActive(record: RoomModerationProjection | null): boolean {
  if (!record?.isMuted) return false;
  return record.mutedUntil == null || record.mutedUntil > Math.floor(Date.now() / 1000);
}

export function subscribeToRoomPresence(
  roomId: number | string,
  onUpdate: (entries: RoomPresenceSummaryEntry[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  return onSnapshot(
    doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "presence_summary"),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate([]);
        return;
      }

      const data = snapshot.data();
      const activeCount = readNumber(data.activeCount) ?? 0;
      const topAvatarsRaw = Array.isArray(data.topAvatars) ? data.topAvatars : [];
      const visibleEntries: RoomPresenceSummaryEntry[] = [];

      for (let index = 0; index < topAvatarsRaw.length; index += 1) {
        const rawEntry = topAvatarsRaw[index];
        if (!rawEntry || typeof rawEntry !== "object") {
          continue;
        }

        const record = rawEntry as Record<string, unknown>;
        const uid = readString(record.uid) ?? `summary-visible-${index}`;
        visibleEntries.push({
          sessionKey: `summary-visible:${uid}:${index}`,
          uid,
          actorUid: null,
          actorType: "user",
          displayName: readString(record.displayName),
          avatarUrl: readString(record.avatarUrl),
          visibility: "visible",
        });
      }

      const anonymousEntryCount = Math.max(activeCount - visibleEntries.length, 0);
      const anonymousEntries: RoomPresenceSummaryEntry[] = Array.from({ length: anonymousEntryCount }, (_, index) => ({
        sessionKey: `summary-anon:${index}`,
        uid: `summary-anon-${index}`,
        actorUid: null,
        actorType: "anonymous",
        displayName: null,
        avatarUrl: null,
        visibility: "anonymous",
      }));

      onUpdate([...visibleEntries, ...anonymousEntries]);
    },
    (error) => {
      onError?.(error);
      onUpdate([]);
    },
  );
}

export function subscribeToRoomChat(
  roomId: number | string,
  onUpdate: (messages: RoomChatMessage[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const chatQuery = query(
    collection(getFirebaseClientDb(), "rooms", String(roomId), "chat"),
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(100),
  );

  return onSnapshot(
    chatQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docSnap): RoomChatMessage | null => {
          const data = docSnap.data();
          if (
            !readString(data.messageId) ||
            !readString(data.roomId) ||
            !readString(data.senderUid) ||
            !readString(data.messageText) ||
            !isSenderRole(data.senderRole) ||
            !isChatVisibility(data.visibility) ||
            !isModerationState(data.moderationState)
          ) {
            return null;
          }

          return {
            id: docSnap.id,
            schemaVersion: readNumber(data.schemaVersion) ?? 0,
            messageId: readString(data.messageId) ?? docSnap.id,
            roomId: readString(data.roomId) ?? String(roomId),
            senderUserId: readNumber(data.senderUserId),
            senderUid: readString(data.senderUid) ?? "",
            senderUuid: readString(data.senderUuid) ?? readString(data.senderUid) ?? "",
            senderUsername: readString(data.senderUsername),
            senderDisplayName: readString(data.senderDisplayName),
            senderAvatarUrl: readString(data.senderAvatarUrl),
            senderRole: data.senderRole,
            messageText: readString(data.messageText) ?? "",
            createdAt: data.createdAt,
            loopNumber: readNumber(data.loopNumber),
            releasePositionSeconds: readNumber(data.releasePositionSeconds),
            trackRefId: readString(data.trackRefId) ?? readNumber(data.trackRefId),
            trackPositionSeconds: readNumber(data.trackPositionSeconds),
            visibility: data.visibility,
            moderationState: data.moderationState,
          };
        })
        .filter((entry): entry is RoomChatMessage => entry !== null)
        .sort((left, right) => toMillis(left.createdAt) - toMillis(right.createdAt));

      onUpdate(messages);
    },
    (error) => {
      onError?.(error);
      onUpdate([]);
    },
  );
}

export function subscribeToRoomReactions(
  roomId: number | string,
  onUpdate: (reactions: RoomReactionEntry[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const reactionsQuery = query(
    collection(getFirebaseClientDb(), "rooms", String(roomId), "reactions"),
    orderBy("createdAt", "asc"),
    limitToLast(20),
  );

  return onSnapshot(reactionsQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: readString(data.uid) ?? "",
        reactionType: isReactionType(data.reactionType) ? data.reactionType : "fire",
        visibility: data.visibility === "visible" ? "visible" : "anonymous",
        createdAt: data.createdAt,
        releasePositionSeconds: readNumber(data.releasePositionSeconds) ?? undefined,
        trackRefId: readString(data.trackRefId) ?? readNumber(data.trackRefId),
        trackPositionSeconds: readNumber(data.trackPositionSeconds),
        loopNumber: readNumber(data.loopNumber),
        roomId: readString(data.roomId) ?? String(roomId),
      };
    }));
  }, () => onUpdate([]));
}

export function subscribeToRoomQnaState(roomId: number | string, onUpdate: (state: RoomQnaState | null) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "qna"), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    onUpdate({
      enabled: data.enabled === true,
      activeQuestionId: readString(data.activeQuestionId),
      openCount: readNumber(data.openCount) ?? 0,
      answeredCount: readNumber(data.answeredCount) ?? 0,
      updatedAt: data.updatedAt,
    });
  }, () => onUpdate(null));
}

export function subscribeToRoomQuestions(roomId: number | string, onUpdate: (questions: RoomQnaQuestion[]) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const questionsQuery = query(
    collection(getFirebaseClientDb(), "rooms", String(roomId), "questions"),
    orderBy("activeAt", "desc"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(questionsQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        authorDisplayName: readString(data.authorDisplayName) ?? "Listener",
        text: readString(data.text) ?? "",
        answerText: readString(data.answerText),
        votes: readNumber(data.votes) ?? 0,
        status: normalizeQuestionStatus(data.status),
        visibility: data.visibility === "public" ? "public" : "private",
        createdAt: readNumber(data.createdAt) ?? 0,
        answeredAt: readNumber(data.answeredAt),
        activeAt: readNumber(data.activeAt),
      };
    }));
  }, () => onUpdate([]));
}

export function subscribeToRoomActivePoll(roomId: number | string, onUpdate: (state: RoomActivePollState | null) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "poll"), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    onUpdate({
      activePollId: readString(data.activePollId),
      status: data.status === "active" ? "active" : "closed",
      question: readString(data.question),
      options: readPollOptions(data.options),
      totalVotes: readNumber(data.totalVotes) ?? 0,
      revealResultsAfterVote: data.revealResultsAfterVote !== false,
      viewerVoteOptionId: readString(data.viewerVoteOptionId),
      updatedAt: data.updatedAt,
    });
  }, () => onUpdate(null));
}

export function subscribeToRoomPolls(roomId: number | string, onUpdate: (polls: RoomPollProjection[]) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const pollsQuery = query(
    collection(getFirebaseClientDb(), "rooms", String(roomId), "polls"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(pollsQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        question: readString(data.question) ?? "",
        status: data.status === "closed" ? "closed" : "active",
        options: readPollOptions(data.options),
        totalVotes: readNumber(data.totalVotes) ?? 0,
        revealResultsAfterVote: data.revealResultsAfterVote !== false,
        viewerVoteOptionId: readString(data.viewerVoteOptionId),
        createdAt: readNumber(data.createdAt) ?? 0,
        closedAt: readNumber(data.closedAt),
        updatedAt: data.updatedAt,
      };
    }));
  }, () => onUpdate([]));
}

export function subscribeToRoomSupportStats(roomId: number | string, onUpdate: (stats: RoomSupportStats | null) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "support_stats"), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    onUpdate({
      totalAmountCents: readNumber(data.totalAmountCents) ?? 0,
      backerCount: readNumber(data.backerCount) ?? 0,
      goalCents: readNumber(data.goalCents),
      updatedAt: data.updatedAt,
    });
  }, () => onUpdate(null));
}

export function subscribeToArtistPresence(roomId: number | string, onUpdate: (presence: RoomArtistPresenceState | null) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "artist_presence"), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    onUpdate({
      roomId: readString(data.roomId) ?? String(roomId),
      actorUid: readNumber(data.actorUid),
      sessionId: readString(data.sessionId),
      isActive: data.isActive === true,
      enteredAt: readNumber(data.enteredAt),
      lastSeenAt: readNumber(data.lastSeenAt),
      expiresAt: readNumber(data.expiresAt),
      leftAt: readNumber(data.leftAt),
    });
  }, () => onUpdate(null));
}

export function subscribeToRoomActiveMoment(
  roomId: number | string,
  onUpdate: (moment: RoomMomentState | null) => void,
  onConnectionStateChange?: (isDisconnected: boolean) => void,
) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  let expiryTimer: ReturnType<typeof setTimeout> | null = null;

  const clearExpiryTimer = () => {
    if (expiryTimer !== null) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
  };

  const unsubscribe = onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "active_moment"), (snapshot) => {
    clearExpiryTimer();
    onConnectionStateChange?.(false);

    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }

    const data = snapshot.data();
    if (!isRoomMomentState(data)) {
      onUpdate(null);
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (data.expiresAt !== null && data.expiresAt <= nowSeconds) {
      onUpdate(null);
      return;
    }

    onUpdate(normalizeRoomMomentPolicy(data));

    if (typeof data.expiresAt === "number") {
      const delayMs = Math.max(0, (data.expiresAt * 1000) - Date.now());
      expiryTimer = setTimeout(() => {
        onUpdate(null);
        expiryTimer = null;
      }, delayMs);
    }
  }, () => {
    onConnectionStateChange?.(true);
  });

  return () => {
    clearExpiryTimer();
    unsubscribe();
  };
}

export function subscribeToRoomPinnedNote(roomId: number | string, onUpdate: (note: RoomPinnedNoteState | null) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "pinned_note"), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    onUpdate({
      isPinned: data.isPinned !== false,
      messageText: readString(data.messageText),
      pinnedAt: readNumber(data.pinnedAt),
      pinnedByUid: readNumber(data.pinnedByUid),
    });
  }, () => onUpdate(null));
}

export function subscribeToRoomPinnedMessage(roomId: number | string, onUpdate: (message: RoomPinnedMessageState | null) => void) {
  if (!isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "state", "pinned_message"), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    onUpdate({
      isPinned: data.isPinned !== false,
      chatMessageId: readString(data.chatMessageId),
      messageText: readString(data.messageText),
      pinnedAt: readNumber(data.pinnedAt),
      pinnedBy: null,
      author: null,
    });
  }, () => onUpdate(null));
}

export function subscribeToRoomModeration(
  roomId: number | string,
  targetUid: string | null,
  onUpdate: (record: RoomModerationProjection | null) => void,
) {
  if (!targetUid || !isFirebaseConfigured()) {
    onUpdate(null);
    return () => {};
  }

  return onSnapshot(doc(getFirebaseClientDb(), "rooms", String(roomId), "moderated_users", targetUid), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    const data = snapshot.data();
    if (data.source !== "drupal") {
      onUpdate(null);
      return;
    }
    onUpdate({
      roomId: String(data.roomId ?? roomId),
      targetUid: String(data.targetUid ?? targetUid),
      isMuted: data.isMuted === true,
      isBlocked: data.isBlocked === true,
      mutedUntil: readNumber(data.mutedUntil),
      moderationId: String(data.moderationId ?? ""),
      source: "drupal",
      reason: readString(data.reason),
      actorUid: String(data.actorUid ?? ""),
      updatedAt: readNumber(data.updatedAt) ?? 0,
      version: readNumber(data.version) ?? 1,
    });
  }, () => onUpdate(null));
}

export function subscribeToMobileRoomState(input: {
  roomId: number | string;
  targetUid: string | null;
  onPatch: (patch: Partial<MobileRoomStateSnapshot>) => void;
  onMomentConnectionStateChange?: (isDisconnected: boolean) => void;
}): Unsubscribe {
  const unsubs: Unsubscribe[] = [
    subscribeToRoomPresence(input.roomId, (presence) => input.onPatch({ presence })),
    subscribeToRoomChat(input.roomId, (chat) => input.onPatch({ chat })),
    subscribeToRoomReactions(input.roomId, (reactions) => input.onPatch({ reactions })),
    subscribeToRoomQnaState(input.roomId, (qna) => input.onPatch({ qna })),
    subscribeToRoomQuestions(input.roomId, (questions) => input.onPatch({ questions })),
    subscribeToRoomActivePoll(input.roomId, (activePoll) => input.onPatch({ activePoll })),
    subscribeToRoomPolls(input.roomId, (polls) => input.onPatch({ polls })),
    subscribeToRoomSupportStats(input.roomId, (supportStats) => input.onPatch({ supportStats })),
    subscribeToArtistPresence(input.roomId, (artistPresence) => input.onPatch({ artistPresence })),
    subscribeToRoomActiveMoment(
      input.roomId,
      (activeMoment) => input.onPatch({ activeMoment }),
      input.onMomentConnectionStateChange,
    ),
    subscribeToRoomPinnedNote(input.roomId, (pinnedNote) => input.onPatch({ pinnedNote })),
    subscribeToRoomPinnedMessage(input.roomId, (pinnedMessage) => input.onPatch({ pinnedMessage })),
    subscribeToRoomModeration(input.roomId, input.targetUid, (moderation) => input.onPatch({ moderation })),
  ];

  input.onPatch(emptySnapshot);

  return () => {
    unsubs.forEach((unsubscribe) => unsubscribe());
  };
}
