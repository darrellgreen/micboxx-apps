import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { env } from "@/config/env";
import type { PublicTrackSummary } from "@micboxx/contracts";
import type {
    MobileRoomStateSnapshot,
    RoomActivityResponse,
    RoomCapabilities,
    RoomChatMessage,
    RoomClockState,
    RoomEntryResponse,
    RoomPollPayload,
    RoomPollProjection,
    RoomQnaQuestion,
    RoomReactionType,
    RoomRelease,
    RoomState,
    RoomSupportBalance,
    RoomTimeMachineResponse,
} from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { usePlayerControls } from "@/features/player/hooks/usePlayerControls";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { mapTrackListToPlayerItems } from "@/features/player/mapper/playerItemMapper";
import {
    enterRoom,
    getRoomActivity,
    getRoomClock,
    getRoomPolls,
    getRoomQuestions,
    getRoomSupportStatus,
    getRoomTimeMachine,
    sendRoomChatMessage,
    sendRoomPresenceHeartbeat,
    sendRoomReaction,
    sendRoomSupport,
    submitRoomQuestion,
    voteRoomPoll,
    voteRoomQuestion,
    ApiError,
} from "@micboxx/api";
import {
    isRoomMuteActive,
    subscribeToMobileRoomState,
} from "@/features/rooms/firebase/roomListeners";
import { useAppSelector } from "@/store/hooks";

const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;
const PRESENCE_HEARTBEAT_BACKOFF_STEPS_MS = [5_000, 10_000, 20_000, 40_000] as const;
const CLOCK_RESYNC_INTERVAL_MS = 30_000;

let mobileRoomSessionId: string | null = null;

function isLikelyNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed")
    || message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("load failed")
  );
}

function isRetriablePresenceHeartbeatError(error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 502 || error.status === 503 || error.status === 504)) {
    return true;
  }

  return isLikelyNetworkError(error);
}

function getPresenceHeartbeatBackoffDelay(failureCount: number): number {
  const index = Math.max(0, Math.min(failureCount - 1, PRESENCE_HEARTBEAT_BACKOFF_STEPS_MS.length - 1));
  return PRESENCE_HEARTBEAT_BACKOFF_STEPS_MS[index];
}

