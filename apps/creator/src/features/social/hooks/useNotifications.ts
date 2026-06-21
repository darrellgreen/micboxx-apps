import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { retrySocialAuth } from "@/features/social/social-auth-slice";
import { useMicboxxNotifications } from "@micboxx/notifications";
import { FirebaseNotificationAdapter } from "../FirebaseNotificationAdapter";
import { useCallback } from "react";

export function useNotifications(maxItems = 40) {
  const dispatch = useAppDispatch();
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const socialError = useAppSelector((state) => state.socialAuth.error);
  const accessToken = useAppSelector(
    (state) => state.auth.session?.accessToken ?? null,
  );
  const hasDrupalSession = Boolean(accessToken);

  const handleRetryAuth = useCallback(() => {
    // Centralized recovery — never dispatches authentication directly.
    void dispatch(retrySocialAuth());
  }, [dispatch]);

  return useMicboxxNotifications({
    maxItems,
    firebaseUid,
    socialStatus,
    socialError,
    accessToken,
    hasDrupalSession,
    adapter: FirebaseNotificationAdapter,
    onRetryAuth: handleRetryAuth,
  });
}
