import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Avatar } from "@/components/ui/avatar";
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
import { tokens } from "@/theme/tokens";

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerPanel}>
        <ScreenHeader
          title="Inbox"
          subtitle={
            totalUnread > 0
              ? `${totalUnread} unread across your MicBoxx conversations.`
              : "Music-aware conversations with creators, fans, and collaborators."
          }
        />

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/audience/inbox/new" as never)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityLabel="Start a new message"
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={tokens.colors.textPrimary}
            />
          </Pressable>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons
            name="search-outline"
            size={17}
            color={tokens.colors.textMuted}
          />
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
              <Ionicons
                name="close-circle"
                size={18}
                color={tokens.colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
          {FILTER_OPTIONS.map((option) => {
            const active = activeFilter === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => setActiveFilter(option.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.filterCount,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filterCounts[option.value]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!session ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptyText}>
            Direct messages are available once your MicBoxx account is signed
            in.
          </Text>
          <Pressable
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            {isSigningIn ? (
              <ActivityIndicator color={tokens.colors.textPrimary} />
            ) : (
              <Text style={styles.primaryButtonLabel}>Sign in</Text>
            )}
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Unable to load messages</Text>
          <Text style={styles.emptyText}>{error}</Text>
          {canRetry ? (
            <Pressable
              onPress={retry}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : loading || !isReady ? (
        <View style={styles.listContent}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={`message-skeleton-${index}`} style={styles.skeletonRow}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonCopy}>
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLine} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <ConversationRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptySkeletonStack}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <View key={`empty-message-${index}`} style={styles.emptyGhost}>
                    <View style={styles.emptyGhostAvatar} />
                    <View style={styles.emptyGhostCopy}>
                      <View style={styles.emptyGhostLineShort} />
                      <View style={styles.emptyGhostLine} />
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
                <Text style={styles.emptyText}>{emptyCopy.body}</Text>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function ConversationRow({ item }: { item: UserConversationInboxItem }) {
  const label = getConversationLabel(item);
  const role = resolveParticipantRole(item);
  const relationshipCue = getRelationshipCue(item, role);
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

        <View style={styles.tokenRow}>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{role}</Text>
          </View>
          <View style={styles.contextChip}>
            <Text style={styles.contextChipText}>{relationshipCue}</Text>
          </View>
          {unread ? (
            <View style={styles.needsReplyChip}>
              <Text style={styles.needsReplyText}>Needs reply</Text>
            </View>
          ) : null}
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
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  headerPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 18,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.025)",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
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
  countPill: {
    minWidth: 36,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 10,
  },
  countPillText: {
    color: "rgba(247,250,252,0.72)",
    fontSize: 12,
    fontWeight: "800",
  },
  searchRow: {
    minHeight: 44,
    marginHorizontal: 14,
    marginTop: 14,
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
  filterRail: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radii.pill,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: tokens.colors.borderAccent,
    backgroundColor: tokens.colors.accentDim,
  },
  filterChipText: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterChipTextActive: {
    color: tokens.colors.accent,
  },
  filterCount: {
    color: "rgba(247,250,252,0.50)",
    fontSize: 10,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 14,
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
  tokenRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  roleChip: {
    borderRadius: tokens.radii.pill,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.20)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleChipText: {
    color: "rgba(247,250,252,0.66)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  contextChip: {
    borderRadius: tokens.radii.pill,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contextChipText: {
    color: "rgba(247,250,252,0.62)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  needsReplyChip: {
    borderRadius: tokens.radii.pill,
    borderColor: "rgba(0,179,166,0.28)",
    backgroundColor: "rgba(0,179,166,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  needsReplyText: {
    color: tokens.colors.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
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
