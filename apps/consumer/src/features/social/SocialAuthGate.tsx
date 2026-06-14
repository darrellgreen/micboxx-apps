import { useEffect } from "react";

import { hasFirebaseConfig } from "@/config/env";
import { useAuth } from "@/features/auth/provider";
import {
    authenticateFirebaseSocial,
    setFirebaseUid,
    signOutFirebaseSocial,
    subscribeToFirebaseAuthState,
} from "@/features/social/social-auth-slice";
import { useAppDispatch } from "@/store/hooks";

export function SocialAuthGate() {
  const { session } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseAuthState((uid) => {
      dispatch(setFirebaseUid(uid));
    });

    return unsubscribe;
  }, [dispatch]);

  const hasSession = Boolean(session?.accessToken);

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      dispatch(setFirebaseUid(null));
      return;
    }

    if (hasSession) {
      void dispatch(authenticateFirebaseSocial());
      return;
    }

    void dispatch(signOutFirebaseSocial());
  }, [dispatch, hasSession]);

  return null;
}
