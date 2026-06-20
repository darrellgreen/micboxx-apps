import { useEffect } from "react";

import { hasFirebaseConfig } from "@/config/env";
import {
    authenticateFirebaseSocial,
    resetSocialAuth,
    setFirebaseUid,
    signOutFirebaseSocial,
    subscribeToFirebaseAuthState,
} from "@/features/social/social-auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * SocialAuthGate is the SOLE owner of Firebase social authentication. Feature
 * hooks (useInbox, useConversation, useNotifications, useSocialSessionGate)
 * only consume the resulting state — they must never auto-initiate
 * authentication, or a single expired session multiplies into a request storm.
 *
 * The effect keys on the access-token VALUE (not just presence) so a token
 * rotation triggers a single reset + re-attempt. A terminal 401/403 leaves the
 * token fingerprinted in state, and because the token value has not changed,
 * this effect does not re-run — so there is no retry loop.
 */
export function SocialAuthGate() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(
    (state) => state.auth.session?.accessToken ?? null,
  );

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseAuthState((uid) => {
      dispatch(setFirebaseUid(uid));
    });

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      dispatch(setFirebaseUid(null));
      return;
    }

    if (accessToken) {
      // New or rotated token: clear any prior terminal-failure guard, then
      // make exactly one attempt for this token value.
      dispatch(resetSocialAuth());
      void dispatch(authenticateFirebaseSocial());
      return;
    }

    void dispatch(signOutFirebaseSocial());
  }, [dispatch, accessToken]);

  return null;
}
