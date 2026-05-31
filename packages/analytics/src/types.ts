export interface PlayerAnalyticsPayload {
  trackId: string | null;
  sourceKind?: string | null;
  queueContextType?: string | null;
  currentPositionSec?: number;
}

export interface AnalyticsIdentifyPayload {
  userId: string;
  traits?: Record<string, unknown>;
}

export interface AnalyticsScreenPayload {
  screenName: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsEventPayload {
  eventName: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsProvider {
  trackEvent(eventName: string, properties?: Record<string, unknown>): void;
  identifyUser(userId: string, traits?: Record<string, unknown>): void;
  trackScreen(screenName: string, properties?: Record<string, unknown>): void;
}
