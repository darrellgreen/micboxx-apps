import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { NotificationItem } from "@micboxx/notifications";
import { tokens } from "@micboxx/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type NotificationIconMeta = {
  icon: IoniconName | "soundwave";
  color: string;
  backgroundColor: string;
};

export function formatRelativeDate(value: string | null): string {
  if (!value) {
    return "just now";
  }

  const target = new Date(value);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  const formatUnit = (count: number, unit: string) => {
    const absoluteCount = Math.abs(count);
    const pluralizedUnit = absoluteCount === 1 ? unit : `${unit}s`;

    if (count === 0) {
      return "just now";
    }

    return count > 0
      ? `in ${absoluteCount} ${pluralizedUnit}`
      : `${absoluteCount} ${pluralizedUnit} ago`;
  };

  if (Math.abs(diffMs) >= year) {
    return formatUnit(Math.round(diffMs / year), "year");
  }
  if (Math.abs(diffMs) >= month) {
    return formatUnit(Math.round(diffMs / month), "month");
  }
  if (Math.abs(diffMs) >= day) {
    return formatUnit(Math.round(diffMs / day), "day");
  }
  if (Math.abs(diffMs) >= hour) {
    return formatUnit(Math.round(diffMs / hour), "hour");
  }

  return formatUnit(Math.round(diffMs / minute), "minute");
}

export function getNotificationIconMeta(
  notification: NotificationItem,
): NotificationIconMeta {
  if (
    notification.source === "room" &&
    notification.roomType === "room-reward"
  ) {
    return {
      icon: "ribbon-outline",
      color: "#fde68a",
      backgroundColor: "rgba(252,211,77,0.15)",
    };
  }

  if (notification.type === "room") {
    return {
      icon: "soundwave",
      color: "#6ee7b7",
      backgroundColor: "rgba(52,211,153,0.15)",
    };
  }

  if (notification.type === "direct_message") {
    return {
      icon: "chatbubble-ellipses-outline",
      color: "#f0abfc",
      backgroundColor: "rgba(232,121,249,0.15)",
    };
  }

  if (notification.type === "follow") {
    return {
      icon: "person-add-outline",
      color: "#7dd3fc",
      backgroundColor: "rgba(56,189,248,0.15)",
    };
  }

  if (notification.type === "track_comment") {
    return {
      icon: "chatbubble-ellipses-outline",
      color: "#6ee7b7",
      backgroundColor: "rgba(52,211,153,0.15)",
    };
  }

  return {
    icon: "heart-outline",
    color: tokens.colors.accent,
    backgroundColor: tokens.colors.accentDim,
  };
}

export function normalizeNotificationPath(href: string | null): string | null {
  if (!href) {
    return null;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const parsed = new URL(href);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return null;
    }
  }

  return href.startsWith("/") ? href : `/${href.replace(/^\/+/, "")}`;
}

export function resolveNotificationRoute(
  notification: NotificationItem,
): string | null {
  const path = normalizeNotificationPath(notification.href);

  if (path) {
    if (path.startsWith("/room/")) {
      return path;
    }

    if (path.startsWith("/rooms/")) {
      return path.replace(/^\/rooms\//, "/room/");
    }

    if (path.startsWith("/messages/")) {
      return path;
    }

    if (path.startsWith("/tracks/")) {
      return path.replace(/^\/tracks\//, "/track/");
    }

    if (path.startsWith("/track/")) {
      return path;
    }

    if (path.startsWith("/albums/")) {
      return path.replace(/^\/albums\//, "/album/");
    }

    if (path.startsWith("/album/")) {
      return path;
    }

    if (path.startsWith("/users/")) {
      return path.replace(/^\/users\//, "/user/");
    }

    if (path.startsWith("/artist/")) {
      return path.replace(/^\/artist\//, "/user/");
    }

    if (path.startsWith("/user/")) {
      return path;
    }
  }

  if (notification.source === "room") {
    return null;
  }

  const socialNotification = notification.raw;

  if (
    socialNotification.type === "direct_message" &&
    socialNotification.conversationId
  ) {
    return `/messages/${socialNotification.conversationId}`;
  }

  if (
    socialNotification.type === "follow" &&
    socialNotification.actorUsername
  ) {
    return `/user/${encodeURIComponent(socialNotification.actorUsername)}`;
  }

  return null;
}
