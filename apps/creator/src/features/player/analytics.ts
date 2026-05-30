import { PLAYER_ANALYTICS_EVENTS } from "@/features/player/constants/events";
import type { QueueContext } from "@/features/player/types/player";

type AnalyticsEventName =
  (typeof PLAYER_ANALYTICS_EVENTS)[keyof typeof PLAYER_ANALYTICS_EVENTS];

export interface PlayerAnalyticsPayload {
  trackId: string | null;
  sourceKind?: string | null;
  queueContextType?: QueueContext["type"] | null;
  currentPositionSec?: number;
}

export interface PlayerAnalyticsSink {
  emit(event: AnalyticsEventName, payload: PlayerAnalyticsPayload): void;
}

export const noopPlayerAnalyticsSink: PlayerAnalyticsSink = {
  emit: () => undefined,
};
