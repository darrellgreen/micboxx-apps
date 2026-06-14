import { getMicboxxApiConfig } from "../config";
import type {
    PublicRoomDiscoveryFilter,
    PublicRoomList,
    RoomActivityResponse,
    RoomClockResponse,
    RoomClockState,
    RoomEntryResponse,
    RoomLiveVideoTokenResponse,
    RoomPollsResponse,
    RoomQuestionsResponse,
    RoomReactionType,
    RoomSupportPaymentMethod,
    RoomSupportSendResponse,
    RoomSupportStatusResult,
    RoomTimeMachineResponse,
} from "@micboxx/contracts";
import { ApiError, apiFetch } from "../client";

function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mobile-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveWebProxyBaseUrl(): string {
  const config = getMicboxxApiConfig();
  const configured = config.webBaseUrl?.trim() ?? "";
  if (!configured) {
    return "";
  }

  try {
    const webUrl = new URL(configured);
    const drupalUrl = new URL(config.baseUrl);
    const webIsLoopback = webUrl.hostname === "localhost" || webUrl.hostname === "127.0.0.1";
    const drupalIsLan = drupalUrl.hostname !== "localhost" && drupalUrl.hostname !== "127.0.0.1";

    if (!webIsLoopback || !drupalIsLan) {
      return configured;
    }

    webUrl.hostname = drupalUrl.hostname;
    return webUrl.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}

function normalizeClockTrackMap(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as { tracks?: unknown };
    if (Array.isArray(record.tracks)) {
      return record.tracks;
    }
  }

  return [];
}

export function normalizeRoomClockState(
  value: RoomClockState | null,
): RoomClockState | null {
  if (!value) {
    return null;
  }

  return {
    ...value,
    track_map: normalizeClockTrackMap(value.track_map) as RoomClockState["track_map"],
  };
}

async function getAccessToken(
  accessToken?: string | null,
  options?: { allowAnonymousOnExpiredSession?: boolean },
) {
  const config = getMicboxxApiConfig();
  try {
    const sessionToken = await config.getToken();
    return sessionToken ?? accessToken ?? null;
  } catch (error) {
    if (
      options?.allowAnonymousOnExpiredSession &&
      config.isAuthSessionExpiredError?.(error)
    ) {
      return null;
    }
    throw error;
  }
}

export async function enterRoom(input: {
  releaseIdentifier: string;
  sessionId: string;
  accessToken?: string | null;
}): Promise<RoomEntryResponse> {
  const data = await apiFetch<RoomEntryResponse>("/v1/rooms/enter", {
    method: "POST",
    accessToken: await getAccessToken(input.accessToken, {
      allowAnonymousOnExpiredSession: true,
    }),
    body: JSON.stringify({
      release_identifier: input.releaseIdentifier,
      session_id: input.sessionId,
    }),
  });

  return {
    ...data,
    clock: normalizeRoomClockState(data.clock),
  };
}

export async function getRoomClock(roomId: number | string): Promise<RoomClockState> {
  const data = await apiFetch<RoomClockResponse>(
    `/v1/rooms/${encodeURIComponent(String(roomId))}/clock`,
  );
  return normalizeRoomClockState(data.clock)!;
}

export async function getPublicRooms(options?: {
  filter?: PublicRoomDiscoveryFilter;
  limit?: number;
  artist?: string | null;
}): Promise<PublicRoomList> {
  const params = new URLSearchParams();
  params.set("filter", options?.filter ?? "latest_activity");
  params.set("limit", String(options?.limit ?? 12));
  if (options?.artist) {
    params.set("artist", options.artist);
  }

  return apiFetch<PublicRoomList>(`/v1/public/rooms?${params.toString()}`);
}

export type RoomHistoryEntry = PublicRoomSummary & { joined_at: number };

export type RoomHistoryResponse = {
  rooms: RoomHistoryEntry[];
  meta: { total: number };
};

export async function getMyRoomHistory(options?: {
  limit?: number;
  accessToken?: string | null;
}): Promise<RoomHistoryResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 20));
  return apiFetch<RoomHistoryResponse>(
    `/v1/dashboard/room-history?${params.toString()}`,
    { accessToken: await getAccessToken(options?.accessToken) },
  );
}

