import type { SocialNotification } from "@micboxx/contracts";
import { isRoomRewardNotification, type RoomNotification } from "@micboxx/api";
import type { NotificationItem } from "./types";

export function describeSocialNotification(notification: SocialNotification): string {
  const actor =
    notification.actorDisplayName ?? notification.actorUsername ?? "Someone";

  if (notification.type === "follow") {
    return `${actor} followed you`;
  }

  if (notification.type === "direct_message") {
    return `${actor} sent you a message`;
  }

  if (notification.type === "track_comment") {
    if (notification.trackTitle) {
      return `${actor} commented on your track ${notification.trackTitle}`;
    }

    return `${actor} commented on your track`;
  }

  if (notification.trackTitle) {
    return `${actor} liked your track ${notification.trackTitle}`;
  }

  return `${actor} liked your track`;
}

export function getSocialNotificationPreview(
  notification: SocialNotification,
): string | null {
  return notification.messagePreview ?? notification.commentPreview ?? null;
}

export function normalizeAndSortNotifications(
  socialItems: SocialNotification[],
  roomItems: RoomNotification[],
  maxItems: number = 40
): NotificationItem[] {
  const mappedSocialItems: NotificationItem[] = socialItems.map(
    (notification) => ({
      source: "social",
      id: notification.id,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
      href: notification.href,
      label: describeSocialNotification(notification),
      preview: getSocialNotificationPreview(notification),
      type: notification.type,
      raw: notification,
    }),
  );
  
  const mappedRoomItems: NotificationItem[] = roomItems.map(
    (notification) => ({
      source: "room",
      id: `room-${notification.notification_id}`,
      numericId: notification.notification_id,
      createdAt: notification.created
        ? new Date(notification.created * 1000).toISOString()
        : null,
      isRead:
        Boolean(notification.read_at) ||
        notification.delivery_state === "read",
      href: notification.target_url,
      label: `${notification.title}. ${notification.body}`,
      preview: null,
      type: "room",
      roomType: isRoomRewardNotification(notification)
        ? "room-reward"
        : "room-general",
    }),
  );

  return [...mappedSocialItems, ...mappedRoomItems]
    .sort((left, right) => {
      const leftTime = left.createdAt
        ? new Date(left.createdAt).getTime()
        : 0;
      const rightTime = right.createdAt
        ? new Date(right.createdAt).getTime()
        : 0;
      return rightTime - leftTime;
    })
    .slice(0, maxItems);
}

export function getUnreadNotificationCount(items: Array<{ isRead: boolean }>): number {
  return items.filter((notification) => !notification.isRead).length;
}
