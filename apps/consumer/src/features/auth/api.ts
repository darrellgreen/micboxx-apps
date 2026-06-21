import * as AuthSession from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";

import { env } from "@/config/env";
import type { MicboxxSession, MicboxxSessionUser } from "@micboxx/contracts";
import {
    clearStoredSession,
    readStoredSession,
    writeStoredSession,
} from "@/features/auth/storage";

export class AuthCancelledError extends Error {
  constructor(message = "Sign-in was cancelled.") {
    super(message);
    this.name = "AuthCancelledError";
  }
}

export class AuthSessionExpiredError extends Error {
  constructor(message = "Your MicBoxx sign-in expired. Sign in again to continue.") {
    super(message);
    this.name = "AuthSessionExpiredError";
  }
}

export function isAuthCancelledError(
  error: unknown,
): error is AuthCancelledError {
  return error instanceof AuthCancelledError;
}

export function isAuthSessionExpiredError(
  error: unknown,
): error is AuthSessionExpiredError {
  return error instanceof AuthSessionExpiredError;
}

// ─── Deep-link fallback ────────────────────────────────────────────────────
// When the auth session intercepts the final app callback it closes the browser
// itself and resolves promptAsync/openAuthSessionAsync — no Linking event fires.
// If the OS opens the callback URL directly instead, auth/callback.tsx receives
// the URL via Linking and calls notifyDeepLinkCallback so the exchange can
// still complete.
let _pendingDeepLinkResolve: ((url: string) => void) | null = null;

export function notifyDeepLinkCallback(url: string): void {
  if (_pendingDeepLinkResolve) {
    const resolve = _pendingDeepLinkResolve;
    _pendingDeepLinkResolve = null;
    resolve(url);
  }
}

function buildAppReturnUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: env.appScheme,
    path: "auth/callback",
  });
}

function buildRelayRedirectUri(): string {
  return `${env.drupalBaseUrl}/v1/auth/mobile-callback`;
}

function encodeMobileOAuthState(payload: {
  nonce: string;
  appReturnUri: string;
}): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function getDiscovery() {
  return {
    authorizationEndpoint: `${env.drupalBaseUrl}/oauth/authorize`,
    tokenEndpoint: `${env.drupalBaseUrl}/oauth/token`,
    revocationEndpoint: `${env.drupalBaseUrl}/oauth/revoke`,
  };
}

