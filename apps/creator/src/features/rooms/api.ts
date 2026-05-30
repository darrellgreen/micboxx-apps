import { env } from "@/config/env";
import type { DashboardAlbum } from "@/contracts/creator";
import { ensureFreshSession } from "@/features/auth/api";
import type {
    CreatorRoomDetail,
    CreatorRoomEntry,
    CreatorRoomListItem,
    RoomLiveVideoTokenResponse,
    RoomMomentState,
    RoomPollSnapshot,
    RoomQnaSnapshot,
    RoomQuestionSnapshotItem,
    RoomSupportSnapshot,
} from "@/features/rooms/types";
import { CreatorApiError, getAlbumStatus, getMyRooms } from "@/shared/api/creator-dashboard";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

const CREATOR_ROOM_SESSION_PREFIX = "creator-room";

let creatorRoomSessionId: string | null = null;

function getCreatorRoomSessionId() {
  if (creatorRoomSessionId) {
    return creatorRoomSessionId;
  }

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    creatorRoomSessionId = crypto.randomUUID();
  } else {
    creatorRoomSessionId = `${CREATOR_ROOM_SESSION_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  return creatorRoomSessionId;
}

function getWebBaseUrl() {
  if (!env.micboxxWebBaseUrl) {
    throw new CreatorApiError("Missing EXPO_PUBLIC_MICBOXX_WEB_BASE_URL.", 500);
  }

  return env.micboxxWebBaseUrl.replace(/\/$/, "");
}

async function getAuthorizationHeader() {
  const session = await ensureFreshSession();
  if (!session?.accessToken) {
    throw new CreatorApiError("Sign in again to continue.", 401);
  }

  return `Bearer ${session.accessToken}`;
}

async function webFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  headers.set("authorization", await getAuthorizationHeader());

  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getWebBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new CreatorApiError(
      payload.error?.message ?? `Room API request failed with ${response.status}.`,
      response.status,
    );
  }

  return payload.data ?? (payload as T);
}

function getPublicReleaseIdentifier(album: DashboardAlbum): string {
  if ("publicHref" in album && typeof album.publicHref === "string") {
    const match = album.publicHref.match(/\/albums\/([^/?#]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return album.slug;
}

export async function getCreatorRoomList(): Promise<CreatorRoomListItem[]> {
  const response = await getMyRooms(1, 100);
  return response.rooms;
}

export async function getCreatorRoomDetail(albumId: string | number): Promise<CreatorRoomDetail> {
  const album = await getAlbumStatus(albumId);
  return {
    album,
    releaseIdentifier: getPublicReleaseIdentifier(album),
  };
}

export async function enterCreatorRoom(releaseIdentifier: string): Promise<CreatorRoomEntry> {
  return webFetch<CreatorRoomEntry>("/api/public/rooms/enter", {
    method: "POST",
    body: JSON.stringify({
      release_identifier: releaseIdentifier,
      session_id: getCreatorRoomSessionId(),
    }),
  });
}

export async function startLiveVideoDropInMoment(input: {
  roomId: number | string;
  shortExpiry?: boolean;
}): Promise<RoomMomentState> {
  const expiresInSeconds = input.shortExpiry ? 30 : 3600;
  const response = await webFetch<{ moment: RoomMomentState }>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/moments`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "artist_video_drop_in",
        presentation: "stage_takeover",
        title: input.shortExpiry ? "Live video test" : "Artist live video",
        description: input.shortExpiry
          ? "Short live video drop-in test from MicBoxx for Artists."
          : "Artist live video drop-in from MicBoxx for Artists.",
        source: {
          kind: "livekit_room",
        },
        expires_in_seconds: expiresInSeconds,
        audioBehavior: "pause",
        priority: 3,
        duckVolume: 0.15,
        fadeDurationMs: 300,
        metadata: {
          creatorApp: "micboxx-creators",
          phase: "3A-room-management",
        },
      }),
    },
  );

  return response.moment;
}

