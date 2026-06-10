import { apiFetch } from "@micboxx/api";
import {
  type AnalyticsEventName,
  type PlayerAnalyticsPayload,
  PLAYER_ANALYTICS_EVENTS,
} from "@micboxx/analytics";

export interface PlayerAnalyticsSink {
  emit(event: AnalyticsEventName, payload: PlayerAnalyticsPayload): void;
}

export const noopPlayerAnalyticsSink: PlayerAnalyticsSink = {
  emit: () => undefined,
};

const PLAYER_EVENT_TO_MEDIA_SESSION: Partial<Record<AnalyticsEventName, string>> = {
  [PLAYER_ANALYTICS_EVENTS.playbackStarted]: "media_session.started",
  [PLAYER_ANALYTICS_EVENTS.playbackPaused]: "media_session.paused",
  [PLAYER_ANALYTICS_EVENTS.playbackCompleted]: "media_session.ended",
  [PLAYER_ANALYTICS_EVENTS.playbackSkipped]: "media_session.abandoned",
};

export function createServerPlayerAnalyticsSink(
  getAccessToken: () => string | null,
  getSessionId: () => string,
): PlayerAnalyticsSink {
  return {
    emit(event: AnalyticsEventName, payload: PlayerAnalyticsPayload): void {
      const mediaSessionEvent = PLAYER_EVENT_TO_MEDIA_SESSION[event];
      if (!mediaSessionEvent || !payload.trackId) return;

      void apiFetch(`/v1/public/tracks/${payload.trackId}/analytics/event`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          eventType: mediaSessionEvent,
          sourceType: payload.sourceKind ?? "unknown",
          sessionId: getSessionId(),
          ...(payload.currentPositionSec !== undefined && {
            metadata: { position_sec: payload.currentPositionSec },
          }),
        }),
        accessToken: getAccessToken(),
      }).catch(() => undefined);
    },
  };
}
