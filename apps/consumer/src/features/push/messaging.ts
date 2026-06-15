/**
 * Native FCM bridge (consumer app).
 *
 * Thin wrappers over @react-native-firebase/messaging. Every call is guarded so
 * the module is a no-op on web and never throws into product code — push is an
 * additive enhancement and must never break the app if FCM is unavailable.
 */

import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getInitialNotification as getMessagingInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  type FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import type { PushPlatform } from "@micboxx/notifications";

export type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

function getMessagingInstance(): FirebaseMessagingTypes.Module {
  return getMessaging(getApp());
}

/**
 * Returns the FCM platform for this device, or null where push is unsupported.
 */
export function pushPlatform(): PushPlatform | null {
  if (Platform.OS === "ios") {
    return "ios";
  }
  if (Platform.OS === "android") {
    return "android";
  }
  return null;
}

/**
 * Requests notification permission. Returns true when granted (or provisional).
 */
export async function requestPushPermission(): Promise<boolean> {
  if (pushPlatform() === null) {
    return false;
  }
  try {
    const status = await requestPermission(getMessagingInstance());
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/**
 * Retrieves the current FCM registration token, or null on failure.
 */
export async function getFcmToken(): Promise<string | null> {
  if (pushPlatform() === null) {
    return null;
  }
  try {
    const token = await getToken(getMessagingInstance());
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to token-rotation events. Returns an unsubscribe function.
 */
export function onFcmTokenRefresh(cb: (token: string) => void): () => void {
  if (pushPlatform() === null) {
    return () => undefined;
  }
  try {
    return onTokenRefresh(getMessagingInstance(), cb);
  } catch {
    return () => undefined;
  }
}

/**
 * Subscribes to foreground messages. Returns an unsubscribe function.
 */
export function onForegroundMessage(
  cb: (message: RemoteMessage) => void,
): () => void {
  if (pushPlatform() === null) {
    return () => undefined;
  }
  try {
    return onMessage(getMessagingInstance(), async (message) => cb(message));
  } catch {
    return () => undefined;
  }
}

/**
 * Subscribes to taps that open the app from the background. Returns unsubscribe.
 */
export function onNotificationOpened(
  cb: (message: RemoteMessage) => void,
): () => void {
  if (pushPlatform() === null) {
    return () => undefined;
  }
  try {
    return onNotificationOpenedApp(getMessagingInstance(), (message) => {
      if (message) {
        cb(message);
      }
    });
  } catch {
    return () => undefined;
  }
}

/**
 * Returns the notification that cold-started the app from a quit state, if any.
 */
export async function getInitialNotification(): Promise<RemoteMessage | null> {
  if (pushPlatform() === null) {
    return null;
  }
  try {
    return await getMessagingInitialNotification(getMessagingInstance());
  } catch {
    return null;
  }
}
