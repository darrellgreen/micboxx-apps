import type { AnalyticsProvider } from "@micboxx/analytics";

/**
 * A basic console-based analytics adapter.
 * In the future, this can be swapped with Firebase Analytics, PostHog, or Segment
 * without changing the @micboxx/analytics core orchestration.
 */
import { createPostHogAdapter } from "@micboxx/analytics";

const ConsoleAnalyticsAdapter: AnalyticsProvider = {
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log(`[Analytics:Event] ${eventName}`, properties ?? "");
    }
    // TODO: inject native SDK (e.g. Firebase Analytics) here when ready
  },

  identifyUser(userId: string, traits?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log(`[Analytics:Identify] User: ${userId}`, traits ?? "");
    }
    // TODO: inject native SDK identify here
  },

  resetUser(): void {
    if (__DEV__) {
      console.log(`[Analytics:Reset] User reset`);
    }
    // TODO: inject native SDK reset here
  },

  trackScreen(screenName: string, properties?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log(`[Analytics:Screen] ${screenName}`, properties ?? "");
    }
    // TODO: inject native SDK screen track here
  },
};

export const PlatformAnalyticsAdapter: AnalyticsProvider = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
  ? createPostHogAdapter({
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    })
  : ConsoleAnalyticsAdapter;
