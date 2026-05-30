// Firebase social auth bridge.
//
// The web app at EXPO_PUBLIC_MICBOXX_WEB_BASE_URL owns the Firebase Admin
// SDK credentials and is the only place custom Firebase auth tokens are
// minted. Mobile exchanges its Drupal bearer token for a Firebase custom
// token by POSTing to `/api/social/auth/token` with an Authorization
// header. The web route validates the Drupal token against
// `/v1/dashboard/upload-options` and returns a custom token bound to the
// Drupal user uuid.
//
// Mobile then passes that custom token to `signInWithCustomToken()` from
// the Firebase client SDK — DO NOT import firebase-admin on mobile. The
// Firebase Admin private key must never ship in the mobile bundle.
//
// See docs/micboxx-mobile-api-contract-map.md §8 (Social layer) for the
// full architectural decision behind this bridge.

import { env } from "@/config/env";
import type { MicboxxSession } from "@/contracts/micboxx";
import type { FirebaseSocialAuthTokenResponse } from "@/contracts/social";

export class FirebaseSocialBridgeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = "FirebaseSocialBridgeError";
  }
}

interface Envelope<T> {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

function requireWebBaseUrl(): string {
  const base = env.micboxxWebBaseUrl;
  if (!base) {
    throw new FirebaseSocialBridgeError(
      "Missing EXPO_PUBLIC_MICBOXX_WEB_BASE_URL — cannot reach the Firebase social auth bridge.",
      500,
      "missing_config",
    );
  }
  return base.replace(/\/$/, "");
}

/**
 * Exchange a Drupal access token for a Firebase custom auth token by
 * calling `POST {WEB_BASE_URL}/api/social/auth/token` with an
 * `Authorization: Bearer` header. The returned `token` is ready to be
 * handed to `signInWithCustomToken(auth, token)` from the Firebase
 * client SDK.
 *
 * Call this once after sign-in succeeds (so the mobile app has a live
 * Firebase session for Firestore reads/writes) and again whenever the
 * Drupal access token rotates. Do not cache the Firebase custom token;
 * it is single-use and has a 1-hour TTL.
 */
export async function fetchFirebaseSocialAuthToken(
  session: Pick<MicboxxSession, "accessToken">,
): Promise<FirebaseSocialAuthTokenResponse> {
  if (!session.accessToken) {
    throw new FirebaseSocialBridgeError(
      "Cannot request a Firebase social auth token without a Drupal access token.",
      401,
      "not_authenticated",
    );
  }

  const url = `${requireWebBaseUrl()}/api/social/auth/token`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${session.accessToken}`,
      },
    });
  } catch (error) {
    throw new FirebaseSocialBridgeError(
      error instanceof Error
        ? `Network error contacting Firebase social auth bridge: ${error.message}`
        : "Network error contacting Firebase social auth bridge.",
      0,
      "network_error",
    );
  }

  let payload: Envelope<FirebaseSocialAuthTokenResponse> = {};
  try {
    payload = (await response.json()) as Envelope<FirebaseSocialAuthTokenResponse>;
  } catch {
    // Fall through — non-JSON body is handled by the status check below.
  }

  if (!response.ok || !payload.data) {
    throw new FirebaseSocialBridgeError(
      payload.error?.message ??
        `Firebase social auth bridge failed with status ${response.status}.`,
      response.status,
      payload.error?.code ?? null,
    );
  }

  const { token, uid } = payload.data;
  if (typeof token !== "string" || token.length === 0) {
    throw new FirebaseSocialBridgeError(
      "Firebase social auth bridge returned an empty custom token.",
      502,
      "empty_token",
    );
  }
  if (typeof uid !== "string" || uid.length === 0) {
    throw new FirebaseSocialBridgeError(
      "Firebase social auth bridge returned an empty uid.",
      502,
      "empty_uid",
    );
  }

  return { token, uid };
}
