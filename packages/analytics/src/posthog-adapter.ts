import PostHog from 'posthog-react-native';
import type { AnalyticsProvider } from './types';

export interface PostHogAdapterOptions {
  apiKey: string;
  host: string;
}

export function createPostHogAdapter({ apiKey, host }: PostHogAdapterOptions): AnalyticsProvider {
  // Privacy guardrail: no message/chat content, no emails, no tokens, no payment details.
  const posthog = new PostHog(apiKey, {
    host,
  });

  return {
    trackEvent(eventName: string, properties?: Record<string, unknown>): void {
      posthog.capture(eventName, properties as Record<string, any>);
    },
    identifyUser(userId: string, traits?: Record<string, unknown>): void {
      posthog.identify(userId, traits as Record<string, any>);
    },
    trackScreen(screenName: string, properties?: Record<string, unknown>): void {
      posthog.screen(screenName, properties as Record<string, any>);
    },
    resetUser(): void {
      posthog.reset();
    },
  };
}
