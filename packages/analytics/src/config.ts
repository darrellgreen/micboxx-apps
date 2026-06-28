import type { AnalyticsProvider } from "./types";
import { type AnalyticsEventName, PLAYER_ANALYTICS_EVENTS } from "./events";

let analyticsProvider: AnalyticsProvider | null = null;
let currentEmailAttributionRef: string | null = null;

const VALID_EVENT_NAMES = new Set<string>(Object.values(PLAYER_ANALYTICS_EVENTS));

export interface AnalyticsConfiguration {
  provider: AnalyticsProvider;
}

/**
 * Configure the global Analytics service for MicBoxx.
 * This should be called exactly once during app initialization.
 */
export function configureMicboxxAnalytics(config: AnalyticsConfiguration): void {
  if (analyticsProvider) {
    console.warn("Analytics provider is already configured. Ignoring subsequent call.");
    return;
  }
  analyticsProvider = config.provider;
}

export function trackEvent(eventName: AnalyticsEventName, properties?: Record<string, unknown>): void {
  if (!VALID_EVENT_NAMES.has(eventName)) {
    console.warn(`Invalid analytics event name: ${eventName}. Suppressing event.`);
    return;
  }

  if (!analyticsProvider) {
    console.warn(`Analytics not configured. Suppressing event: ${eventName}`);
    return;
  }
  analyticsProvider.trackEvent(eventName, withEmailAttribution(properties));
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!analyticsProvider) {
    console.warn(`Analytics not configured. Suppressing identify for: ${userId}`);
    return;
  }
  analyticsProvider.identifyUser(userId, traits);
}

export function resetUser(): void {
  if (!analyticsProvider) {
    return;
  }
  analyticsProvider.resetUser();
}

export function trackScreen(screenName: string, properties?: Record<string, unknown>): void {
  if (!analyticsProvider) {
    console.warn(`Analytics not configured. Suppressing screen track: ${screenName}`);
    return;
  }
  analyticsProvider.trackScreen(screenName, withEmailAttribution(properties));
}

export function setEmailAttributionRef(ref: string | null): void {
  const normalized = typeof ref === "string" ? ref.trim() : "";
  currentEmailAttributionRef = normalized.length > 0 ? normalized : null;
}

export function getEmailAttributionRef(): string | null {
  return currentEmailAttributionRef;
}

export function withEmailAttribution(
  properties?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!currentEmailAttributionRef) {
    return properties;
  }

  return {
    ...(properties ?? {}),
    email_attribution_ref: currentEmailAttributionRef,
  };
}
