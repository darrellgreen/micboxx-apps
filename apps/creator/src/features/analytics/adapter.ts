import type { AnalyticsProvider } from "@micboxx/analytics";

export const PlatformAnalyticsAdapter: AnalyticsProvider = {
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