function normalizeRoomErrorMessage(error: unknown, fallback: string): string {
  if (isLikelyNetworkError(error)) {
    return "Connection issue. Trying to reconnect...";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function createSessionId() {
  if (mobileRoomSessionId) {
    return mobileRoomSessionId;
  }

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    mobileRoomSessionId = crypto.randomUUID();
    return mobileRoomSessionId;
  }

  mobileRoomSessionId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return mobileRoomSessionId;
}

function emptyRoomSnapshot(): MobileRoomStateSnapshot {
  return {
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
}

function toQuestion(question: {
  id: string;
  author_display_name: string;
  text: string;
  answer_text?: string | null;
  votes: number;
  status: RoomQnaQuestion["status"];
  visibility?: string;
  created_at: number;
  answered_at: number | null;
  active_at: number | null;
}): RoomQnaQuestion {
  return {
    id: question.id,
    authorDisplayName: question.author_display_name,
    text: question.text,
    answerText: typeof question.answer_text === "string" ? question.answer_text : null,
    votes: question.votes,
    status: question.status,
    visibility: question.visibility === "public" ? "public" : "private",
    createdAt: question.created_at,
    answeredAt: question.answered_at,
    activeAt: question.active_at,
  };
}

function isPublicQuestionVisible(question: RoomQnaQuestion) {
  return question.visibility === "public" && (question.status === "new" || question.status === "answered");
}

function toClosedPollProjection(poll: RoomPollPayload): RoomPollProjection {
  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    options: poll.options.map((option) => ({
      id: option.id,
      text: option.text,
      voteCount: option.vote_count,
    })),
    totalVotes: poll.total_votes,
    revealResultsAfterVote: poll.reveal_results_after_vote !== false,
    viewerVoteOptionId: poll.viewer_vote_option_id,
    createdAt: poll.created_at,
    closedAt: poll.closed_at,
  };
}

function applyModerationCaps(
  capabilities: RoomCapabilities | null,
  snapshot: MobileRoomStateSnapshot,
): RoomCapabilities | null {
  if (!capabilities) return null;
  if (snapshot.moderation?.isBlocked) {
    return {
      ...capabilities,
      can_enter_room: false,
      can_comment: false,
      can_react: false,
      can_send_support: false,
      can_show_presence: false,
    };
  }

  if (isRoomMuteActive(snapshot.moderation)) {
    return {
      ...capabilities,
      can_comment: false,
      can_react: false,
    };
  }

  return capabilities;
}

export function useMobileRoom(input: {
  releaseIdentifier: string | null;
  releaseTracks: PublicTrackSummary[];
}) {
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? null;
  const userUuid = session?.user.uuid ?? null;
  const { replaceQueue } = usePlayerQueue();
  const { play, pause, seekTo, skipToIndex } = usePlayerControls();
  const playbackState = useAppSelector((rootState) => rootState.player.nowPlaying.playbackState);
  const [roomEntry, setRoomEntry] = useState<RoomEntryResponse | null>(null);
  const [clockState, setClockState] = useState<RoomClockState | null>(null);
  const [snapshot, setSnapshot] = useState<MobileRoomStateSnapshot>(() => emptyRoomSnapshot());
  const [activity, setActivity] = useState<RoomActivityResponse | null>(null);
  const [timeMachine, setTimeMachine] = useState<RoomTimeMachineResponse | null>(null);
  const [supportBalance, setSupportBalance] = useState<RoomSupportBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [isMomentReconnecting, setIsMomentReconnecting] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef(createSessionId());
  const enteredRoomKeyRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const presenceHeartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedClockRef = useRef<string | null>(null);
  const shouldResumeAfterMomentPauseRef = useRef(false);

  const capabilities = useMemo(
    () => applyModerationCaps(roomEntry?.capabilities ?? null, snapshot),
    [roomEntry?.capabilities, snapshot],
  );
  const canPlayFullRelease = capabilities?.can_play_full_release !== false;

  const room: RoomState | null = roomEntry?.room ?? null;
  const release: RoomRelease | null = roomEntry?.release ?? null;
  const isCurrentUserMuted = isRoomMuteActive(snapshot.moderation);
  const isCurrentUserBlocked = snapshot.moderation?.isBlocked === true;

  const syncPlaybackToClock = useCallback(async (
    clock: RoomClockState | null,
    entryOverride?: RoomEntryResponse,
  ) => {
    const syncEntry = entryOverride ?? roomEntry;
    if (!clock || input.releaseTracks.length === 0 || !syncEntry?.release) {
      return;
    }

    const trackEntry = clock.track_map.find((entry) => entry.index === clock.track_index)
      ?? clock.track_map[clock.track_index]
      ?? null;
    const trackId = trackEntry?.track_id ? String(trackEntry.track_id) : null;
    const playerItems = mapTrackListToPlayerItems(input.releaseTracks);
    const startIndex = trackId
      ? playerItems.findIndex((item) => item.id === trackId)
      : Math.max(0, Math.min(clock.track_index, playerItems.length - 1));

    if (startIndex < 0) {
      return;
    }

    const syncKey = `${clock.server_time}:${clock.track_index}:${Math.floor(clock.track_position_seconds)}`;
    if (lastSyncedClockRef.current === syncKey) {
      return;
    }
    lastSyncedClockRef.current = syncKey;

    const result = await replaceQueue({
      items: playerItems,
      startIndex,
      context: {
        type: "album",
        slug: syncEntry.release.slug,
        id: `room:${syncEntry.room.id}`,
        title: syncEntry.release.title,
      },
      startPositionSec: Math.max(0, clock.track_position_seconds),
      autoplay: true,
    });

    if (!result.ok) {
      setInteractionError(result.error ?? "Unable to synchronize Room playback.");
      return;
    }
  }, [input.releaseTracks, replaceQueue, roomEntry]);

  const refreshClock = useCallback(async (options?: { syncPlayback?: boolean }) => {
    if (!room?.id) return;
    try {
      const nextClock = await getRoomClock(room.id);
      setClockState(nextClock);
      if (options?.syncPlayback === true) {
        await syncPlaybackToClock(nextClock);
      }
    } catch (clockError) {
      setInteractionError(normalizeRoomErrorMessage(clockError, "Unable to refresh Room clock."));
    }
  }, [room?.id, syncPlaybackToClock]);

  const refreshQuestions = useCallback(async () => {
    if (!room?.id || capabilities?.can_view_qna === false) return;
    const response = await getRoomQuestions(room.id);
    if (response.qna) {
      setSnapshot((current) => ({
        ...current,
        qna: {
          enabled: response.qna?.enabled === true,
          activeQuestionId: response.qna?.active_question_id ?? null,
          openCount: typeof response.qna?.open_count === "number" ? response.qna.open_count : 0,
          answeredCount: typeof response.qna?.answered_count === "number" ? response.qna.answered_count : 0,
        },
      }));
    }
    if (response.questions) {
      setSnapshot((current) => ({
        ...current,
        questions: response.questions?.map(toQuestion).filter(isPublicQuestionVisible) ?? current.questions,
      }));
    }
  }, [capabilities?.can_view_qna, room?.id]);

  const refreshPolls = useCallback(async () => {
    if (!room?.id || capabilities?.can_view_qna === false) return;
    const response = await getRoomPolls(room.id);
    setSnapshot((current) => ({
      ...current,
      polls: (response.closed_polls ?? []).map(toClosedPollProjection),
    }));
  }, [capabilities?.can_view_qna, room?.id]);

  const refreshRoomExtras = useCallback(async () => {
    if (!room?.id) return;

    await Promise.all([
      getRoomActivity({ roomId: room.id }).then(setActivity).catch(() => undefined),
      capabilities?.can_show_time_machine
        ? getRoomTimeMachine(room.id).then(setTimeMachine).catch(() => undefined)
        : Promise.resolve(),
      capabilities?.can_show_support
        ? getRoomSupportStatus({ roomId: room.id, accessToken }).then((status) => {
            setSupportBalance(status.support_balance);
            setSnapshot((current) => ({
              ...current,
              supportStats: {
                totalAmountCents: status.support_status.total_support_amount_cents,
                backerCount: status.support_status.backer_count,
                goalCents: status.support_status.support_goal_cents,
              },
            }));
          }).catch(() => undefined)
        : Promise.resolve(),
      refreshQuestions().catch(() => undefined),
      refreshPolls().catch(() => undefined),
    ]);
  }, [accessToken, capabilities?.can_show_support, capabilities?.can_show_time_machine, refreshPolls, refreshQuestions, room?.id]);

  const enter = useCallback(async () => {
    if (!input.releaseIdentifier) {
      return;
    }

    const authScope = userUuid ? `user:${userUuid}` : "anonymous";
    const roomKey = `${input.releaseIdentifier}:${authScope}`;

    if (enteredRoomKeyRef.current === roomKey) {
      return;
    }

    enteredRoomKeyRef.current = roomKey;
    setIsLoading(true);
    setError(null);
    setInteractionError(null);

    try {
      const entry = await enterRoom({
        releaseIdentifier: input.releaseIdentifier,
        sessionId: sessionIdRef.current,
        accessToken,
      });
      setRoomEntry(entry);
      setClockState(entry.clock);
      if (entry.capabilities.can_enter_room === false) {
        setError("This Room is not currently available.");
      }
      await syncPlaybackToClock(entry.clock, entry);
    } catch (entryError) {
      enteredRoomKeyRef.current = null;
      setError(normalizeRoomErrorMessage(entryError, "Unable to enter Room."));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, input.releaseIdentifier, syncPlaybackToClock, userUuid]);

  useEffect(() => {
    void enter();
  }, [enter]);

  useEffect(() => {
    if (!room?.id) return;
    return subscribeToMobileRoomState({
      roomId: room.id,
      targetUid: userUuid,
      onPatch: (patch) => setSnapshot((current) => ({ ...current, ...patch })),
      onMomentConnectionStateChange: (isDisconnected) => setIsMomentReconnecting(isDisconnected),
    });
  }, [room?.id, userUuid]);

  useEffect(() => {
    if (!snapshot.activeMoment) {
      if (shouldResumeAfterMomentPauseRef.current) {
        void play();
        shouldResumeAfterMomentPauseRef.current = false;
      }
      setIsMomentReconnecting(false);
      return;
    }

    if (!env.momentHardeningEnabled) {
      return;
    }

    if (snapshot.activeMoment.audioBehavior === "pause") {
      if (playbackState === "playing") {
        shouldResumeAfterMomentPauseRef.current = true;
        void pause();
      }
      return;
    }

    if (shouldResumeAfterMomentPauseRef.current) {
      void play();
      shouldResumeAfterMomentPauseRef.current = false;
    }
  }, [pause, play, playbackState, snapshot.activeMoment]);

  useEffect(() => {
    if (!room?.id || capabilities?.can_show_presence !== true || isCurrentUserBlocked) {
      return;
    }

    let cancelled = false;
    let consecutiveRetryableFailures = 0;

    const clearPresenceHeartbeatTimer = () => {
      if (presenceHeartbeatTimerRef.current) {
        clearTimeout(presenceHeartbeatTimerRef.current);
        presenceHeartbeatTimerRef.current = null;
      }
    };

    const scheduleHeartbeat = (delayMs: number) => {
      clearPresenceHeartbeatTimer();
      if (cancelled || AppState.currentState !== "active") {
        return;
      }

      presenceHeartbeatTimerRef.current = setTimeout(() => {
        void heartbeat();
      }, delayMs);
    };

    const heartbeat = async () => {
      if (cancelled || AppState.currentState !== "active") return;
      let heartbeatFailure: unknown = null;
      try {
        await sendRoomPresenceHeartbeat({
          roomId: room.id,
          visibility: "visible",
          sessionId: sessionIdRef.current,
          accessToken,
        });
        consecutiveRetryableFailures = 0;
      } catch (heartbeatError) {
        heartbeatFailure = heartbeatError;
        if (!isRetriablePresenceHeartbeatError(heartbeatError)) {
          setInteractionError(normalizeRoomErrorMessage(heartbeatError, "Unable to update Room presence."));
        }
      } finally {
        if (cancelled || AppState.currentState !== "active") {
          return;
        }

        if (isRetriablePresenceHeartbeatError(heartbeatFailure)) {
          consecutiveRetryableFailures += 1;
          scheduleHeartbeat(getPresenceHeartbeatBackoffDelay(consecutiveRetryableFailures));
          return;
        }

        scheduleHeartbeat(PRESENCE_HEARTBEAT_INTERVAL_MS);
      }
    };

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      clearPresenceHeartbeatTimer();
      if (!cancelled && nextState === "active") {
        consecutiveRetryableFailures = 0;
        void heartbeat();
      }
    });

    void heartbeat();

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      clearPresenceHeartbeatTimer();
    };
  }, [accessToken, capabilities?.can_show_presence, isCurrentUserBlocked, room?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returningActive = /inactive|background/.test(appStateRef.current) && nextState === "active";
      appStateRef.current = nextState;
      if (returningActive) {
        void refreshClock({ syncPlayback: true });
      }
    });

    return () => subscription.remove();
  }, [refreshClock]);

  useEffect(() => {
    void refreshRoomExtras();
  }, [refreshRoomExtras]);

  useEffect(() => {
    if (!room?.id) {
      return;
    }

    const timer = setInterval(() => {
      if (appStateRef.current === "active") {
        void refreshClock({ syncPlayback: false });
      }
    }, CLOCK_RESYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [refreshClock, room?.id]);

  const sendChat = useCallback(async (messageText: string) => {
    if (!room?.id) throw new Error("Room is not ready.");
    if (!capabilities?.can_comment || isCurrentUserMuted || isCurrentUserBlocked) {
      throw new Error(isCurrentUserMuted ? "You are muted in this Room for now." : "Chat is not available in this Room.");
    }

    const trimmed = messageText.trim();
    if (!trimmed) return;
    setIsSubmittingChat(true);
    setInteractionError(null);
    try {
      await sendRoomChatMessage({
        roomId: room.id,
        messageText: trimmed,
        releasePositionSeconds: clockState?.release_position_seconds ?? null,
        trackRefId: clockState?.track_ref_id ?? null,
        trackPositionSeconds: clockState?.track_position_seconds ?? null,
        loopNumber: clockState?.loop_number ?? null,
        accessToken,
      });
    } catch (chatError) {
      const message = normalizeRoomErrorMessage(chatError, "Unable to send Room message.");
      setInteractionError(message);
      throw new Error(message);
    } finally {
      setIsSubmittingChat(false);
    }
  }, [accessToken, capabilities?.can_comment, clockState, isCurrentUserBlocked, isCurrentUserMuted, room?.id]);

  const react = useCallback(async (reactionType: RoomReactionType) => {
    if (!room?.id) throw new Error("Room is not ready.");
    if (!capabilities?.can_react || isCurrentUserBlocked) {
      throw new Error("Reactions are not available in this Room.");
    }
    try {
      await sendRoomReaction({
        roomId: room.id,
        reactionId: createSessionId(),
        reactionType,
        actorVisibility: "anonymous",
        accessToken,
      });
    } catch (reactionError) {
      const message = normalizeRoomErrorMessage(reactionError, "Unable to send Room reaction.");
      setInteractionError(message);
      throw new Error(message);
    }
  }, [accessToken, capabilities?.can_react, isCurrentUserBlocked, room?.id]);

  const submitQuestion = useCallback(async (text: string) => {
    if (!room?.id) throw new Error("Room is not ready.");
    if (
      isCurrentUserBlocked ||
      capabilities?.can_submit_qna_question === false ||
      capabilities?.can_view_qna === false
    ) {
      throw new Error("Questions are not available in this Room.");
    }
    setIsSubmittingQuestion(true);
    try {
      const response = await submitRoomQuestion({ roomId: room.id, text: text.trim(), accessToken });
      if (response.question) {
        setSnapshot((current) => ({
          ...current,
          questions: [toQuestion(response.question!), ...current.questions].filter(isPublicQuestionVisible),
        }));
      }
    } catch (questionError) {
      const message = normalizeRoomErrorMessage(questionError, "Unable to submit Room question.");
      setInteractionError(message);
      throw new Error(message);
    } finally {
      setIsSubmittingQuestion(false);
    }
  }, [accessToken, capabilities?.can_submit_qna_question, capabilities?.can_view_qna, isCurrentUserBlocked, room?.id]);

  const voteQuestion = useCallback(async (questionId: string) => {
    if (!room?.id) throw new Error("Room is not ready.");
    if (isCurrentUserBlocked || capabilities?.can_view_qna === false) {
      throw new Error("Questions are not available in this Room.");
    }
    try {
      await voteRoomQuestion({ roomId: room.id, questionId, accessToken });
    } catch (voteError) {
      const message = normalizeRoomErrorMessage(voteError, "Unable to vote for Room question.");
      setInteractionError(message);
      throw new Error(message);
    }
  }, [accessToken, capabilities?.can_view_qna, isCurrentUserBlocked, room?.id]);

  const votePoll = useCallback(async (pollId: string, optionId: string) => {
    if (!room?.id) throw new Error("Room is not ready.");
    if (isCurrentUserBlocked || capabilities?.can_view_qna === false) {
      throw new Error("Polls are not available in this Room.");
    }
    try {
      await voteRoomPoll({ roomId: room.id, pollId, optionId, accessToken });
    } catch (voteError) {
      const message = normalizeRoomErrorMessage(voteError, "Unable to vote in Room poll.");
      setInteractionError(message);
      throw new Error(message);
    }
  }, [accessToken, capabilities?.can_view_qna, isCurrentUserBlocked, room?.id]);

  const sendSupportFromBalance = useCallback(async (amountCents: number) => {
    if (!room?.id) throw new Error("Room is not ready.");
    if (isCurrentUserBlocked || !capabilities?.can_send_support) {
      throw new Error("Support is not available in this Room.");
    }
    try {
      return await sendRoomSupport({
        roomId: room.id,
        amountCents,
        paymentMethod: "user_support_balance",
        publicName: true,
        showAmount: true,
        accessToken,
      });
    } catch (supportError) {
      const message = normalizeRoomErrorMessage(supportError, "Unable to send Room support.");
      setInteractionError(message);
      throw new Error(message);
    }
  }, [accessToken, capabilities?.can_send_support, isCurrentUserBlocked, room?.id]);

  const roomChat = useMemo(
    () => snapshot.chat.filter((message): message is RoomChatMessage => message.visibility === "public"),
    [snapshot.chat],
  );

  return {
    room,
    release,
    currentUserUuid: userUuid,
    clockState,
    capabilities,
    artistKeysStatus: roomEntry?.artist_keys_status ?? null,
    presence: snapshot.presence,
    chat: roomChat,
    reactions: snapshot.reactions,
    qna: snapshot.qna,
    questions: snapshot.questions.filter(isPublicQuestionVisible),
    activePoll: snapshot.activePoll,
    closedPolls: snapshot.polls.filter((poll) => poll.status === "closed"),
    supportStats: snapshot.supportStats,
    supportBalance,
    artistPresence: snapshot.artistPresence,
    activeMoment: snapshot.activeMoment,
    pinnedNote: snapshot.pinnedNote,
    pinnedMessage: snapshot.pinnedMessage,
    moderation: snapshot.moderation,
    activity,
    timeMachine,
    isLoading,
    isSubmittingChat,
    isSubmittingQuestion,
    isMomentReconnecting,
    isCurrentUserMuted,
    isCurrentUserBlocked,
    error,
    interactionError,
    clearInteractionError: () => setInteractionError(null),
    refreshClock,
    refreshRoomExtras,
    sendChat,
    react,
    submitQuestion,
    voteQuestion,
    votePoll,
    sendSupportFromBalance,
    skipToIndex,
    seekTo,
    play,
  };
}
