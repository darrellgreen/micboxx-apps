/**
 * PushProvider — wires FCM push into the consumer app lifecycle.
 *
 * Additive and progressive: it registers/unregisters device tokens around the
 * auth lifecycle and routes notification taps to the right screen. It never
 * removes or replaces the existing polling — GET /v1/rooms/notifications and the
 * Firestore social listeners remain the source of notification truth. A push
 * only nudges the user back into the app; the app then refreshes as it always
 * has.
 *
 * Mount once, near the top of the tree, inside AuthProvider.
 */

import { useEffect, useRef } from "react";

import { ensureFreshSession } from "@/features/auth/api";
import { useAuth } from "@/features/auth/provider";

import { navigateToPushTarget } from "./deep-link";
import {
  getInitialNotification,
  onFcmTokenRefresh,
  onForegroundMessage,
  onNotificationOpened,
  pushPlatform,
  type RemoteMessage,
} from "./messaging";
import {
  reRegisterToken,
  registerPushForSession,
  unregisterPush,
} from "./register";

function targetUrlOf(message: RemoteMessage | null | undefined): string | undefined {
  const value = message?.data?.target_url;
  return typeof value === "string" ? value : undefined;
}

export function PushProvider(): null {
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? null;

  // Tracks the previous access token so we can detect login/logout edges and
  // unregister with the still-valid token at sign-out.
  const prevAccessToken = useRef<string | null>(null);

  // ── Register on login, unregister on logout ────────────────────────────────
  useEffect(() => {
    if (pushPlatform() === null) {
      return;
    }

    const previous = prevAccessToken.current;

    if (accessToken && !previous) {
      // Logged in: request permission + register this device's token.
      void registerPushForSession(accessToken).catch(() => undefined);
    } else if (!accessToken && previous) {
      // Logged out: best-effort unregister with the token we still hold.
      void unregisterPush(previous).catch(() => undefined);
    }

    prevAccessToken.current = accessToken;
  }, [accessToken]);

  // ── Token rotation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (pushPlatform() === null) {
      return;
    }
    const unsubscribe = onFcmTokenRefresh((token) => {
      // Resolve a fresh access token rather than closing over a stale session.
      void ensureFreshSession()
        .then((fresh) => {
          if (fresh?.accessToken) {
            return reRegisterToken(token, fresh.accessToken);
          }
          return undefined;
        })
        .catch(() => undefined);
    });
    return unsubscribe;
  }, []);

  // ── Foreground + opened-from-notification handling ─────────────────────────
  useEffect(() => {
    if (pushPlatform() === null) {
      return;
    }

    // Foreground: stay additive. We do NOT auto-navigate or interrupt — the
    // user's existing in-app polling already surfaces the notification. (No
    // local notification is shown to avoid double-notifying.)
    const unsubscribeForeground = onForegroundMessage(() => undefined);

    // Background -> opened by tap.
    const unsubscribeOpened = onNotificationOpened((message) => {
      navigateToPushTarget(targetUrlOf(message));
    });

    // Quit -> cold-started by tap.
    void getInitialNotification().then((message) => {
      navigateToPushTarget(targetUrlOf(message));
    });

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, []);

  return null;
}
