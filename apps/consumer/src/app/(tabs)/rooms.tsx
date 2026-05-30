import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionHeader } from "@/components/discover";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import type { PublicRoomSummary } from "@/contracts/rooms";
import { useGetPublicRoomsQuery } from "@/store/micboxx-api";
import { tokens } from "@/theme/tokens";

function roomKey(room: PublicRoomSummary): string {
  return room.release_identifier || `${room.release_ref_type}:${room.release_ref_id}`;
}

function dedupeRooms(
  rooms: PublicRoomSummary[],
  seen = new Set<string>(),
): PublicRoomSummary[] {
  const deduped: PublicRoomSummary[] = [];
  for (const room of rooms) {
    const key = roomKey(room);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(room);
  }
  return deduped;
}

function formatRoomTime(value: number | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - value);
  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPresenceChipLabel(count: number): string {
  if (count <= 0) {
    return "Listening room is open";
  }

  if (count === 1) {
    return "Just you here";
  }

  return `${count} people in the Room`;
}

export default function RoomsScreen() {
  const router = useRouter();
  const activeRoomsQuery = useGetPublicRoomsQuery({
    filter: "artist_in_room",
    limit: 6,
  });
  const availableRoomsQuery = useGetPublicRoomsQuery({
    filter: "all",
    limit: 24,
  });
  const { activeRooms, availableRooms } = useMemo(() => {
    const seen = new Set<string>();
    const activeUniqueRooms = dedupeRooms(activeRoomsQuery.data?.rooms ?? [], seen);
    return {
      activeRooms: activeUniqueRooms,
      availableRooms: dedupeRooms(availableRoomsQuery.data?.rooms ?? [], seen),
    };
  }, [activeRoomsQuery.data?.rooms, availableRoomsQuery.data?.rooms]);
  const isLoading = activeRoomsQuery.isLoading || availableRoomsQuery.isLoading;
  const isFetching = activeRoomsQuery.isFetching || availableRoomsQuery.isFetching;
  const hasError = Boolean(activeRoomsQuery.error || availableRoomsQuery.error);
  const hasRooms = activeRooms.length > 0 || availableRooms.length > 0;

  const refresh = () => {
    void activeRoomsQuery.refetch();
    void availableRoomsQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            tintColor={tokens.colors.accent}
            onRefresh={refresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>Rooms</Text>
          <SectionHeader bold="Release" light="Rooms" />
          <Text style={styles.headingCopy}>
            Step into live spaces around releases. Rooms show real listening
            moments, artist visits, support, and history without staged activity.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color={tokens.colors.accent} />
            <Text style={styles.statusText}>Loading Rooms...</Text>
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.statusCard}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={tokens.colors.warning}
            />
            <Text style={styles.statusTitle}>Rooms are unavailable</Text>
            <Text style={styles.statusText}>
              We could not load public room discovery from the server.
            </Text>
          </View>
        ) : null}

        {!isLoading && !hasError && !hasRooms ? (
          <View style={styles.statusCard}>
            <Ionicons
              name="radio-outline"
              size={28}
              color={tokens.colors.accent}
            />
            <Text style={styles.statusTitle}>No public Rooms right now</Text>
            <Text style={styles.statusText}>
              Rooms will appear here as listeners open releases and real
              activity begins.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/home" as never)}
              style={styles.emptyAction}
            >
              <Text style={styles.emptyActionText}>Browse music</Text>
            </Pressable>
          </View>
        ) : null}

        {activeRooms.length > 0 ? (
          <RoomSection
            title="Artists in the Room"
            rooms={activeRooms}
            onEnter={(room) => enterRoom(router, room)}
          />
        ) : null}

        {availableRooms.length > 0 ? (
          <RoomSection
            title="All available Rooms"
            rooms={availableRooms}
            onEnter={(room) => enterRoom(router, room)}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function enterRoom(
  router: ReturnType<typeof useRouter>,
  room: PublicRoomSummary,
) {
  router.push({
    pathname: "/album/[slug]/room",
    params: { slug: room.release_identifier },
  } as never);
}

function RoomSection({
  title,
  rooms,
  onEnter,
}: {
  title: string;
  rooms: PublicRoomSummary[];
  onEnter: (room: PublicRoomSummary) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="radio-outline" size={15} color={tokens.colors.accentLight} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.list}>
        {rooms.map((room) => (
          <RoomCard
            key={`${title}-${roomKey(room)}`}
            room={room}
            onPress={() => onEnter(room)}
          />
        ))}
      </View>
    </View>
  );
}

function RoomCard({
  room,
  onPress,
}: {
  room: PublicRoomSummary;
  onPress: () => void;
}) {
  const canEnter = room.capabilities.can_enter_room;
  const hasVisits =
    room.has_visits ??
    Boolean(room.last_visited_at ?? room.last_activity_at ?? room.awakened_at);
  const timeLabel = formatRoomTime(
    room.last_visited_at ?? room.last_activity_at ?? room.awakened_at,
  );
  const stateLine =
    room.room_summary_text ||
    room.state_line ||
    (hasVisits ? "Room has history." : "No one's been here yet. Be the first.");
  const activePresenceCount =
    typeof room.active_presence_count === "number" &&
    room.active_presence_count >= 0
      ? room.active_presence_count
      : null;
  const presenceStateLine =
    activePresenceCount !== null
      ? formatPresenceChipLabel(activePresenceCount)
      : stateLine;
  const supportGoalCents = room.support_enabled ? room.support_goal_cents : null;
  const supportMomentumVisible =
    supportGoalCents !== null && supportGoalCents > 0;
  const supportProgressPercent = supportMomentumVisible
    ? Math.min((room.support_total_cents / supportGoalCents) * 100, 100)
    : 0;
  const showPrimaryBadge =
    hasVisits && room.primary_room_badge.trim().length > 0;
  const footerMetaLabel =
    activePresenceCount !== null
      ? `${activePresenceCount} ${
          activePresenceCount === 1 ? "PERSON" : "PEOPLE"
        } HERE`
      : hasVisits && timeLabel
        ? `LAST ACTIVE ${timeLabel.toUpperCase()}`
        : hasVisits && showPrimaryBadge
          ? room.primary_room_badge.toUpperCase()
          : null;

  return (
    <Pressable
      disabled={!canEnter}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !canEnter && styles.cardDisabled,
        pressed && styles.pressed,
      ]}
    >
      {room.artwork_url ? (
        <Image
          source={{ uri: room.artwork_url }}
          style={styles.cardBackdrop}
          contentFit="cover"
          blurRadius={26}
        />
      ) : null}
      <View style={styles.cardOverlay} />

      <View style={styles.cardTop}>
        <View style={styles.roomBadge}>
          <Ionicons name="radio-outline" size={12} color={tokens.colors.accentLight} />
          <Text style={styles.roomBadgeText}>Room</Text>
        </View>
        {showPrimaryBadge ? (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{room.primary_room_badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.artwork}>
          {room.artwork_url ? (
            <Image
              source={{ uri: room.artwork_url }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.artworkFallback}>Room</Text>
          )}
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.title}>
            {room.release_title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {room.artist_name}
          </Text>
        </View>
      </View>

      <View style={styles.roomStateRow}>
        <Ionicons
          name={activePresenceCount !== null ? "people-outline" : "sparkles-outline"}
          size={15}
          color={tokens.colors.accentLight}
        />
        <Text numberOfLines={1} style={styles.stateLine}>
          {presenceStateLine}
        </Text>
      </View>

      {supportMomentumVisible ? (
        <View style={styles.supportBox}>
          <View style={styles.supportHeading}>
            <Text style={styles.supportTitle}>Release momentum</Text>
            <Text style={styles.supportState}>
              {room.support_goal_reached ? "Goal reached" : "Building"}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${supportProgressPercent}%` },
              ]}
            />
          </View>
          <Text numberOfLines={1} style={styles.supportCopy}>
            {room.support_goal_reached
              ? "The next release moment is ready."
              : `Bumped ${formatCurrency(room.support_total_cents)} toward ${formatCurrency(
                  supportGoalCents,
                )} next moment`}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        {footerMetaLabel ? (
          <Text numberOfLines={1} style={styles.footerMeta}>
            {footerMetaLabel}
          </Text>
        ) : (
          <View />
        )}
        <View style={styles.enterButton}>
          <Text style={styles.enterButtonText}>{room.entry_cta_label}</Text>
          <Ionicons name="arrow-forward" size={14} color="#050708" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 160,
    gap: 22,
  },
  heading: {
    gap: 8,
    paddingVertical: 4,
  },
  eyebrow: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: tokens.colors.accentDim,
    color: tokens.colors.accentLight,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  headingCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  statusCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderRadius: 8,
    backgroundColor: tokens.colors.bgSurface,
    padding: 18,
    gap: 8,
  },
  statusTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  statusText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: 4,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: tokens.colors.accent,
  },
  emptyActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  section: { gap: 12 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  list: { gap: 14 },
  card: {
    minHeight: 260,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#0f1216",
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  cardDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
  cardBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
    transform: [{ scale: 1.12 }],
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,9,11,0.72)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(215,255,251,0.20)",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(0,179,166,0.12)",
  },
  roomBadgeText: {
    color: tokens.colors.accentLight,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  primaryBadge: {
    maxWidth: "52%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  primaryBadgeText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    fontWeight: "800",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 42,
  },
  artwork: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  artworkFallback: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "800",
  },
  cardCopy: { flex: 1, minWidth: 0 },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 19,
    fontWeight: "900",
  },
  artist: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 14,
    marginTop: 2,
  },
  roomStateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  stateLine: {
    flex: 1,
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
  },
  supportBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(215,255,251,0.15)",
    borderRadius: 8,
    backgroundColor: "rgba(0,179,166,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  supportHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  supportTitle: {
    color: "rgba(215,255,251,0.82)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  supportState: {
    color: "rgba(255,255,255,0.46)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: tokens.colors.accentLight,
  },
  supportCopy: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  footerMeta: {
    flex: 1,
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  enterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  enterButtonText: {
    color: "#050708",
    fontSize: 12,
    fontWeight: "900",
  },
});
