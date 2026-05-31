import type { AnalyticsProvider } from "./types";

let analyticsProvider: AnalyticsProvider | null = null;

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

export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!analyticsProvider) {
    console.warn(`Analytics not configured. Suppressing event: ${eventName}`);
    return;
  }
  analyticsProvider.trackEvent(eventName, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!analyticsProvider) {
    console.warn(`Analytics not configured. Suppressing identify for: ${userId}`);
    return;
  }
  analyticsProvider.identifyUser(userId, traits);
}

export function trackScreen(screenName: string, properties?: Record<string, unknown>): void {
  if (!analyticsProvider) {
    console.warn(`Analytics not configured. Suppressing screen track: ${screenName}`);
    return;
  }
  analyticsProvider.trackScreen(screenName, properties);
}
