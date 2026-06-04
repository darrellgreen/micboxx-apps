import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChipTabs } from "@/shared/ui/dashboard-primitives";
import { AppHeader, Screen, Avatar, Skeleton, EmptyState, ErrorState } from "@micboxx/ui";
import type { UserConversationInboxItem } from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { useInbox } from "@/features/social/hooks/useInbox";
import {
  buildInboxMetaLine,
  filterInboxItems,
  formatInboxPreview,
  formatMessageRelativeDate,
  getConversationLabel,
  getEmptyInboxCopy,
  getRelationshipCue,
  resolveParticipantRole,
  type ConversationFilter,
} from "@/features/social/message-ui";
import { tokens } from "@micboxx/theme";

const FILTER_OPTIONS: { value: ConversationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "following", label: "Following" },
  { value: "fans", label: "Fans" },
  { value: "creators", label: "Creators" },
  { value: "archived", label: "Archived" },
];

export default function AudienceInboxScreen() {
  const { session, signIn, isSigningIn } = useAuth();
  const { items, totalUnread, loading, error, isReady, canRetry, retry } =
    useInbox();
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");

  const filteredItems = useMemo(
    () => filterInboxItems(items, activeFilter, searchValue),
    [activeFilter, items, searchValue],
  );
  const emptyCopy = getEmptyInboxCopy(
    activeFilter,
    searchValue.trim().length > 0,
  );

  const filterCounts = useMemo(() => {
    const counts: Record<ConversationFilter, number> = {
      all: items.length,
      following: 0,
      fans: 0,
      creators: 0,
      archived: 0,
    };

    for (const item of items) {
      const role = resolveParticipantRole(item);
      const relationshipCue = getRelationshipCue(item, role);
      if (relationshipCue === "Following you") {
        counts.following += 1;
      }
      if (role === "Creator") {
        counts.creators += 1;
      } else {
        counts.fans += 1;
      }
    }

    return counts;
  }, [items]);

  const composeButton = (
    <Pressable
      onPress={() => router.push("/audience/inbox/new" as never)}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      accessibilityLabel="Start a new message"
    >
      <Ionicons name="create-outline" size={18} color={tokens.colors.textPrimary} />
    </Pressable>
  );

  return (
    <Screen
      scroll={false}
      header={<AppHeader variant="detail" title="Inbox" fallbackRoute="/(tabs)/dashboard" rightContent={composeButton} />}
      contentContainerStyle={styles.screenContent}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={17} color={tokens.colors.textMuted} />
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search people, threads, or release context"
          placeholderTextColor={tokens.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {searchValue.length > 0 ? (
          <Pressable
            onPress={() => setSearchValue("")}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close-circle" size={18} color={tokens.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ChipTabs
        value={activeFilter}
        onChange={(next) => setActiveFilter(next as ConversationFilter)}
        options={FILTER_OPTIONS.map((option) => ({
          key: option.value,
          label: option.label,
          count: filterCounts[option.value],
        }))}
      />

      {!session ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in required"
          description="Direct messages are available once your MicBoxx account is signed in."
          action={{
            label: "Sign in",
            onPress: () => void signIn(),
            loading: isSigningIn,
          }}
        />
      ) : error ? (
        <ErrorState
          title="Unable to load messages"
          message={error}
          onRetry={canRetry ? retry : undefined}
        />
      ) : loading || !isReady ? (
        <View style={styles.listContent}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={`message-skeleton-${index}`} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.skeletonCopy}>
                <Skeleton width="64%" height={12} borderRadius={6} />
                <Skeleton width="40%" height={10} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <ConversationRow item={item} />}
          ListEmptyComponent={
            <EmptyState
              title={emptyCopy.title}
              description={emptyCopy.body}
            />
          }
        />
      )}
    </Screen>
  );
}

function ConversationRow({ item }: { item: UserConversationInboxItem }) {
  const label = getConversationLabel(item);
  const unread = item.unreadCount > 0;

  return (
    <Pressable
      onPress={() =>
        router.push(`/audience/inbox/${item.conversationId}` as never)
      }
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        pressed && styles.pressed,
      ]}
    >
      <Avatar displayName={label} size={44} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={styles.rowTitleWrap}>
            <Text
              numberOfLines={1}
              style={[styles.rowTitle, unread && styles.rowTitleUnread]}
            >
              {label}
            </Text>
            <View style={styles.metaLine}>
              <Text numberOfLines={1} style={styles.metaText}>
                {buildInboxMetaLine(item)}
              </Text>
            </View>
          </View>
          <View style={styles.rowTimeWrap}>
            <Text style={styles.timeText}>
              {formatMessageRelativeDate(item.lastMessageAt ?? item.updatedAt)}
            </Text>
            {unread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text
          numberOfLines={2}
          style={[styles.previewText, unread && styles.previewTextUnread]}
        >
          {formatInboxPreview(item)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  list: {
    flex: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  searchRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: tokens.radii.pill,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 34,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
  },
  rowUnread: {
    borderColor: "rgba(0,179,166,0.35)",
    backgroundColor: "rgba(0,179,166,0.10)",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  rowTitleUnread: {
    color: tokens.colors.accentLight,
  },
  metaLine: {
    marginTop: 3,
  },
  metaText: {
    color: "rgba(247,250,252,0.42)",
    fontSize: 11,
    fontWeight: "600",
  },
  rowTimeWrap: {
    alignItems: "flex-end",
    gap: 5,
  },
  timeText: {
    color: "rgba(247,250,252,0.38)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  unreadBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: tokens.colors.bgInk,
    fontSize: 10,
    fontWeight: "900",
  },
  previewText: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  previewTextUnread: {
    color: "rgba(247,250,252,0.78)",
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 14,
    marginBottom: 10,
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonLineWide: {
    width: "64%",
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  skeletonLine: {
    width: "92%",
    height: 9,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emptyWrap: {
    gap: 16,
  },
  emptySkeletonStack: {
    gap: 8,
    opacity: 0.62,
  },
  emptyGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 14,
  },
  emptyGhostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emptyGhostCopy: {
    flex: 1,
    gap: 7,
  },
  emptyGhostLineShort: {
    width: "48%",
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emptyGhostLine: {
    width: "68%",
    height: 8,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emptyCard: {
    borderRadius: 16,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.10)",
    padding: 18,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    minWidth: 132,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
  },
  primaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    minWidth: 116,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderColor: tokens.colors.borderSubtle,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.84,
  },
});
