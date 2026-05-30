import {
  type AnalyticsEventName,
  type PlayerAnalyticsPayload,
} from "@micboxx/utils";

export interface PlayerAnalyticsSink {
  emit(event: AnalyticsEventName, payload: PlayerAnalyticsPayload): void;
}

export const noopPlayerAnalyticsSink: PlayerAnalyticsSink = {
  emit: () => undefined,
};
