/**
 * Push registration orchestration (consumer app).
 *
 * Glues the native FCM bridge to the shared device-token transport. Each
 * function is best-effort: failures are swallowed by callers because push is an
 * additive layer and must never block sign-in or sign-out.
 */

import Constants from "expo-constants";

import { registerDeviceToken, unregisterDeviceToken } from "@micboxx/notifications";

import { getStableDeviceId, peekDeviceId } from "./device-id";
import { getFcmToken, pushPlatform, requestPushPermission } from "./messaging";

function appVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/**
 * Requests permission, retrieves the FCM token, and registers it for the
 * authenticated session.
 *
 * @returns the registered token, or null if push could not be set up.
 */
export async function registerPushForSession(
  accessToken: string,
): Promise<string | null> {
  const platform = pushPlatform();
  if (!platform || !accessToken) {
    return null;
  }

  const granted = await requestPushPermission();
  if (!granted) {
    return null;
  }

  const token = await getFcmToken();
  if (!token) {
    return null;
  }

  const deviceId = await getStableDeviceId();
  await registerDeviceToken(
    { deviceId, platform, fcmToken: token, appVersion: appVersion() },
    accessToken,
  );
  return token;
}

/**
 * Re-registers a rotated token against the current session.
 */
export async function reRegisterToken(
  fcmToken: string,
  accessToken: string,
): Promise<void> {
  const platform = pushPlatform();
  if (!platform || !accessToken || !fcmToken) {
    return;
  }
  const deviceId = await getStableDeviceId();
  await registerDeviceToken(
    { deviceId, platform, fcmToken, appVersion: appVersion() },
    accessToken,
  );
}

/**
 * Unregisters this device. Uses the existing device id only (never generates).
 */
export async function unregisterPush(accessToken: string): Promise<void> {
  if (!accessToken) {
    return;
  }
  const deviceId = await peekDeviceId();
  if (!deviceId) {
    return;
  }
  await unregisterDeviceToken(deviceId, accessToken);
}
