import { useAppSelector } from "@/store/hooks";
import { useMicboxxUnreadNotificationCount } from "@micboxx/notifications";
import { FirebaseNotificationAdapter } from "../FirebaseNotificationAdapter";

export function useUnreadNotificationCount() {
  const firebaseUid = useAppSelector((state) => state.socialAuth.firebaseUid);
  const socialStatus = useAppSelector((state) => state.socialAuth.status);
  const accessToken = useAppSelector(
    (state) => state.auth.session?.accessToken ?? null,
  );

  return useMicboxxUnreadNotificationCount({
    firebaseUid,
    socialStatus,
    accessToken,
    adapter: FirebaseNotificationAdapter,
  });
}
