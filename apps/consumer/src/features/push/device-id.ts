/**
 * Stable per-install device identifier.
 *
 * FCM tokens rotate; the device_id does not. We persist a random UUID in the
 * secure store on first use and reuse it for the lifetime of the install so the
 * server can key one row per (uid, device) and rotate tokens safely.
 */

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "micboxx.push.device_id";

let cached: string | null = null;

/**
 * Returns the stable device id, generating and persisting one if needed.
 */
export async function getStableDeviceId(): Promise<string> {
  if (cached) {
    return cached;
  }

  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  cached = id;
  return id;
}

/**
 * Returns the device id only if one already exists (never generates).
 *
 * Used on sign-out, where generating a fresh id would be pointless.
 */
export async function peekDeviceId(): Promise<string | null> {
  if (cached) {
    return cached;
  }
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  cached = existing;
  return existing;
}
