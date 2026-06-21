import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type { DirectConversation, DirectMessage } from "@micboxx/contracts";
import { markConversationRead } from "@/features/social/dm-service";
import {
    getConversationMessagesCollection,
    getConversationRef,
    readDirectConversation,
    readDirectMessage,
} from "@/features/social/firestore";
import { retrySocialAuth } from "@/features/social/social-auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useConversation(conversationId: string | null) {
  const dispatch = useAppDispatch();
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialError = useAppSelector((state) => state.socialAuth.error);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const hasDrupalSession = useAppSelector((state) =>
    Boolean(state.auth.session?.accessToken),
  );
  const [conversation, setConversation] = useState<DirectConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<DirectMessage[]>([]);
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
      !conversationId ||
      !firebaseUid ||
      socialStatus !== "authenticated" ||
      !firebaseConfigured
    ) {
      setConversation(null);
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    const db = getFirebaseClientDb();
    setLoading(true);
    setError(null);

    const unsubscribeConversation = onSnapshot(
      getConversationRef(db, conversationId),
      (snapshot) => {
        setConversation(
          snapshot.exists()
            ? readDirectConversation(snapshot.id, snapshot.data())
            : null,
        );
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );

    const messagesQuery = query(
      getConversationMessagesCollection(db, conversationId),
      orderBy("createdAt", "asc"),
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((doc) =>
            readDirectMessage(doc.id, conversationId, doc.data()),
          ),
        );
        setLoading(false);
        void markConversationRead(firebaseUid, conversationId);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [
    conversationId,
    firebaseConfigured,
    firebaseUid,
    reloadNonce,
    socialStatus,
  ]);

  const retry = useCallback(() => {
    if (!firebaseConfigured) {
      return;
    }

    if (
      hasDrupalSession &&
      (socialStatus === "error" || socialStatus === "idle")
    ) {
      // Centralized recovery (refresh-then-authenticate). Never dispatches
      // authentication directly — SocialAuthGate remains the owner.
      void dispatch(retrySocialAuth());
      return;
    }

    if (conversationId && firebaseUid && socialStatus === "authenticated") {
      setReloadNonce((current) => current + 1);
    }
  }, [
    conversationId,
    dispatch,
    firebaseConfigured,
    firebaseUid,
    hasDrupalSession,
    socialStatus,
  ]);

  return {
    conversation,
    messages,
    loading: loading || socialStatus === "authenticating",
    error: error ?? authError,
    firebaseUid,
    isReady,
    canRetry:
      firebaseConfigured &&
      (hasDrupalSession || (Boolean(conversationId) && isReady)),
    retry,
  };
}