export async function sendRoomReaction(input: {
  roomId: number | string;
  reactionId: string;
  reactionType: RoomReactionType;
  actorVisibility?: "anonymous" | "visible";
  accessToken?: string | null;
}): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/reactions`,
    {
      method: "POST",
      accessToken: await getAccessToken(input.accessToken),
      body: JSON.stringify({
        reaction_id: input.reactionId,
        reaction_type: input.reactionType,
        actor_visibility: input.actorVisibility ?? "anonymous",
      }),
    },
  );
}

export async function sendRoomChatMessage(input: {
  roomId: number | string;
  messageText: string;
  messageId?: string | null;
  releasePositionSeconds?: number | null;
  trackRefId?: string | number | null;
  trackPositionSeconds?: number | null;
  loopNumber?: number | null;
  accessToken?: string | null;
}): Promise<{ message_id?: string }> {
  const accessToken = await getAccessToken(input.accessToken);
  const messageId = input.messageId?.trim() || createClientMessageId();
  const roomId = encodeURIComponent(String(input.roomId));
  const requestBody = {
    client_message_id: messageId,
    message_id: messageId,
    message_text: input.messageText,
    release_position_seconds: input.releasePositionSeconds ?? null,
    track_ref_id: input.trackRefId ?? null,
    track_position_seconds: input.trackPositionSeconds ?? null,
    loop_number: input.loopNumber ?? null,
  };

  const webProxyBaseUrl = resolveWebProxyBaseUrl();
  if (webProxyBaseUrl) {
    return apiFetch<{ message_id?: string }>(
      `/api/public/rooms/${roomId}/chat/messages`,
      {
        method: "POST",
        accessToken,
        baseUrl: webProxyBaseUrl,
        body: JSON.stringify(requestBody),
      },
    );
  }

  return apiFetch<{ message_id?: string }>(
    `/v1/rooms/${roomId}/chat/messages`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(requestBody),
    },
  );
}

export async function reportRoomChatMessage(input: {
  roomId: number | string;
  messageId: string;
  reasonKey: string;
  detail?: string | null;
  accessToken?: string | null;
}): Promise<Record<string, never>> {
  return apiFetch<Record<string, never>>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/chat/messages/${encodeURIComponent(input.messageId)}/report`,
    {
      method: "POST",
      accessToken: await getAccessToken(input.accessToken),
      body: JSON.stringify({
        reason_key: input.reasonKey,
        detail: input.detail ?? null,
      }),
    },
  );
}

export async function getRoomQuestions(roomId: number | string): Promise<RoomQuestionsResponse> {
  return apiFetch<RoomQuestionsResponse>(
    `/v1/rooms/${encodeURIComponent(String(roomId))}/questions`,
  );
}

export async function submitRoomQuestion(input: {
  roomId: number | string;
  text: string;
  accessToken?: string | null;
}): Promise<RoomQuestionsResponse> {
  return apiFetch<RoomQuestionsResponse>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/questions`,
    {
      method: "POST",
      accessToken: await getAccessToken(input.accessToken),
      body: JSON.stringify({ text: input.text }),
    },
  );
}

export async function voteRoomQuestion(input: {
  roomId: number | string;
  questionId: string;
  accessToken?: string | null;
}): Promise<RoomQuestionsResponse> {
  return apiFetch<RoomQuestionsResponse>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/questions/${encodeURIComponent(input.questionId)}/vote`,
    {
      method: "POST",
      accessToken: await getAccessToken(input.accessToken),
      body: JSON.stringify({}),
    },
  );
}

export async function getRoomPolls(roomId: number | string): Promise<RoomPollsResponse> {
  return apiFetch<RoomPollsResponse>(
    `/v1/rooms/${encodeURIComponent(String(roomId))}/polls`,
  );
}

// UNVERIFIED_ROUTE: typed only; consumer mobile does not expose poll creation.
export async function createRoomPollStub(): Promise<never> {
  throw new ApiError("Room poll creation is not available in the consumer app.", 501);
}

export async function voteRoomPoll(input: {
  roomId: number | string;
  pollId: string;
  optionId: string;
  accessToken?: string | null;
}): Promise<RoomPollsResponse> {
  return apiFetch<RoomPollsResponse>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/polls/${encodeURIComponent(input.pollId)}/vote`,
    {
      method: "POST",
      accessToken: await getAccessToken(input.accessToken),
      body: JSON.stringify({ option_id: input.optionId }),
    },
  );
}

export async function getRoomActivity(input: {
  roomId: number | string;
  limit?: number;
  sinceEventId?: number | null;
}): Promise<RoomActivityResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 20));
  if (input.sinceEventId && input.sinceEventId > 0) {
    params.set("since_event_id", String(input.sinceEventId));
  }

  const data = await apiFetch<{ room_activity: RoomActivityResponse }>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/activity?${params.toString()}`,
  );
  return data.room_activity;
}

export type RoomNotification = {
  notification_id: number;
  notification_type: string;
  title: string;
  body: string;
  target_url: string;
  payload_json?: {
    reward_key?: string;
    reward_award_id?: number;
    [key: string]: unknown;
  };
  created: number;
  read_at: number | null;
  delivery_state: string;
};

export type RoomNotificationsResponse = {
  notifications: RoomNotification[];
  meta?: {
    total?: number;
    unread?: number;
  };
};

export function isRoomRewardNotification(
  notification: Pick<RoomNotification, "notification_type">,
): boolean {
  if (notification.notification_type === "room_reward_awarded") {
    return true;
  }

  return notification.notification_type.startsWith("room_reward_");
}

