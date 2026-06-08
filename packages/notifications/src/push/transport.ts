/**
 * Push device-token transport.
 *
 * Platform-agnostic wrappers around the server device-token endpoints. These
 * have no native dependencies, so they live in the shared package and are
 * reused by every MicBoxx mobile app. The native FCM glue (permission, token
 * retrieval, message handlers) lives in each app since it depends on native
 * modules and app-specific routing.
 *
 * Server contract (additive — the room_notification table stays the source of
 * truth, push is only a delivery channel):
 *   POST   /v1/devices/token   { device_id, platform, fcm_token, app_version? }
 *   DELETE /v1/devices/token   { device_id }
 * Both authenticate via the OAuth bearer token; the uid is inferred server-side.
 */

import { apiFetch } from "@micboxx/api";

export type PushPlatform = "ios" | "android";

export interface RegisterDeviceTokenInput {
  /** Stable per-install device identifier. */
  deviceId: string;
  /** Device platform. */
  platform: PushPlatform;
  /** Current FCM registration token. */
  fcmToken: string;
  /** Optional client app version, for diagnostics. */
  appVersion?: string | null;
}

/**
 * Registers (or rotates) the device's FCM token for the authenticated user.
 */
export async function registerDeviceToken(
  input: RegisterDeviceTokenInput,
  accessToken: string,
): Promise<void> {
  await apiFetch<unknown>("/v1/devices/token", {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      device_id: input.deviceId,
      platform: input.platform,
      fcm_token: input.fcmToken,
      ...(input.appVersion ? { app_version: input.appVersion } : null),
    }),
  });
}

/**
 * Unregisters the device for the authenticated user. Idempotent server-side.
 */
export async function unregisterDeviceToken(
  deviceId: string,
  accessToken: string,
): Promise<void> {
  await apiFetch<unknown>("/v1/devices/token", {
    method: "DELETE",
    accessToken,
    body: JSON.stringify({ device_id: deviceId }),
  });
}
