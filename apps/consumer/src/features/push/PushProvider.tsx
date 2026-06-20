/**
 * PushProvider — wires FCM push into the consumer app lifecycle.
 *
 * Owns all register/unregister side effects. Registration is gated on the
 * user's per-device preference (via AccountPreferencesProvider) and serialized
 * through a queue so rapid preference changes always resolve to the correct
 * final backend state.
 *
 * Mount once, near the top of the tree, inside AuthProvider and
 * AccountPreferencesProvider.
 */

import { useCallback, useEffect, useRef } from "react";

import { ensureFreshSession } from "@/features/auth/api";
import { useAuth } from "@/features/auth/provider";
import { useAccountPreferences } from "@/features/account/provider";

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
  const { preferences, pushPreferenceReady } = useAccountPreferences();

  const pushAllowedRef = useRef(false);
  const prevAccessToken = useRef<string | null>(null);
  const registrationQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueRegistration = useCallback(
    (task: () => Promise<unknown>) => {
      registrationQueueRef.current = registrationQueueRef.current
        .then(async () => { await task(); })
        .catch(() => undefined);
    },
    [],
  );

  // Keep ref current so queued tasks see the latest allowed state when they execute.
  useEffect(() => {
    pushAllowedRef.current = pushPreferenceReady && preferences.pushNotifications;
  }, [pushPreferenceReady, preferences.pushNotifications]);

  // ── Reconciliation: register or unregister based on token + preference ────
  useEffect(() => {
    if (pushPlatform() === null) return;

    const previousToken = prevAccessToken.current;

    if (!accessToken) {
      if (previousToken) {
        enqueueRegistration(() => unregisterPush(previousToken));
      }
      prevAccessToken.current = null;
      return;
    }

    prevAccessToken.current = accessToken;

    if (!pushPreferenceReady) return;

    if (preferences.pushNotifications) {
      enqueueRegistration(async () => {
        if (!pushAllowedRef.current) return; // recheck at execution time
        await registerPushForSession(accessToken);
      });
    } else {
      // No guard: unregister always executes so a later queued register
      // correctly restores the final state on rapid ON→OFF→ON sequences.
      enqueueRegistration(() => unregisterPush(accessToken));
    }
  }, [accessToken, enqueueRegistration, preferences.pushNotifications, pushPreferenceReady]);

  // ── Token rotation — serialized through the same queue ────────────────────
  useEffect(() => {
    if (pushPlatform() === null) return;
    const unsubscribe = onFcmTokenRefresh((token) => {
      enqueueRegistration(async () => {
        if (!pushAllowedRef.current) return; // check before async work
        const fresh = await ensureFreshSession();
        if (!pushAllowedRef.current || !fresh?.accessToken) return; // recheck after await
        await reRegisterToken(token, fresh.accessToken);
      });
    });
    return unsubscribe;
  }, [enqueueRegistration]);

  // ── Foreground + opened-from-notification handling ─────────────────────────
  useEffect(() => {
    if (pushPlatform() === null) return;

    // Foreground: stay additive — do not auto-navigate or interrupt.
    const unsubscribeForeground = onForegroundMessage(() => undefined);

    // Background → opened by tap.
    const unsubscribeOpened = onNotificationOpened((message) => {
      navigateToPushTarget(targetUrlOf(message));
    });

    // Quit → cold-started by tap.
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
