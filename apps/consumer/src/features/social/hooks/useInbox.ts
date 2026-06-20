import { limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type { UserConversationInboxItem } from "@micboxx/contracts";
import {
    getUserConversationItemsCollection,
    readUserConversationInboxItem,
} from "@/features/social/firestore";
import { authenticateFirebaseSocial } from "@/features/social/social-auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useInbox(maxItems = 40) {
  const dispatch = useAppDispatch();
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialError = useAppSelector((state) => state.socialAuth.error);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const hasDrupalSession = useAppSelector((state) =>
    Boolean(state.auth.session?.accessToken),
  );
  const [items, setItems] = useState<UserConversationInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const firebaseConfigured = isFirebaseConfigured();
  const isReady = socialStatus === "authenticated" && Boolean(firebaseUid);

  const authError = !firebaseConfigured
    ? "Firebase messaging is not configured for this build."
    : socialStatus === "error"
      ? (socialError ?? "Unable to authenticate Firebase social.")
      : null;

  // Authentication is owned solely by SocialAuthGate. This hook only consumes
  // social-auth state; it never auto-initiates authentication. The `retry`
  // callback below remains for explicit, user-initiated recovery.

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

    const inboxQuery = query(
      getUserConversationItemsCollection(db, firebaseUid),
      orderBy("updatedAt", "desc"),
      limit(maxItems),
    );

    const unsubscribe = onSnapshot(
      inboxQuery,
      (snapshot) => {
        setItems(
          snapshot.docs.map((doc) =>
            readUserConversationInboxItem(doc.id, doc.data()),
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

  const totalUnread = useMemo(
    () =>
      items.reduce((sum, item) => sum + Math.max(0, item.unreadCount ?? 0), 0),
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
    loading: loading || socialStatus === "authenticating",
    error: error ?? authError,
    totalUnread,
    firebaseUid,
    isReady,
    canRetry: firebaseConfigured && (hasDrupalSession || isReady),
    retry,
  };
}
