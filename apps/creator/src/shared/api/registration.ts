/**
 * Public registration + email-verification API.
 *
 * All endpoints live under `/v1/auth/*` on Drupal, require no Bearer token,
 * and use the standard `{ data: ... }` / `{ error: { message } }` envelope.
 */

import type {
  AvailabilityResult,
  RegisterRequest,
  RegisterResult,
  ResendCodeResult,
  VerifyRequest,
  VerifyResult,
} from "@micboxx/contracts";

import { env } from "@/config/env";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base(): string {
  return env.drupalBaseUrl.replace(/\/$/, "");
}

async function authFetch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `Request failed with status ${response.status}.`,
    );
  }

  if (payload.data === undefined) {
    throw new Error("Unexpected response from server.");
  }

  return payload.data;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function registerCreator(
  input: RegisterRequest,
): Promise<RegisterResult> {
  return authFetch<RegisterResult>("/v1/auth/register", input);
}

export async function verifyEmail(
  input: VerifyRequest,
): Promise<VerifyResult> {
  return authFetch<VerifyResult>("/v1/auth/verify", input);
}

export async function resendVerificationCode(uid: number): Promise<ResendCodeResult> {
  return authFetch<ResendCodeResult>("/v1/auth/resend-code", { uid });
}

export async function checkUsernameAvailability(
  username: string,
): Promise<AvailabilityResult> {
  return authFetch<AvailabilityResult>("/v1/auth/check-username", { username });
}

export async function checkEmailAvailability(
  email: string,
): Promise<AvailabilityResult> {
  return authFetch<AvailabilityResult>("/v1/auth/check-email", { email });
}
