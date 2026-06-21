import { useCallback } from "react";

import {
    retrySocialAuth,
    type SocialRecoveryStatus,
} from "@/features/social/social-auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface UseSocialAuthRetryResult {
  /** Trigger the single centralized recovery workflow. Safe to tap rapidly —
   *  duplicate taps collapse into one in-flight operation. */
  retry: () => void;
  /** Centralized recovery status for rendering meaningful UI. */
  recovery: SocialRecoveryStatus;
  /** True while a refresh/retry operation is in flight. */
  isRetrying: boolean;
  /** Session must be re-established by signing in again. */
  sessionExpired: boolean;
  /** Transient connection failure — retry remains available. */
  transientError: boolean;
  /** Authenticated but forbidden — not recoverable by retrying. */
  permissionDenied: boolean;
}

/**
 * The single entry point feature surfaces use to recover a failed social
 * session. Wraps the `retrySocialAuth` thunk so no component dispatches
 * `authenticateFirebaseSocial` directly; SocialAuthGate remains the automatic
 * authentication owner.
 */
export function useSocialAuthRetry(): UseSocialAuthRetryResult {
  const dispatch = useAppDispatch();
  const recovery = useAppSelector((state) => state.socialAuth.recovery);
  const retryInFlight = useAppSelector(
    (state) => state.socialAuth.retryInFlight,
  );

  const retry = useCallback(() => {
    void dispatch(retrySocialAuth());
  }, [dispatch]);

  return {
    retry,
    recovery,
    isRetrying:
      retryInFlight ||
      recovery === "refreshing_session" ||
      recovery === "retrying_social_auth",
    sessionExpired: recovery === "session_expired",
    transientError: recovery === "transient_error",
    permissionDenied: recovery === "permission_denied",
  };
}
