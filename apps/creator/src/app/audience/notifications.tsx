import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNotifications } from "@/features/social/hooks/useNotifications";
import {
  ChipTabs,
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import { ErrorState, Panel, SectionTitle } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function NotificationsScreen() {
  const notifications = useNotifications(30);
  const [filterKey, setFilterKey] = useState<"all" | "unread" | "read">("all");
  const filteredItems = useMemo(() => {
    if (filterKey === "unread") {
      return notifications.items.filter((item) => !item.isRead);
    }
    if (filterKey === "read") {
      return notifications.items.filter((item) => item.isRead);
    }
    return notifications.items;
  }, [filterKey, notifications.items]);

  const filterOptions = [
    { key: "all", label: "All", count: notifications.items.length },
    { key: "unread", label: "Unread", count: notifications.unreadCount },
    {
      key: "read",
      label: "Read",
      count: Math.max(0, notifications.items.length - notifications.unreadCount),
    },
  ] as const;

  return (
    <Screen
      header={<AppHeader variant="detail" title="Notifications" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {notifications.error ? <ErrorState message={notifications.error} onRetry={notifications.retry} /> : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{notifications.items.length}</Text>
          <Text style={styles.summaryLabel}>Total alerts</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{notifications.unreadCount}</Text>
          <Text style={styles.summaryLabel}>Unread alerts</Text>
        </View>
      </View>

      <SectionTitle title="Activity stream" subtitle="Table-style feed adapted from the web dashboard pattern." />
      <ChipTabs
        options={filterOptions.map((option) => ({ ...option }))}
        value={filterKey}
        onChange={(next) => setFilterKey(next as "all" | "unread" | "read")}
      />

      {notifications.loading ? (
        <Panel title="Loading notifications" description="Connecting to the creator notification feed." />
      ) : filteredItems.length === 0 ? (
        <Panel title="No notifications yet" description="Creator alerts will appear here when the social layer emits them." />
      ) : (
        <ListShell>
          <ListHeader
            columns={[
              { key: "event", label: "Event" },
              { key: "status", label: "Status", align: "right" },
            ]}
          />
          {filteredItems.map((item) => (
            <ListRow
              key={item.id}
              onPress={() => router.push(`/audience/activity/${item.id}` as never)}
            >
              <View style={styles.row}>
                <View style={styles.rowMain}>
                  <View style={styles.rowTitleRow}>
                    <Ionicons
                      name="notifications-outline"
                      size={14}
                      color={tokens.colors.textSecondary}
                    />
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {formatTypeLabel(item.type)}
                    </Text>
                  </View>
                  <Text style={styles.rowPreview} numberOfLines={2}>
                    {item.preview ?? "Creator activity"}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  <StatusPill
                    label={item.isRead ? "Read" : "Unread"}
                    tone={item.isRead ? "muted" : "warning"}
                  />
                  <Text style={styles.rowTime}>{formatRelative(item.createdAt)}</Text>
                </View>
              </View>
            </ListRow>
          ))}
        </ListShell>
      )}
    </Screen>
  );
}

function formatTypeLabel(type: string) {
  return type.replace(/_/g, " ");
}

function formatRelative(isoValue: string | null) {
  if (!isoValue) {
    return "No date";
  }

  const dateValue = new Date(isoValue);
  const diffMs = Date.now() - dateValue.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "Now";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return dateValue.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: tokens.colors.panelGlassStrong,
    borderRadius: tokens.radii.xl,
    borderColor: tokens.colors.borderAccent,
    padding: 16,
    gap: 6,
  },
  summaryValue: {
    color: tokens.colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 6,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
    flexShrink: 1,
  },
  rowPreview: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    alignItems: "flex-end",
    gap: 8,
    minWidth: 74,
  },
  rowTime: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