type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string | null;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number }> {
  const response = await fetch(`${env.drupalBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.drupalOAuthClientId,
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    }).toString(),
  });

  const payload = (await response.json().catch(() => null)) as OAuthTokenResponse | null;
  if (!response.ok || typeof payload?.access_token !== "string") {
    const oauthError = payload?.error ?? "unknown_error";
    const oauthDescription = payload?.error_description ?? "OAuth code exchange failed.";
    throw new Error(
      oauthError === "invalid_client"
        ? `OAuth client rejected by server (invalid_client). client_id=${env.drupalOAuthClientId}, redirect_uri=${input.redirectUri}. ${oauthDescription}`
        : `${oauthError}: ${oauthDescription}`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 300,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isInvalidRefreshTokenResponse(payload: {
  error_description?: string;
  error?: string;
} | null): boolean {
  const error = `${payload?.error ?? ""} ${payload?.error_description ?? ""}`.toLowerCase();
  return (
    error.includes("invalid_grant") ||
    error.includes("refresh token") ||
    error.includes("invalid refresh")
  );
}

function isMicboxxSessionUser(value: unknown): value is MicboxxSessionUser {
  if (!isRecord(value) || !isRecord(value.permissions)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.uuid === "string" &&
    typeof value.username === "string" &&
    typeof value.displayName === "string" &&
    typeof value.email === "string" &&
    Array.isArray(value.roles) &&
    typeof value.permissions.canUploadTracks === "boolean" &&
    typeof value.permissions.canAdministerTracks === "boolean" &&
    typeof value.permissions.canSellCatalog === "boolean" &&
    typeof value.permissions.canCreatePlaylists === "boolean" &&
    typeof value.permissions.canAdministerPlaylists === "boolean" &&
    typeof value.permissions.canCreateAlbums === "boolean" &&
    typeof value.permissions.canAdministerAlbums === "boolean"
  );
}

const TOKEN_REFRESH_WINDOW_MS = 60_000;

function isSessionStillFresh(session: MicboxxSession | null | undefined) {
  return Boolean(
    session?.accessToken &&
    session.accessTokenExpiresAt > Date.now() + TOKEN_REFRESH_WINDOW_MS,
  );
}

// Serialises concurrent refresh calls by session key so only one hits the server at a time.
// All callers awaiting during an in-flight refresh for the same session receive the same result.
let currentSessionGeneration = 0;

export function getSessionGeneration(): number {
  return currentSessionGeneration;
}

export function incrementSessionGeneration(): number {
  currentSessionGeneration += 1;
  return currentSessionGeneration;
}

function fingerprintAccessToken(token: string): string {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) | 0;
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

const refreshInFlightMap = new Map<string, Promise<MicboxxSession | null>>();

export async function ensureFreshSession(
  session?: MicboxxSession | null,
  options?: { force?: boolean },
): Promise<MicboxxSession | null> {
  const storedSession = await readStoredSession().catch(() => null);
  const candidate =
    storedSession &&
    (!session ||
      storedSession.accessTokenExpiresAt >= session.accessTokenExpiresAt)
      ? storedSession
      : (session ?? null);

  if (!candidate) {
    return candidate;
  }

  // `force` performs a real refresh even when the access token is not yet
  // locally expired — needed when the server has rejected a token the client
  // still considers fresh (a social-auth 401). Everything else (single-flight
  // serialization, invalid-grant handling) is unchanged.
  if (!options?.force && isSessionStillFresh(candidate)) {
    return candidate;
  }

  if (!candidate.refreshToken) {
    return candidate;
  }

  const sessionKey = `${candidate.user.uuid}:${fingerprintAccessToken(candidate.refreshToken)}`;
  const startGeneration = currentSessionGeneration;
  const startUuid = candidate.user.uuid;
  const startToken = candidate.accessToken;

  let refreshPromise = refreshInFlightMap.get(sessionKey);
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh(candidate).finally(() => {
      refreshInFlightMap.delete(sessionKey);
    });
    refreshInFlightMap.set(sessionKey, refreshPromise);
  }

  let refreshed: MicboxxSession | null;
  try {
    refreshed = await refreshPromise;
  } catch (error) {
    const currentStored = await readStoredSession().catch(() => null);
    const hasSessionChanged =
      currentSessionGeneration !== startGeneration ||
      !currentStored ||
      currentStored.user.uuid !== startUuid ||
      currentStored.accessToken !== startToken;

    if (hasSessionChanged) {
      return currentStored;
    }

    if (isAuthSessionExpiredError(error)) {
      await clearStoredSession().catch(() => undefined);
    }
    throw error;
  }

  const currentStored = await readStoredSession().catch(() => null);
  const hasSessionChanged =
    currentSessionGeneration !== startGeneration ||
    !currentStored ||
    currentStored.user.uuid !== startUuid ||
    (currentStored.accessToken !== startToken &&
      (!refreshed || currentStored.accessToken !== refreshed.accessToken));

  if (hasSessionChanged) {
    return currentStored;
  }

  if (refreshed) {
    if (options?.force && refreshed.accessToken === startToken) {
      await clearStoredSession().catch(() => undefined);
      throw new AuthSessionExpiredError();
    }
    await writeStoredSession(refreshed);
  }
  return refreshed;
}

async function performTokenRefresh(
  candidate: MicboxxSession,
): Promise<MicboxxSession | null> {
  const response = await fetch(`${env.drupalBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.drupalOAuthClientId,
      refresh_token: candidate.refreshToken!,
      ...(env.drupalOAuthScope ? { scope: env.drupalOAuthScope } : null),
    }).toString(),
  });

  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string | null;
    expires_in?: number;
    error_description?: string;
    error?: string;
  } | null;

  if (!response.ok || typeof payload?.access_token !== "string") {
    if (isInvalidRefreshTokenResponse(payload)) {
      throw new AuthSessionExpiredError();
    }

    throw new Error(
      payload?.error_description ??
        payload?.error ??
        "Your MicBoxx sign-in expired. Sign in again to continue.",
    );
  }

  // Side-effect free nextSession preparation
  const nextSession: MicboxxSession = {
    ...candidate,
    accessToken: payload.access_token,
    refreshToken:
      typeof payload.refresh_token === "string"
        ? payload.refresh_token
        : candidate.refreshToken,
    accessTokenExpiresAt: Date.now() + (payload.expires_in ?? 300) * 1000,
  };

  // Best-effort user profile refresh — failure does not invalidate the token.
  try {
    const user = await getDashboardBootstrapUser(payload.access_token);
    return { ...nextSession, user };
  } catch {
    return nextSession;
  }
}