export async function activateRoomQna(roomId: number | string): Promise<void> {
  await webFetch<{
    qna?: {
      enabled?: boolean;
      active_question_id?: string | null;
      open_count?: number;
      answered_count?: number;
    };
  }>(
    `/api/public/rooms/${encodeURIComponent(String(roomId))}/questions/moment/activate`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function deactivateRoomQna(roomId: number | string): Promise<void> {
  await webFetch<{
    qna?: {
      enabled?: boolean;
      active_question_id?: string | null;
      open_count?: number;
      answered_count?: number;
    };
  }>(
    `/api/public/rooms/${encodeURIComponent(String(roomId))}/questions/moment/deactivate`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function answerRoomQuestion(input: {
  roomId: number | string;
  questionId: string;
  answerText: string;
}): Promise<void> {
  await webFetch<{
    qna?: {
      enabled?: boolean;
      active_question_id?: string | null;
      open_count?: number;
      answered_count?: number;
    };
    question?: {
      id?: string;
    };
  }>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/questions/${encodeURIComponent(input.questionId)}/answer`,
    {
      method: "POST",
      body: JSON.stringify({
        answer_text: input.answerText,
      }),
    },
  );
}

export async function createRoomPoll(input: {
  roomId: number | string;
  question: string;
  options: string[];
  revealResultsAfterVote?: boolean;
}): Promise<void> {
  await webFetch<{ active_poll?: unknown | null }>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/polls`,
    {
      method: "POST",
      body: JSON.stringify({
        question: input.question,
        options: input.options,
        reveal_results_after_vote: input.revealResultsAfterVote ?? true,
      }),
    },
  );
}

export async function closeRoomPoll(input: {
  roomId: number | string;
  pollId: string;
}): Promise<void> {
  await webFetch<{ active_poll?: unknown | null }>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/polls/${encodeURIComponent(input.pollId)}/close`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function endActiveRoomMoment(roomId: number | string): Promise<RoomMomentState | null> {
  const response = await webFetch<{ moment: RoomMomentState | null }>(
    `/api/public/rooms/${encodeURIComponent(String(roomId))}/moments/active`,
    { method: "DELETE" },
  );

  return response.moment;
}

export async function getRoomLiveVideoHostToken(input: {
  roomId: number | string;
  momentId: string;
}): Promise<RoomLiveVideoTokenResponse> {
  return webFetch<RoomLiveVideoTokenResponse>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/live-video/token`,
    {
      method: "POST",
      body: JSON.stringify({
        momentId: input.momentId,
        role: "host",
      }),
    },
  );
}

export async function getRoomQnaSnapshot(roomId: number | string): Promise<RoomQnaSnapshot> {
  const response = await webFetch<{
    qna?: {
      enabled?: boolean;
      active_question_id?: string | null;
      open_count?: number;
      answered_count?: number;
    };
    questions?: {
      id?: string;
      author_display_name?: string;
      text?: string;
      votes?: number;
      status?: string;
      created_at?: number;
      answered_at?: number | null;
      answer_text?: string | null;
      visibility?: string;
    }[];
  }>(
    `/api/public/rooms/${encodeURIComponent(String(roomId))}/questions`,
  );

  const qna = response.qna;
  const questions: RoomQuestionSnapshotItem[] = Array.isArray(response.questions)
    ? response.questions
      .filter((question): question is NonNullable<typeof question> & { id: string } => typeof question?.id === "string")
      .map((question) => ({
        id: question.id,
        authorDisplayName: typeof question.author_display_name === "string" ? question.author_display_name : "Audience",
        text: typeof question.text === "string" ? question.text : "",
        votes: typeof question.votes === "number" ? question.votes : 0,
        status: typeof question.status === "string" ? question.status : "new",
        createdAt: typeof question.created_at === "number" ? question.created_at : 0,
        answeredAt: typeof question.answered_at === "number" ? question.answered_at : null,
        answerText: typeof question.answer_text === "string" ? question.answer_text : null,
        visibility: typeof question.visibility === "string" ? question.visibility : "public",
      }))
      .sort((left, right) => right.createdAt - left.createdAt)
    : [];

  return {
    enabled: qna?.enabled === true,
    activeQuestionId: typeof qna?.active_question_id === "string" ? qna.active_question_id : null,
    openCount: typeof qna?.open_count === "number" ? qna.open_count : 0,
    answeredCount: typeof qna?.answered_count === "number" ? qna.answered_count : 0,
    questionCount: questions.length,
    questions,
  };
}

export async function getRoomPollSnapshot(roomId: number | string): Promise<RoomPollSnapshot> {
  const response = await webFetch<{
    active_poll?: {
      id?: string;
      question?: string;
      status?: "active" | "closed";
      total_votes?: number;
      options?: {
        id?: string;
        text?: string;
        vote_count?: number;
      }[];
    } | null;
    closed_polls?: unknown[];
  }>(
    `/api/public/rooms/${encodeURIComponent(String(roomId))}/polls`,
  );

  const activePoll = response.active_poll;
  if (!activePoll?.id) {
    return {
      activePollId: null,
      question: null,
      status: "none",
      totalVotes: 0,
      options: [],
      closedPollCount: Array.isArray(response.closed_polls) ? response.closed_polls.length : 0,
    };
  }

  return {
    activePollId: activePoll.id,
    question: typeof activePoll.question === "string" ? activePoll.question : null,
    status: activePoll.status === "closed" ? "closed" : "active",
    totalVotes: typeof activePoll.total_votes === "number" ? activePoll.total_votes : 0,
    options: Array.isArray(activePoll.options)
      ? activePoll.options
        .filter((option): option is { id: string; text?: string; vote_count?: number } => typeof option?.id === "string")
        .map((option) => ({
          id: option.id,
          text: typeof option.text === "string" ? option.text : "",
          voteCount: typeof option.vote_count === "number" ? option.vote_count : 0,
        }))
      : [],
    closedPollCount: Array.isArray(response.closed_polls) ? response.closed_polls.length : 0,
  };
}

export async function getRoomSupportSnapshot(roomId: number | string): Promise<RoomSupportSnapshot> {
  const response = await webFetch<{
    support_status?: {
      room_id?: number;
      total_support_amount_cents?: number;
      backer_count?: number;
      support_goal_cents?: number | null;
    };
  }>(
    `/api/public/rooms/${encodeURIComponent(String(roomId))}/support/status`,
  );

  const status = response.support_status;
  return {
    enabled: null,
    totalAmountCents: typeof status?.total_support_amount_cents === "number" ? status.total_support_amount_cents : 0,
    backerCount: typeof status?.backer_count === "number" ? status.backer_count : 0,
    goalCents: typeof status?.support_goal_cents === "number" ? status.support_goal_cents : null,
  };
}

export async function activateRoomSupport(input: {
  roomId: number | string;
  enabled: boolean;
  goalCents?: number | null;
}): Promise<RoomSupportSnapshot> {
  const response = await webFetch<{
    support?: {
      enabled?: boolean;
      goal_cents?: number | null;
    };
    support_status?: {
      room_id?: number;
      total_support_amount_cents?: number;
      backer_count?: number;
      support_goal_cents?: number | null;
    };
  }>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/support/activate`,
    {
      method: "POST",
      body: JSON.stringify({
        support_enabled: input.enabled,
        support_goal_cents: input.goalCents ?? null,
      }),
    },
  );

  const support = response.support;
  const status = response.support_status;

  return {
    enabled: typeof support?.enabled === "boolean" ? support.enabled : null,
    totalAmountCents: typeof status?.total_support_amount_cents === "number" ? status.total_support_amount_cents : 0,
    backerCount: typeof status?.backer_count === "number" ? status.backer_count : 0,
    goalCents:
      typeof support?.goal_cents === "number"
        ? support.goal_cents
        : typeof status?.support_goal_cents === "number"
          ? status.support_goal_cents
          : null,
  };
}
