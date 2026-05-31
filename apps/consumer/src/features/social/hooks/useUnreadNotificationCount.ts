import { onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import { getRoomNotifications } from "@micboxx/api";
import { getNotificationsCollection } from "@/features/social/firestore";
import { useAppSelector } from "@/store/hooks";

export function useUnreadNotificationCount() {
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const accessToken = useAppSelector(
    (state) => state.auth.session?.accessToken ?? null,
  );
  const firebaseConfigured = isFirebaseConfigured();
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

    const unreadQuery = query(
      getNotificationsCollection(getFirebaseClientDb()),
      where("userUid", "==", firebaseUid),
      where("isRead", "==", false),
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        setSocialUnreadCount(snapshot.size);
      },
      () => undefined,
    );

    return unsubscribe;
  }, [firebaseConfigured, firebaseUid, socialStatus]);

  useEffect(() => {
    if (!accessToken) {
      setRoomUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchRoomUnreadCount = async () => {
      try {
        const response = await getRoomNotifications({
          limit: 40,
          accessToken,
        });
        if (!cancelled) {
          const unread =
            typeof response.meta?.unread === "number"
              ? response.meta.unread
              : response.notifications.filter(
                  (notification) =>
                    !notification.read_at &&
                    notification.delivery_state !== "read",
                ).length;
          setRoomUnreadCount(unread);
        }
      } catch {
        if (!cancelled) {
          setRoomUnreadCount(0);
        }
      }
    };

    void fetchRoomUnreadCount();
    const intervalId = setInterval(() => {
      void fetchRoomUnreadCount();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [accessToken]);

  return socialUnreadCount + roomUnreadCount;
}
