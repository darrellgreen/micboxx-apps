import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable, Skeleton } from "@micboxx/ui";
import type { NotificationItem } from "@micboxx/notifications";
import { useNotifications } from "@/features/social/hooks/useNotifications";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { tokens } from "@micboxx/theme";

// ─── Icon colours — mirrors web notification-center ──────────────────────────

function typeColor(type: NotificationItem["type"]): { bg: string; fg: string } {
  if (type === "room")           return { bg: "rgba(52,211,153,0.15)",  fg: "#6EE7B7" };
  if (type === "direct_message") return { bg: "rgba(232,121,249,0.15)", fg: "#E879F9" };
  if (type === "follow")         return { bg: "rgba(56,189,248,0.15)",  fg: "#7DD3FC" };
  if (type === "track_comment")  return { bg: "rgba(52,211,153,0.15)",  fg: "#6EE7B7" };
  // like / default → accent
  return { bg: "rgba(0,179,166,0.15)", fg: tokens.colors.accent };
}

function rewardColor(): { bg: string; fg: string } {
  return { bg: "rgba(252,211,77,0.15)", fg: "#FDE68A" };
}

// ─── Type icon ────────────────────────────────────────────────────────────────

function NotifIcon({ item }: { item: NotificationItem }) {
  const isReward =
    item.type === "room" && item.source === "room" && item.roomType === "room-reward";
  const { fg } = isReward ? rewardColor() : typeColor(item.type);

  const name: React.ComponentProps<typeof Ionicons>["name"] = (() => {
    if (isReward)                  return "trophy-outline";
    if (item.type === "room")      return "radio-outline";
    if (item.type === "direct_message") return "chatbubble-outline";
    if (item.type === "follow")    return "person-add-outline";
    if (item.type === "track_comment") return "chatbubble-ellipses-outline";
    return "heart-outline";
  })();

  return <Ionicons name={name} size={16} color={fg} />;
}

// ─── Relative date ────────────────────────────────────────────────────────────

