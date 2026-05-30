import { useInbox } from "@/features/social/hooks/useInbox";

export function useUnreadCount() {
  const { totalUnread, loading, isReady } = useInbox(40);
  return {
    unreadCount: totalUnread,
    loading,
    isReady,
  };
}
