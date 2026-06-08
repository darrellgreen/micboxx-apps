/**
 * Background FCM message handler registration.
 *
 * Must be registered at module load, before the app renders, per the
 * @react-native-firebase/messaging contract. The server sends a display
 * notification block, so the OS renders background/quit notifications itself —
 * there is nothing to do here except satisfy the handler requirement. Tapping a
 * notification routes through onNotificationOpenedApp / getInitialNotification,
 * and notification truth is reconciled by the existing polling on app open.
 */

import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

let registered = false;

export function registerPushBackgroundHandler(): void {
  if (registered || Platform.OS === "web") {
    return;
  }
  registered = true;
  try {
    messaging().setBackgroundMessageHandler(async () => {
      // No-op: the OS displays the server-provided notification. State is
      // reconciled via GET /v1/rooms/notifications when the app is opened.
    });
  } catch {
    // FCM unavailable — push stays disabled, app continues normally.
  }
}