function formatRelative(value: string | null): string {
  if (!value) return "just now";
  const diffMs = Date.now() - new Date(value).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Single row ───────────────────────────────────────────────────────────────

function NotifRow({
  item,
  onMarkRead,
  markingId,
}: {
  item: NotificationItem;
  onMarkRead: (item: NotificationItem) => void;
  markingId: string | null;
}) {
  const isReward =
    item.type === "room" && item.source === "room" && item.roomType === "room-reward";
  const { bg } = isReward ? rewardColor() : typeColor(item.type);
  const isMarking = markingId === item.id;

  function handlePress() {
    if (!item.isRead) onMarkRead(item);
    if (item.href) router.push(item.href as never);
  }

  return (
    <Pressable onPress={handlePress} style={[s.row, !item.isRead && s.rowUnread]}>
      {/* Unread dot */}
      <View style={s.dotCol}>
        {!item.isRead && <View style={s.unreadDot} />}
      </View>

      {/* Icon bubble */}
      <View style={[s.iconWrap, { backgroundColor: bg }]}>
        <NotifIcon item={item} />
      </View>

      {/* Text */}
      <View style={s.content}>
        <Text style={s.label} numberOfLines={3}>{item.label}</Text>
        <Text style={s.time}>{formatRelative(item.createdAt)}</Text>
      </View>

      {/* Mark read button */}
      {!item.isRead && (
        <AnimatedPressable
          onPress={() => onMarkRead(item)}
          haptic="selection"
          style={s.markBtn}
        >
          {isMarking ? (
            <ActivityIndicator size="small" color={tokens.colors.textSecondary} />
          ) : (
            <Text style={s.markBtnLabel}>Mark read</Text>
          )}
        </AnimatedPressable>
      )}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const notifications = useNotifications(30);
  const [filterKey, setFilterKey] = useState<"all" | "unread">("all");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Clear refreshing spinner once the hook finishes loading after a pull
  useEffect(() => {
    if (refreshing && !notifications.loading) {
      setRefreshing(false);
    }
  }, [notifications.loading, refreshing]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    notifications.retry();
  }, [notifications]);

  const filteredItems = useMemo(() => {
    if (filterKey === "unread") return notifications.items.filter((i) => !i.isRead);
    return notifications.items;
  }, [filterKey, notifications.items]);

  const handleMarkRead = useCallback(
    async (item: NotificationItem) => {
      if (item.isRead || markingId) return;
      setMarkingId(item.id);
      try {
        await notifications.markRead(item.id);
      } finally {
        setMarkingId(null);
      }
    },
    [markingId, notifications],
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Notifications"
        subtitle={
          notifications.unreadCount > 0
            ? `${notifications.unreadCount} unread`
            : "All caught up"
        }
        showBackButton
      />

      {/* ── Filter chips ────────────────────────────────────────── */}
      <View style={s.tabsRow}>
        <View style={s.tabs}>
          {(["all", "unread"] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilterKey(key)}
              style={[s.tab, filterKey === key && s.tabActive]}
            >
              <Text style={[s.tabLabel, filterKey === key && s.tabLabelActive]}>
                {key === "all"
                  ? "All"
                  : `Unread${notifications.unreadCount > 0 ? ` · ${notifications.unreadCount}` : ""}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────────── */}
      {notifications.loading && !refreshing ? (
        <View style={s.skeletonList}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={s.skeletonRow}>
              {/* dot col */}
              <View style={s.dotCol} />
              {/* icon bubble */}
              <Skeleton width={36} height={36} borderRadius={18} />
              {/* text lines */}
              <View style={s.skeletonCopy}>
                <Skeleton width={`${68 - (i % 3) * 8}%`} height={13} borderRadius={6} />
                <Skeleton width="30%" height={10} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      ) : filteredItems.length === 0 ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.accent}
              colors={[tokens.colors.accent]}
            />
          }
        >
          <Ionicons
            name="notifications-off-outline"
            size={36}
            color={tokens.colors.textSecondary}
          />
          <Text style={s.emptyTitle}>
            {filterKey === "unread" ? "No unread notifications" : "No notifications yet"}
          </Text>
          <Text style={s.emptySubtitle}>
            {filterKey === "unread"
              ? "You're all caught up."
              : "Activity from your fans will appear here."}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.accent}
              colors={[tokens.colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <NotifRow
              item={item}
              onMarkRead={(i) => void handleMarkRead(i)}
              markingId={markingId}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },

  center: {
    flexGrow: 1, alignItems: "center", justifyContent: "center",
    gap: 12, paddingHorizontal: 32,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary, fontSize: 16,
    fontWeight: "700", textAlign: "center",
  },
  emptySubtitle: {
    color: tokens.colors.textSecondary, fontSize: 14,
    textAlign: "center", lineHeight: 20,
  },

  // Tabs
  tabsRow: {
    flexDirection: "row", justifyContent: "flex-end",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: tokens.colors.borderSubtle,
  },
  tabs: {
    flexDirection: "row", gap: 6,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: tokens.radii.pill,
    borderWidth: 1, borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: tokens.colors.accentDim,
    borderColor: tokens.colors.borderAccent,
  },
  tabLabel: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  tabLabelActive: { color: tokens.colors.textPrimary },

  // Skeleton
  skeletonList: { paddingTop: 4 },
  skeletonRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: tokens.colors.borderSubtle,
  },
  skeletonCopy: { flex: 1, gap: 8 },

  // List
  list: { paddingBottom: 40 },
  separator: { height: 1, backgroundColor: tokens.colors.borderSubtle },

  // Row
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowUnread: { backgroundColor: "rgba(255,255,255,0.03)" },

  dotCol: { width: 8, alignItems: "center", paddingTop: 12 },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: tokens.colors.accent,
  },

  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  content: { flex: 1, gap: 4 },
  label: { color: tokens.colors.textPrimary, fontSize: 14, lineHeight: 20 },
  time: { color: tokens.colors.textSecondary, fontSize: 12 },

  markBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    alignSelf: "flex-start", marginTop: 2,
    minWidth: 76, alignItems: "center",
  },
  markBtnLabel: { color: tokens.colors.textSecondary, fontSize: 12, fontWeight: "600" },
});
