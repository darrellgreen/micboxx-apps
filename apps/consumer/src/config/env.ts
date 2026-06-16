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

function firstBoolean(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (/^(1|true|yes|on)$/i.test(value)) {
        return true;
      }

      if (/^(0|false|no|off)$/i.test(value)) {
        return false;
      }
    }
  }

  return false;
}

export const env = {
  appScheme: firstString(
    process.env.EXPO_PUBLIC_APP_SCHEME,
    expoExtra.appScheme,
    "micboxx",
  ),
  forceFixtures: firstBoolean(
    process.env.EXPO_PUBLIC_FORCE_FIXTURES,
    expoExtra.EXPO_PUBLIC_FORCE_FIXTURES,
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
  momentHardeningEnabled: firstBoolean(
    process.env.EXPO_PUBLIC_MOMENT_HARDENING_ENABLED,
    expoExtra.EXPO_PUBLIC_MOMENT_HARDENING_ENABLED,
    true,
  ),
  roomSupportEnabled: firstBoolean(
    process.env.EXPO_PUBLIC_ROOM_SUPPORT_ENABLED,
    expoExtra.EXPO_PUBLIC_ROOM_SUPPORT_ENABLED,
    false,
  ),
} as const;

export function hasLiveDrupalConfig(): boolean {
  if (env.forceFixtures) {
    return false;
  }

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
  return env.forceFixtures || isLocalWebHost();
}
