import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SocialNotification } from "@micboxx/contracts";
import type { RoomNotification } from "@micboxx/api";
import { normalizeAndSortNotifications, getUnreadNotificationCount } from "./helpers";
import type { NotificationAdapter, NotificationItem } from "./types";

// Module-level cache so room notifications survive component unmount/remount.
// Keyed by accessToken so the cache is invalidated on account switch.
let roomNotificationsCache: { token: string; items: RoomNotification[] } | null = null;

export interface UseMicboxxNotificationsParams {
  maxItems?: number;
  firebaseUid: string | null;
  socialStatus: "idle" | "authenticating" | "authenticated" | "error";
  socialError: string | null;
  accessToken: string | null;
  hasDrupalSession: boolean;
  adapter: NotificationAdapter;
  onRetryAuth?: () => void;
}

export function useMicboxxNotifications({
  maxItems = 40,
  firebaseUid,
  socialStatus,
  socialError,
  accessToken,
  hasDrupalSession,
  adapter,
  onRetryAuth,
}: UseMicboxxNotificationsParams) {
  const [socialItems, setSocialItems] = useState<SocialNotification[]>([]);
  const cachedItems = accessToken && roomNotificationsCache?.token === accessToken
    ? roomNotificationsCache.items
    : [];
  const [roomItems, setRoomItems] = useState<RoomNotification[]>(cachedItems);
  const [socialLoading, setSocialLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const roomItemsRef = useRef<RoomNotification[]>(cachedItems);

  const firebaseConfigured = adapter.isSocialConfigured();
  const isReady = socialStatus === "authenticated" && Boolean(firebaseUid);

  const accessTokenRef = useRef(accessToken);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

  const authError = !firebaseConfigured
    ? "Firebase social is not configured for this build."
    : socialStatus === "error"
      ? (socialError ?? "Unable to authenticate Firebase social.")
      : null;

  useEffect(() => {
    if (
      !firebaseUid ||
      socialStatus !== "authenticated" ||
      !firebaseConfigured
    ) {
      setSocialItems([]);
      setSocialLoading(false);
      setError(null);
      return;
    }

    setSocialLoading(true);
    setError(null);

    const unsubscribe = adapter.subscribeToSocialNotifications(
      firebaseUid,
      maxItems,
      (notifications) => {
        setSocialItems(notifications);
        setSocialLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setSocialLoading(false);
      }
    );

    return unsubscribe;
  }, [firebaseConfigured, firebaseUid, maxItems, reloadNonce, socialStatus, adapter]);

  useEffect(() => {
    if (!hasDrupalSession) {
      setRoomItems([]);
      roomItemsRef.current = [];
      roomNotificationsCache = null;
      setRoomLoading(false);
      setRoomError(null);
      return;
    }

    let cancelled = false;

    const fetchRoomItems = async () => {
      // Only show a loading indicator when there are no cached items to display.
      if (roomItemsRef.current.length === 0) {
        setRoomLoading(true);
      }
      try {
        const response = await adapter.fetchRoomNotifications({
          maxItems,
          accessToken: accessTokenRef.current,
        });
        if (!cancelled) {
          roomNotificationsCache = {
            token: accessTokenRef.current ?? "",
            items: response.notifications,
          };
          roomItemsRef.current = response.notifications;
          setRoomItems(response.notifications);
          setRoomError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setRoomError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load Room notifications."
          );
        }
      } finally {
        if (!cancelled) {
          setRoomLoading(false);
        }
      }
    };

    void fetchRoomItems();

    return () => {
      cancelled = true;
    };
  }, [hasDrupalSession, maxItems, reloadNonce, adapter]);

  const items = useMemo<NotificationItem[]>(() => {
    return normalizeAndSortNotifications(socialItems, roomItems, maxItems);
  }, [maxItems, roomItems, socialItems]);

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(items),
    [items]
  );

  const retry = useCallback(() => {
    if (!firebaseConfigured) {
      return;
    }

    if (
      hasDrupalSession &&
      (socialStatus === "error" || socialStatus === "idle")
    ) {
      onRetryAuth?.();
      return;
    }

    if (firebaseUid && socialStatus === "authenticated") {
      setReloadNonce((current) => current + 1);
    }
  }, [
    firebaseConfigured,
    firebaseUid,
    hasDrupalSession,
    socialStatus,
    onRetryAuth,
  ]);

  return {
    items,
    loading: socialLoading || roomLoading || socialStatus === "authenticating",
    error: error ?? (items.length ? null : roomError) ?? authError,
    unreadCount,
    firebaseUid,
    isReady,
    canRetry: hasDrupalSession || (firebaseConfigured && isReady),
    retry,
    markRead: async (id: string) => {},
  };
}

export function useUnreadNotificationCount(items: NotificationItem[]) {
  return useMemo(() => getUnreadNotificationCount(items), [items]);
}

export interface UseMicboxxUnreadNotificationCountParams {
  firebaseUid: string | null;
  socialStatus: "idle" | "authenticating" | "authenticated" | "error";
  accessToken: string | null;
  adapter: NotificationAdapter;
}

export function useMicboxxUnreadNotificationCount({
  firebaseUid,
  socialStatus,
  accessToken,
  adapter,
}: UseMicboxxUnreadNotificationCountParams) {
  const firebaseConfigured = adapter.isSocialConfigured();
  const [socialUnreadCount, setSocialUnreadCount] = useState(0);
  const [roomUnreadCount, setRoomUnreadCount] = useState(0);

  useEffect(() => {
    if (
      !firebaseUid ||
      socialStatus !== "authenticated" ||
      !firebaseConfigured
    ) {
      setSocialUnreadCount(0);
      return;
    }

    const unsubscribe = adapter.subscribeToUnreadCount(
      firebaseUid,
      (count) => {
        setSocialUnreadCount(count);
      }
    );

    return unsubscribe;
  }, [firebaseConfigured, firebaseUid, socialStatus, adapter]);

  useEffect(() => {
    if (!accessToken) {
      setRoomUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchRoomUnreadCount = async () => {
      try {
        const count = await adapter.fetchRoomUnreadCount({ accessToken });
        if (!cancelled) {
          setRoomUnreadCount(count);
        }
      } catch {
        if (!cancelled) {
          setRoomUnreadCount(0);
        }
      }
    };

    void fetchRoomUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [accessToken, adapter]);

  return socialUnreadCount + roomUnreadCount;
}
