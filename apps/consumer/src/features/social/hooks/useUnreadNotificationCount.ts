import { onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import { getNotificationsCollection } from "@/features/social/firestore";
import { useAppSelector } from "@/store/hooks";

export function useUnreadNotificationCount() {
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const firebaseConfigured = isFirebaseConfigured();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (
      !firebaseUid ||
      socialStatus !== "authenticated" ||
      !firebaseConfigured
    ) {
      setUnreadCount(0);
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
        setUnreadCount(snapshot.size);
      },
      () => undefined,
    );

    return unsubscribe;
  }, [firebaseConfigured, firebaseUid, socialStatus]);

  return unreadCount;
}
