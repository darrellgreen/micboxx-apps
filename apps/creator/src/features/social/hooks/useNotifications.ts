import { limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type { SocialNotification } from "@micboxx/contracts";
import { getUnreadNotificationCount } from "@micboxx/notifications";
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
  const hasDrupalSession = useAppSelector((state) =>
    Boolean(state.auth.session?.accessToken),
  );
  const [items, setItems] = useState<SocialNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const fixtureMode = false;
  const firebaseConfigured = isFirebaseConfigured();
  const isReady = socialStatus === "authenticated" && Boolean(firebaseUid);

  const authError = fixtureMode
    ? null
    : !firebaseConfigured
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
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const db = getFirebaseClientDb();
    setLoading(true);
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
        setItems(
          snapshot.docs.map((documentSnapshot) =>
            readSocialNotification(
              documentSnapshot.id,
              documentSnapshot.data(),
            ),
          ),
        );
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [firebaseConfigured, firebaseUid, maxItems, reloadNonce, socialStatus]);

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
    loading: fixtureMode ? false : loading || socialStatus === "authenticating",
    error: fixtureMode ? null : error ?? authError,
    unreadCount,
    firebaseUid,
    isReady: fixtureMode ? true : isReady,
    canRetry: fixtureMode || (firebaseConfigured && (hasDrupalSession || isReady)),
    retry,
  };
}
