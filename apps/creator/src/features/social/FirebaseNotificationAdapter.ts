import { limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import type { NotificationAdapter } from "@micboxx/notifications";
import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import {
  getNotificationsCollection,
  readSocialNotification,
} from "./firestore";
import { getRoomNotifications } from "@micboxx/api";

export const FirebaseNotificationAdapter: NotificationAdapter = {
  isSocialConfigured() {
    return isFirebaseConfigured();
  },

  subscribeToSocialNotifications(userUid, maxItems, onData, onError) {
    const db = getFirebaseClientDb();
    const notificationsQuery = query(
      getNotificationsCollection(db),
      where("userUid", "==", userUid),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = snapshot.docs.map((doc) =>
          readSocialNotification(doc.id, doc.data())
        );
        onData(notifications);
      },
      (error) => {
        onError(error);
      }
    );

    return unsubscribe;
  },

  async fetchRoomNotifications({ accessToken, maxItems }) {
    if (!accessToken) {
      return { notifications: [] };
    }
    const response = await getRoomNotifications({
      limit: maxItems,
      accessToken,
    });
    return response;
  },

  subscribeToUnreadCount(userUid, onCount) {
    const db = getFirebaseClientDb();
    const unreadQuery = query(
      getNotificationsCollection(db),
      where("userUid", "==", userUid),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        onCount(snapshot.size);
      },
      () => undefined
    );

    return unsubscribe;
  },

  async fetchRoomUnreadCount({ accessToken }) {
    if (!accessToken) {
      return 0;
    }
    const response = await getRoomNotifications({
      limit: 40,
      accessToken,
    });
    const unread =
      typeof response.meta?.unread === "number"
        ? response.meta.unread
        : response.notifications.filter(
            (notification) =>
              !notification.read_at &&
              notification.delivery_state !== "read"
          ).length;
    return unread;
  },
};
