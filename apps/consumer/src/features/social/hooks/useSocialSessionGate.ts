import { useCallback, useState } from "react";

import { isFirebaseConfigured } from "@/config/firebase";
import { useAuth } from "@/features/auth/provider";
import { authenticateFirebaseSocial } from "@/features/social/social-auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface RequireSocialSessionOptions {
  requireOwner?: boolean;
  missingContextMessage?: string;
  missingOwnerMessage?: string;
}

interface UseSocialSessionGateInput {
  hasContext: boolean;
  ownerUid?: string | null;
}

export function useSocialSessionGate({
  hasContext,
  ownerUid = null,
}: UseSocialSessionGateInput) {
  const dispatch = useAppDispatch();
  const { session, signIn } = useAuth();
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const socialError = useAppSelector((state) => state.socialAuth.error);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();
  const viewerUid = session?.user.uuid ?? null;
  const socialReady =
    configured &&
    socialStatus === "authenticated" &&
    Boolean(viewerUid && firebaseUid === viewerUid);
  const authPending = Boolean(session && viewerUid && !socialReady);

  // Authentication is owned solely by SocialAuthGate. This gate only consumes
  // social-auth state and reports readiness; it never auto-initiates
  // authentication. `requireSocialSession` may still trigger one explicit,
  // user-initiated attempt below.

  const clearInteractionError = useCallback(() => {
    setInteractionError(null);
  }, []);

  const requireSocialSession = useCallback(
    async ({
      requireOwner = false,
      missingContextMessage = "This item cannot be updated right now.",
      missingOwnerMessage = "This item cannot be updated right now.",
    }: RequireSocialSessionOptions = {}) => {
      setInteractionError(null);

      if (!configured) {
        setInteractionError("Social features are not configured for this build.");
        return false;
      }

      if (!hasContext) {
        setInteractionError(missingContextMessage);
        return false;
      }

      if (!session) {
        await signIn();
        return false;
      }

      if (requireOwner && !ownerUid) {
        setInteractionError(missingOwnerMessage);
        return false;
      }

      if (!socialReady) {
        if (
          session.accessToken &&
          (socialStatus === "idle" || socialStatus === "error")
        ) {
          await dispatch(authenticateFirebaseSocial());
        }

        setInteractionError(
          socialError ?? "Social features are still connecting. Try again in a moment.",
        );
        return false;
      }

      return true;
    },
    [
      configured,
      dispatch,
      hasContext,
      ownerUid,
      session,
      signIn,
      socialError,
      socialReady,
      socialStatus,
    ],
  );

  return {
    configured,
    session,
    viewerUid,
    socialReady,
    authPending,
    interactionError,
    setInteractionError,
    clearInteractionError,
    requireSocialSession,
    signIn,
  };
}
