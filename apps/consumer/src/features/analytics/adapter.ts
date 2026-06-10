import { createPostHogAdapter } from "@micboxx/analytics";
import type { AnalyticsProvider } from "@micboxx/analytics";

// Dev-only fallback used when EXPO_PUBLIC_POSTHOG_API_KEY is not set.
const ConsoleAnalyticsAdapter: AnalyticsProvider = {
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log(`[Analytics:Event] ${eventName}`, properties ?? "");
    }
  },

  identifyUser(userId: string, traits?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log(`[Analytics:Identify] User: ${userId}`, traits ?? "");
    }
  },

  resetUser(): void {
    if (__DEV__) {
      console.log(`[Analytics:Reset] User reset`);
    }
  },

  trackScreen(screenName: string, properties?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log(`[Analytics:Screen] ${screenName}`, properties ?? "");
    }
  },
};

export const PlatformAnalyticsAdapter: AnalyticsProvider = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
  ? createPostHogAdapter({
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    })
  : ConsoleAnalyticsAdapter;
