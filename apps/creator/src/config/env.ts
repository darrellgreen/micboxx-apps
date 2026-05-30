import Constants from "expo-constants";

const expoConfig = Constants.expoConfig as
  | (typeof Constants.expoConfig & {
      owner?: string;
      slug?: string;
      originalFullName?: string;
    })
  | null
  | undefined;
const expoExtra = expoConfig?.extra ?? {};

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "";
}

export const env = {
  appScheme: firstString(
    process.env.EXPO_PUBLIC_APP_SCHEME,
    expoExtra.appScheme,
    "micboxx",
  ),
  drupalBaseUrl: firstString(
    process.env.EXPO_PUBLIC_DRUPAL_BASE_URL,
    expoExtra.EXPO_PUBLIC_DRUPAL_BASE_URL,
  ),
  drupalOAuthClientId: firstString(
    process.env.EXPO_PUBLIC_DRUPAL_OAUTH_CLIENT_ID,
    expoExtra.EXPO_PUBLIC_DRUPAL_OAUTH_CLIENT_ID,
  ),
  drupalOAuthRedirectUri: firstString(
    process.env.EXPO_PUBLIC_DRUPAL_OAUTH_REDIRECT_URI,
    expoExtra.EXPO_PUBLIC_DRUPAL_OAUTH_REDIRECT_URI,
  ),
  drupalOAuthScope: firstString(
    process.env.EXPO_PUBLIC_DRUPAL_OAUTH_SCOPE,
    expoExtra.EXPO_PUBLIC_DRUPAL_OAUTH_SCOPE,
  ),
  micboxxWebBaseUrl: firstString(
    process.env.EXPO_PUBLIC_MICBOXX_WEB_BASE_URL,
    expoExtra.EXPO_PUBLIC_MICBOXX_WEB_BASE_URL,
  ),
  creatorFixtureScenario: firstString(
    process.env.EXPO_PUBLIC_CREATOR_FIXTURE_SCENARIO,
    expoExtra.EXPO_PUBLIC_CREATOR_FIXTURE_SCENARIO,
    "creator_ready",
  ),
  firebaseApiKey: firstString(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    expoExtra.EXPO_PUBLIC_FIREBASE_API_KEY,
  ),
  firebaseAuthDomain: firstString(
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    expoExtra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  firebaseProjectId: firstString(
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    expoExtra.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  firebaseAppId: firstString(
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    expoExtra.EXPO_PUBLIC_FIREBASE_APP_ID,
  ),
  sentryDsn: firstString(
    process.env.EXPO_PUBLIC_SENTRY_DSN,
    expoExtra.EXPO_PUBLIC_SENTRY_DSN,
  ),
} as const;

export function hasLiveDrupalConfig(): boolean {
  return Boolean(
    env.drupalBaseUrl && env.drupalOAuthClientId && env.drupalOAuthScope,
  );
}

export function hasFirebaseConfig(): boolean {
  return Boolean(
    env.firebaseApiKey &&
    env.firebaseAuthDomain &&
    env.firebaseProjectId &&
    env.firebaseAppId,
  );
}

export function isLocalWebHost(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function shouldUseLocalWebFixtures(): boolean {
  return false;
}
