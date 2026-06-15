import { Ionicons } from "@expo/vector-icons";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getFirebaseClientDb } from "@/config/firebase";
import { useNotifications } from "@/features/social/hooks/useNotifications";
import { markRoomNotificationRead } from "@micboxx/api";
import type { NotificationItem } from "@micboxx/notifications";
import { tokens } from "@micboxx/theme";
import { SoundwaveTabIcon } from "@/components/icons/SoundwaveTabIcon";

import { NotificationStateCard } from "./NotificationStateCard";
import { NotificationsFeedSkeleton } from "./NotificationsFeedSkeleton";
import {
  formatRelativeDate,
  getNotificationIconMeta,
  resolveNotificationRoute,
} from "../utils/notificationHelpers";

interface NotificationsFeedPanelProps {
  onOpenRoute: (href: string) => void;
}

export function NotificationsFeedPanel({
  onOpenRoute,
}: NotificationsFeedPanelProps) {
  const { items, loading, error, isReady, canRetry, retry } =
    useNotifications(40);
  const showLoadingSkeleton = loading && items.length === 0;
  const showRetryState = Boolean(error && items.length === 0);
  const showInlineRetry = Boolean(error && items.length > 0);

  const statusText = useMemo(() => {
    if (showLoadingSkeleton) {
      return "Connecting to your activity feed...";
    }

    if (showRetryState) {
      return "Live updates are paused until the connection recovers.";
    }

    if (!isReady && !error) {
      return "Connecting to your activity feed...";
    }

    return null;
  }, [showLoadingSkeleton, showRetryState, isReady, error]);

  const showSimpleEmptyState = useMemo(
    () =>
      !showLoadingSkeleton &&
      !showRetryState &&
      !showInlineRetry &&
      items.length === 0,
    [showLoadingSkeleton, showRetryState, showInlineRetry, items.length],
  );

  const markRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      return;
    }

    if (notification.source === "room") {
      await markRoomNotificationRead({
        notificationId: notification.numericId,
      });
      return;
    }

    if (!isReady) {
      return;
    }

    await updateDoc(
      doc(getFirebaseClientDb(), "notifications", notification.id),
      {
        isRead: true,
        readAt: serverTimestamp(),
        seenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    );
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    const route = resolveNotificationRoute(notification);
    if (!route) {
      return;
    }

    if (!notification.isRead) {
      void markRead(notification);
    }

    onOpenRoute(route);
  };

  if (showSimpleEmptyState) {
    return (
      <View style={styles.notifEmptyGate}>
        <View style={styles.notifEmptyIconWrap}>
          <Ionicons
            name="notifications-outline"
            size={44}
            color={tokens.colors.accent}
          />
        </View>
        <Text style={styles.notifEmptyTitle}>No notifications yet</Text>
        <Text style={styles.notifEmptyBody}>
          When someone follows you, comments, or sends a message, it will show
          up here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.notificationFeed}>
      {statusText ? (
        <Text style={styles.preferenceStatus}>{statusText}</Text>
      ) : null}

      {showInlineRetry ? (
        <View style={styles.notificationInlineBanner}>
          <View style={styles.notificationInlineBannerCopy}>
            <Text style={styles.notificationInlineBannerTitle}>
              Live updates paused
            </Text>
            <Text style={styles.notificationInlineBannerText}>{error}</Text>
          </View>
          {canRetry ? (
            <Pressable
              onPress={retry}
              style={({ pressed }: { pressed: boolean }) => [
                styles.notificationInlineBannerButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.notificationInlineBannerButtonLabel}>
                Retry
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showLoadingSkeleton ? (
        <NotificationsFeedSkeleton />
      ) : showRetryState ? (
        <NotificationStateCard
          icon="cloud-offline-outline"
          title="Notifications need another try"
          description={error ?? "Live activity could not be refreshed."}
          actionLabel={canRetry ? "Retry" : undefined}
          onAction={canRetry ? retry : undefined}
          tone="error"
        />
      ) : items.length ? (
        <View style={styles.notificationList}>
          {items.map((notification: NotificationItem) => {
            const route = resolveNotificationRoute(notification);
            const preview = notification.preview;
            const timestampLabel = formatRelativeDate(notification.createdAt);
            const iconMeta = getNotificationIconMeta(notification);

            return (
              <View
                key={notification.id}
                style={[
                  styles.notificationRow,
                  !notification.isRead && styles.notificationRowUnread,
                ]}
              >
                <Pressable
                  disabled={!route}
                  onPress={() => handleNotificationPress(notification)}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.notificationBody,
                    !route && styles.notificationBodyStatic,
                    route && pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIconWrap,
                      { backgroundColor: iconMeta.backgroundColor },
                    ]}
                  >
                    {iconMeta.icon === "soundwave" ? (
                      <SoundwaveTabIcon size={18} color={iconMeta.color} />
                    ) : (
                      <Ionicons
                        name={iconMeta.icon}
                        size={18}
                        color={iconMeta.color}
                      />
                    )}
                  </View>

                  <View style={styles.notificationCopy}>
                    <View style={styles.notificationHeadlineRow}>
                      <Text
                        style={[
                          styles.notificationHeadline,
                          !notification.isRead &&
                            styles.notificationHeadlineUnread,
                        ]}
                      >
                        {notification.label}
                      </Text>
                      <View style={styles.notificationHeadlineMeta}>
                        <Text
                          style={[
                            styles.notificationTime,
                            !notification.isRead &&
                              styles.notificationTimeUnread,
                          ]}
                        >
                          {timestampLabel}
                        </Text>
                        {!notification.isRead ? (
                          <View style={styles.notificationUnreadDot} />
                        ) : null}
                      </View>
                    </View>

                    {preview ? (
                      <Text
                        style={styles.notificationPreview}
                        numberOfLines={2}
                      >
                        {preview}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <NotificationStateCard
          icon="notifications-off-outline"
          title="You're caught up"
          description="New follows, track activity, comments, and direct messages will settle here as they happen."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notificationFeed: {
    gap: 14,
  },
  notificationInlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: tokens.radii.xl,
    backgroundColor: "rgba(217,92,92,0.08)",
    borderWidth: 1,
    borderColor: "rgba(217,92,92,0.22)",
  },
  notificationInlineBannerCopy: {
    flex: 1,
    gap: 2,
  },
  notificationInlineBannerTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  notificationInlineBannerText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationInlineBannerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationInlineBannerButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  preferenceStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  notifEmptyGate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 12,
  },
  notifEmptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  notifEmptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  notifEmptyBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  notificationList: {
    alignSelf: "stretch",
    marginHorizontal: -20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationRowUnread: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  notificationBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  notificationBodyStatic: {
    opacity: 0.92,
  },
  notificationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationHeadlineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  notificationHeadlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  notificationHeadline: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  notificationHeadlineUnread: {
    fontWeight: "800",
  },
  notificationTime: {
    color: tokens.colors.textDisabled,
    fontSize: 11,
    lineHeight: 16,
  },
  notificationTimeUnread: {
    color: tokens.colors.textSecondary,
    fontWeight: "600",
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.accent,
  },
  notificationPreview: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.7,
  },
});
