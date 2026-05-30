export const PLAYER_ANALYTICS_EVENTS = {
  playbackStarted: "playback_started",
  playbackPaused: "playback_paused",
  playbackCompleted: "playback_completed",
  playbackSkipped: "playback_skipped",
  playbackSourceSelected: "playback_source_selected",
  playbackBlocked: "playback_blocked",
} as const;

export type AnalyticsEventName =
  (typeof PLAYER_ANALYTICS_EVENTS)[keyof typeof PLAYER_ANALYTICS_EVENTS];

// Simple payload type that avoids importing QueueContext which is app-specific
export interface PlayerAnalyticsPayload {
  trackId: string | null;
  sourceKind?: string | null;
  queueContextType?: string | null;
  currentPositionSec?: number;
}
