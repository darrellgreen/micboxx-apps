import type { SocialNotification } from "@micboxx/contracts";
import type { RoomNotification } from "@micboxx/api";

export type NotificationItem =
  | {
      source: "social";
      id: string;
      createdAt: string | null;
      isRead: boolean;
      href: string | null;
      label: string;
      preview: string | null;
      type: SocialNotification["type"];
      raw: SocialNotification;
    }
  | {
      source: "room";
      id: string;
      numericId: number;
      createdAt: string | null;
      isRead: boolean;
      href: string | null;
      label: string;
      preview: null;
      type: "room";
      roomType: "room-general" | "room-reward";
    };

export type PushProviderType = "expo" | "fcm" | "apns";

export interface PushDeviceToken {
  type: PushProviderType;
  data: string;
}

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export interface PushRegistrationRequest {
  userUid: string;
  token: PushDeviceToken;
  deviceId?: string;
  platform?: "ios" | "android" | "web";
}

export interface NotificationRoutingPayload {
  targetScreen?: string;
  entityId?: string;
  entityType?: string;
  rawPayload?: Record<string, unknown>;
}

export interface SocialNotificationSourceAdapter {
  fetchRecent(limit: number): Promise<SocialNotification[]>;
  markAsRead(notificationId: string): Promise<void>;
}

export interface RoomNotificationSourceAdapter {
  fetchRecent(limit: number): Promise<RoomNotification[]>;
  markAsRead(notificationId: number): Promise<void>;
}

export interface NotificationAdapter {
  isSocialConfigured(): boolean;
  subscribeToSocialNotifications(
    userUid: string,
    maxItems: number,
    onData: (notifications: SocialNotification[]) => void,
    onError: (error: Error) => void
  ): () => void;
  subscribeToUnreadCount(
    userUid: string,
    onCount: (count: number) => void
  ): () => void;
  fetchRoomNotifications(params: {
    accessToken: string | null;
    maxItems: number;
  }): Promise<{ notifications: RoomNotification[] }>;
  fetchRoomUnreadCount(params: {
    accessToken: string | null;
  }): Promise<number>;
}