export async function getRoomNotifications(input?: {
  limit?: number;
  accessToken?: string | null;
}): Promise<RoomNotificationsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(input?.limit ?? 12));
  const accessToken = await getAccessToken(input?.accessToken);
  const webProxyBaseUrl = resolveWebProxyBaseUrl();

  if (webProxyBaseUrl) {
    try {
      const response = await apiFetch<RoomNotificationsResponse>(
        `/api/public/rooms/notifications?${params.toString()}`,
        {
          accessToken,
          baseUrl: webProxyBaseUrl,
        },
      );

      if (response.notifications.length > 0) {
        return response;
      }
    } catch {
      // Fall back to Drupal directly when the web bridge is unavailable.
    }
  }

  return apiFetch<RoomNotificationsResponse>(
    `/v1/rooms/notifications?${params.toString()}`,
    {
      accessToken,
    },
  );
}

export async function markRoomNotificationRead(input: {
  notificationId: number | string;
  accessToken?: string | null;
}): Promise<Record<string, never>> {
  const accessToken = await getAccessToken(input.accessToken);
  const notificationId = encodeURIComponent(String(input.notificationId));
  const webProxyBaseUrl = resolveWebProxyBaseUrl();

  if (webProxyBaseUrl) {
    return apiFetch<Record<string, never>>(
      `/api/public/rooms/notifications/${notificationId}/read`,
      {
        method: "POST",
        accessToken,
        baseUrl: webProxyBaseUrl,
      },
    );
  }

  return apiFetch<Record<string, never>>(
    `/v1/rooms/notifications/${notificationId}/read`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export async function getRoomTimeMachine(
  roomId: number | string,
): Promise<RoomTimeMachineResponse> {
  const data = await apiFetch<{ time_machine: RoomTimeMachineResponse }>(
    `/v1/rooms/${encodeURIComponent(String(roomId))}/time-machine`,
  );
  return data.time_machine;
}

export async function getRoomSupportStatus(input: {
  roomId: number | string;
  accessToken?: string | null;
}): Promise<RoomSupportStatusResult> {
  const data = await apiFetch<RoomSupportStatusResult>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/support/status`,
    {
      accessToken: await getAccessToken(input.accessToken),
    },
  );
  return {
    support_status: data.support_status,
    support_balance: data.support_balance ?? null,
  };
}

export async function sendRoomSupport(input: {
  roomId: number | string;
  amountCents: number;
  paymentMethod: RoomSupportPaymentMethod;
  publicName: boolean;
  showAmount: boolean;
  note?: string;
  successUrl?: string;
  cancelUrl?: string;
  accessToken?: string | null;
}): Promise<RoomSupportSendResponse> {
  return apiFetch<RoomSupportSendResponse>(
    `/v1/rooms/${encodeURIComponent(String(input.roomId))}/support/send`,
    {
      method: "POST",
      accessToken: await getAccessToken(input.accessToken),
      body: JSON.stringify({
        amount_cents: input.amountCents,
        public_name: input.publicName,
        show_amount: input.showAmount,
        support_note: input.note?.trim() ?? "",
        payment_method: input.paymentMethod,
        client_support_id: crypto.randomUUID(),
        ...(input.successUrl ? { success_url: input.successUrl } : {}),
        ...(input.cancelUrl ? { cancel_url: input.cancelUrl } : {}),
      }),
    },
  );
}

function getWebBridgeBaseUrl(): string {
  const resolved = resolveWebProxyBaseUrl();
  if (!resolved) {
    throw new ApiError("Missing EXPO_PUBLIC_MICBOXX_WEB_BASE_URL.", 500);
  }

  return resolved;
}

// UNVERIFIED_ROUTE: Drupal /v1 presence heartbeat is absent; use verified web bridge only.
export async function sendRoomPresenceHeartbeat(input: {
  roomId: number | string;
  visibility: "visible" | "anonymous" | "hidden";
  sessionId: string;
  accessToken?: string | null;
}): Promise<{
  ok: true;
  actor_type: "user" | "anonymous";
  presence_doc_id: string;
  expires_at?: number;
  visibility: string;
}> {
  const accessToken = await getAccessToken(input.accessToken, {
    allowAnonymousOnExpiredSession: true,
  });
  const response = await fetch(
    `${getWebBridgeBaseUrl()}/api/public/rooms/${encodeURIComponent(String(input.roomId))}/presence/heartbeat`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        visibility: input.visibility,
        session_id: input.sessionId,
      }),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    data?: {
      ok: true;
      actor_type: "user" | "anonymous";
      presence_doc_id: string;
      expires_at?: number;
      visibility: string;
    };
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new ApiError(
      payload.error?.message ?? `Presence heartbeat failed with ${response.status}.`,
      response.status,
    );
  }

  return payload.data;
}

export async function getRoomLiveVideoAudienceToken(input: {
  roomId: number | string;
  momentId: string;
  accessToken?: string | null;
}): Promise<RoomLiveVideoTokenResponse> {
  return apiFetch<RoomLiveVideoTokenResponse>(
    `/api/public/rooms/${encodeURIComponent(String(input.roomId))}/live-video/token`,
    {
      method: "POST",
      baseUrl: getWebBridgeBaseUrl(),
      accessToken: await getAccessToken(input.accessToken, {
        allowAnonymousOnExpiredSession: true,
      }),
      body: JSON.stringify({
        momentId: input.momentId,
        role: "audience",
      }),
    },
  );
}