async function getDashboardBootstrapUser(
  accessToken: string,
): Promise<MicboxxSessionUser> {
  const response = await fetch(
    `${env.drupalBaseUrl}/v1/dashboard/upload-options`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload: unknown = await response.json().catch(() => null);
  const currentUser =
    isRecord(payload) && isRecord(payload.data)
      ? payload.data.currentUser
      : null;
  const errorMessage =
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : null;

  if (!response.ok || !isMicboxxSessionUser(currentUser)) {
    throw new Error(
      errorMessage ??
        "Drupal did not return a usable dashboard bootstrap user.",
    );
  }

  return currentUser;
}

export async function signInWithDrupal(): Promise<MicboxxSession> {

  const expoGo = isExpoGo();
  const appReturnUri = buildAppReturnUri();
  const redirectUri =
    env.drupalOAuthRedirectUri || (expoGo ? buildRelayRedirectUri() : appReturnUri);
  const usingRelayRedirect = expoGo && !env.drupalOAuthRedirectUri;

  if (__DEV__) {
    console.log("[micboxx auth] redirect URI:", redirectUri);
    console.log("[micboxx auth] app return URI:", appReturnUri);
    console.log(
      "[micboxx auth] auth mode:",
      usingRelayRedirect ? "expo-go-relay" : "direct",
    );
  }

  const discovery = getDiscovery();

  const request = new AuthSession.AuthRequest({
    clientId: env.drupalOAuthClientId,
    scopes: env.drupalOAuthScope.split(/\s+/).filter(Boolean),
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  if (usingRelayRedirect) {
    request.state = encodeMobileOAuthState({
      nonce: request.state ?? "",
      appReturnUri,
    });
  }

  // Build deep-link fallback promise. If the OS opens the callback URL as a
  // normal deep link instead of resolving the browser session directly,
  // auth/callback.tsx calls notifyDeepLinkCallback() so the exchange can still
  // complete.
  const deepLinkPromise = new Promise<{ via: "deeplink"; url: string }>(
    (resolve) => {
      _pendingDeepLinkResolve = (url) => resolve({ via: "deeplink", url });
    },
  );

  // Installed MicBoxx builds redirect directly to micboxx://auth/callback.
  // Expo Go sends Drupal through the server-side mobile callback bridge, which
  // reads the local app callback from OAuth state and returns the browser
  // session to the correct exp:// URL for the running app.
  let result: AuthSession.AuthSessionResult;
  try {
    if (usingRelayRedirect) {
      const authUrl = await request.makeAuthUrlAsync(discovery);
      if (__DEV__) console.log("[micboxx auth] authorize URL:", authUrl);

      const winner = await Promise.race([
        WebBrowser.openAuthSessionAsync(authUrl, appReturnUri, {
          preferEphemeralSession: true,
        }).then((r) => ({ via: "browser" as const, result: r })),
        deepLinkPromise,
      ]);

      if (winner.via === "deeplink") {
        if (__DEV__) {
          console.log(
            "[micboxx auth] completing via deep-link fallback:",
            winner.url,
          );
        }
        AuthSession.dismiss();
        result = request.parseReturnUrl(winner.url);
      } else if (winner.result.type === "success") {
        result = request.parseReturnUrl(winner.result.url);
      } else {
        result = { type: winner.result.type };
      }
    } else {
      const winner = await Promise.race([
        request
          .promptAsync(discovery, { preferEphemeralSession: true })
          .then((r) => ({ via: "prompt" as const, result: r })),
        deepLinkPromise,
      ]);

      if (winner.via === "deeplink") {
        if (__DEV__) {
          console.log(
            "[micboxx auth] completing via deep-link fallback:",
            winner.url,
          );
        }
        AuthSession.dismiss();
        result = request.parseReturnUrl(winner.url);
      } else {
        result = winner.result;
      }
    }
  } finally {
    // Always clear the pending resolver so notifyDeepLinkCallback is a no-op
    // after sign-in completes (successfully or with an error).
    _pendingDeepLinkResolve = null;
  }

  if (__DEV__) console.log("[micboxx auth] result type:", result.type);

  if (result.type === "dismiss" || result.type === "cancel") {
    throw new AuthCancelledError();
  }

  if (result.type !== "success" || !result.params.code) {
    const errMsg =
      result.type === "error"
        ? (result.error?.description ??
          result.error?.message ??
          result.errorCode)
        : null;
    throw new Error(
      errMsg ??
        "Sign-in did not return an authorization code. " +
          "Make sure the redirect URI is registered on the Drupal OAuth consumer " +
          "and that the mobile callback bridge is reachable.",
    );
  }

  const tokenResult = await exchangeAuthorizationCode({
    code: result.params.code,
    redirectUri,
    codeVerifier: request.codeVerifier ?? "",
  });

  const user = await getDashboardBootstrapUser(tokenResult.accessToken);
  return {
    user,
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken ?? null,
    accessTokenExpiresAt: Date.now() + (tokenResult.expiresIn ?? 300) * 1000,
  };
}

export async function revokeDrupalSession(
  session: MicboxxSession | null,
): Promise<void> {
  if (!session?.refreshToken) {
    return;
  }

  await fetch(`${env.drupalBaseUrl}/oauth/revoke`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Bearer ${session.accessToken}`,
    },
    body: new URLSearchParams({
      token: session.refreshToken,
    }).toString(),
  }).catch(() => undefined);
}
