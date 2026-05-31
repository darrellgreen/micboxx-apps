import { limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type { SocialNotification } from "@micboxx/contracts";
import {
  getRoomNotifications,
  type RoomNotification,
} from "@micboxx/api";
import {
  type NotificationItem,
  normalizeAndSortNotifications,
  getUnreadNotificationCount,
} from "@micboxx/notifications";
import {
    getNotificationsCollection,
    readSocialNotification,
} from "@/features/social/firestore";
import { authenticateFirebaseSocial } from "@/features/social/social-auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useNotifications(maxItems = 40) {
  const dispatch = useAppDispatch();
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialError = useAppSelector((state) => state.socialAuth.error);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const accessToken = useAppSelector(
    (state) => state.auth.session?.accessToken ?? null,
  );
  const hasDrupalSession = Boolean(accessToken);
  const [socialItems, setSocialItems] = useState<SocialNotification[]>([]);
  const [roomItems, setRoomItems] = useState<RoomNotification[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const firebaseConfigured = isFirebaseConfigured();
  const isReady = socialStatus === "authenticated" && Boolean(firebaseUid);

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

    const db = getFirebaseClientDb();
    setSocialLoading(true);
    setError(null);

    const notificationsQuery = query(
      getNotificationsCollection(db),
      where("userUid", "==", firebaseUid),
      orderBy("createdAt", "desc"),
      limit(maxItems),
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setSocialItems(
          snapshot.docs.map((documentSnapshot) =>
            readSocialNotification(
              documentSnapshot.id,
              documentSnapshot.data(),
            ),
          ),
        );
        setSocialLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setSocialLoading(false);
      },
    );

    return unsubscribe;
  }, [firebaseConfigured, firebaseUid, maxItems, reloadNonce, socialStatus]);

  useEffect(() => {
    if (!accessToken) {
      setRoomItems([]);
      setRoomLoading(false);
      setRoomError(null);
      return;
    }

    let cancelled = false;

    const fetchRoomItems = async () => {
      setRoomLoading((current) => current || roomItems.length === 0);
      try {
        const response = await getRoomNotifications({
          limit: maxItems,
          accessToken,
        });
        if (!cancelled) {
          setRoomItems(response.notifications);
          setRoomError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setRoomError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load Room notifications.",
          );
        }
      } finally {
        if (!cancelled) {
          setRoomLoading(false);
        }
      }
    };

    void fetchRoomItems();
    const intervalId = setInterval(() => {
      void fetchRoomItems();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [accessToken, maxItems, reloadNonce, roomItems.length]);

  const items = useMemo<NotificationItem[]>(() => {
    return normalizeAndSortNotifications(socialItems, roomItems, maxItems);
  }, [maxItems, roomItems, socialItems]);

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(items),
    [items],
  );

  const retry = useCallback(() => {
    if (!firebaseConfigured) {
      return;
    }

    if (
      hasDrupalSession &&
      (socialStatus === "error" || socialStatus === "idle")
    ) {
      void dispatch(authenticateFirebaseSocial());
      return;
    }

    if (firebaseUid && socialStatus === "authenticated") {
      setReloadNonce((current) => current + 1);
    }
  }, [
    dispatch,
    firebaseConfigured,
    firebaseUid,
    hasDrupalSession,
    socialStatus,
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
  };
}
