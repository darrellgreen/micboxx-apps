import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  NewMusicAlbums,
  SectionHeader,
  TrackRow,
  TrendingArtists,
} from "@/components/discover";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { ShimmerPlaceholder } from "@/components/ui/shimmer-placeholder";
import type {
  PublicArtistSummary,
  PublicTrackSummary
} from "@micboxx/contracts";
import type { PublicRoomSummary } from "@micboxx/contracts";
import { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import { hapticSelection } from "@/hooks/useHaptic";
import { useAppSelector } from "@/store/hooks";
import {
  useGetDiscoverPersonalizedQuery,
  useGetDiscoverTracksQuery,
  useGetFeaturedTracksQuery,
  useGetPopularTracksQuery,
  useGetPublicRoomsQuery,
  useGetRecentlyPlayedQuery,
} from "@/store/micboxx-api";
import { tokens } from "@/theme/tokens";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface DiscoverLane {
  key: string;
  title: string;
  tracks: PublicTrackSummary[];
  isPersonalized?: boolean;
  requiresAuth?: boolean;
}

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const LANE_LIMIT = 5;

const LANE_TITLE_PARTS: Record<string, { bold: string; light: string }> = {
  followed_artists: { bold: "Latest", light: "from artists you follow" },
  for_you: { bold: "For", light: "You" },
  editors_picks: { bold: "Editor's", light: "Picks" },
  recently_played: { bold: "Recently", light: "Played" },
  most_popular: { bold: "Most", light: "Popular" },
  new_music: { bold: "New", light: "Music" },
};

function dedup(
  incoming: PublicTrackSummary[],
  seen: Set<number>,
  limit = LANE_LIMIT,
): PublicTrackSummary[] {
  const result: PublicTrackSummary[] = [];
  for (const t of incoming) {
    if (result.length >= limit) break;
    if (!seen.has(t.id)) result.push(t);
  }
  for (const t of result) seen.add(t.id);
  return result;
}

function uniqueArtists(
  tracks: PublicTrackSummary[],
  limit = 3,
): PublicArtistSummary[] {
  const seen = new Set<number>();
  const result: PublicArtistSummary[] = [];

  for (const track of tracks) {
    if (!track.artist || seen.has(track.artist.id)) continue;
    seen.add(track.artist.id);

    const avatarUrl =
      typeof track.artist.avatarUrl === "string" &&
      track.artist.avatarUrl.trim().length > 0
        ? track.artist.avatarUrl.trim()
        : null;
    const coverUrl =
      typeof track.artist.coverUrl === "string" &&
      track.artist.coverUrl.trim().length > 0
        ? track.artist.coverUrl.trim()
        : null;

    result.push({
      ...track.artist,
      avatarUrl,
      coverUrl,
    });
    if (result.length >= limit) break;
  }

  return result;
}

function deriveTrendingArtistsFromLanes(
  lanes: DiscoverLane[],
  limit = 3,
): PublicArtistSummary[] {
  const preferredOrder = [
    "trending_now",
    "most_popular",
    "new_music",
    "editors_picks",
  ];
  const orderedLanes = [
    ...preferredOrder
      .map((key) => lanes.find((lane) => lane.key === key))
      .filter((lane): lane is DiscoverLane => Boolean(lane)),
    ...lanes.filter((lane) => !preferredOrder.includes(lane.key)),
  ];

  const laneWeights: Record<string, number> = {
    trending_now: 4,
    most_popular: 3,
    new_music: 2,
    editors_picks: 2,
    recently_played: 1,
  };

  const scoredArtists = new Map<string, PublicArtistSummary & { score: number }>();
  for (const lane of orderedLanes) {
    const score = laneWeights[lane.key] ?? 1;
    for (const track of lane.tracks) {
      const artist = track.artist;
      if (!artist?.username) continue;

      const artistKey = artist.uuid?.trim() || `id:${artist.id}`;

      const existing = scoredArtists.get(artistKey);
      if (existing) {
        existing.score += score;
        continue;
      }

      scoredArtists.set(artistKey, {
        ...artist,
        avatarUrl: artist.avatarUrl ?? artist.coverUrl ?? null,
        coverUrl: artist.coverUrl ?? null,
        counts: {
          tracks: 1,
          albums: 0,
          playlists: 0,
          followers: 0,
          following: 0,
        },
        score,
      });
    }
  }

  return Array.from(scoredArtists.values())
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
    .slice(0, limit)
    .map(({ score, ...artist }) => artist);
}

/* ─── LaneSection ────────────────────────────────────────────────────────── */

function LaneSection({
  lane,
  activeId,
  playing,
  progressValue,
  onAction,
}: {
  lane: DiscoverLane;
  activeId: number | null;
  playing: boolean;
  progressValue: ReturnType<typeof useDiscoverPlayer>["progressValue"];
  onAction: (
    track: PublicTrackSummary,
    allTracks?: PublicTrackSummary[],
  ) => void;
}) {
  if (!lane.tracks.length) return null;

  const heading = LANE_TITLE_PARTS[lane.key] ?? {
    bold: lane.title.split(" ")[0] ?? lane.title,
    light: lane.title.split(" ").slice(1).join(" "),
  };

  if (lane.key === "new_music") {
    return (
      <>
        <SectionHeader bold={heading.bold} light={heading.light} />
        <NewMusicAlbums tracks={lane.tracks} />
      </>
    );
  }

  return (
    <>
      <SectionHeader bold={heading.bold} light={heading.light} />
      <View style={s.trackList}>
        {lane.tracks.map((track, i) => {
          const active = track.id === activeId;
          return (
            <View key={track.id}>
              <TrackRow
                track={track}
                laneTracks={lane.tracks}
                active={active}
                playing={active && playing}
                onAction={onAction}
                progressValue={progressValue}
              />
            </View>
          );
        })}
      </View>
    </>
  );
}

function ReleaseRoomsSection({
  rooms,
  onOpenRoom,
  onOpenAll,
}: {
  rooms: PublicRoomSummary[];
  onOpenRoom: (room: PublicRoomSummary) => void;
  onOpenAll: () => void;
}) {
  if (!rooms.length) return null;

  return (
    <>
      <SectionHeader bold="Release" light="Rooms" onSeeAll={onOpenAll} />
      <FlatList
        horizontal
        data={rooms}
        keyExtractor={(item) => roomKey(item)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.roomsRail}
        renderItem={({ item }) => {
          const hasPresence =
            typeof item.active_presence_count === "number"
            && item.active_presence_count > 0;
          const meta = hasPresence
            ? `${item.active_presence_count} ${item.active_presence_count === 1 ? "person" : "people"} here`
            : item.state_line;

          return (
            <Pressable style={s.roomCard} onPress={() => onOpenRoom(item)}>
              {item.artwork_url ? (
                <Image
                  source={{ uri: item.artwork_url }}
                  style={s.roomArtwork}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.roomArtwork, s.roomArtworkFallback]}>
                  <Text style={s.roomArtworkFallbackLabel}>Room</Text>
                </View>
              )}
              <View style={s.roomCardCopy}>
                <Text style={s.roomCardTitle} numberOfLines={1}>
                  {item.release_title}
                </Text>
                <Text style={s.roomCardArtist} numberOfLines={1}>
                  {item.artist_name}
                </Text>
                <Text style={s.roomCardMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </>
  );
}

/* ─── Screen ─────────────────────────────────────────────────────────────── */

export default function HomeScreen() {
  const router = useRouter();
  const accessToken = useAppSelector(
    (st) => st.auth.session?.accessToken ?? null,
  );
  const isLoggedIn = accessToken !== null;

  /* data */
  const {
    data: personalizedData,
    isLoading: personalizedLoading,
    isFetching: personalizedFetching,
    error: personalizedError,
    refetch: refetchPersonalized,
  } = useGetDiscoverPersonalizedQuery(
    { accessToken },
    { skip: !isLoggedIn },
  );
  const {
    data: discoverData,
    isLoading: discoverLoading,
    isFetching: discoverFetching,
    error: discoverError,
    refetch: refetchDiscover,
  } = useGetDiscoverTracksQuery();
  const {
    data: popularData,
    isLoading: popularLoading,
    isFetching: popularFetching,
    error: popularError,
    refetch: refetchPopular,
  } = useGetPopularTracksQuery();
  const {
    data: featuredData,
    isLoading: featuredLoading,
    isFetching: featuredFetching,
    error: featuredError,
    refetch: refetchFeatured,
  } = useGetFeaturedTracksQuery();
  const {
    data: roomsData,
    isLoading: roomsLoading,
    isFetching: roomsFetching,
    error: roomsError,
    refetch: refetchRooms,
  } = useGetPublicRoomsQuery({ filter: "latest_activity", limit: 6 });
  const {
    data: recentData,
    isLoading: recentLoading,
    isFetching: recentFetching,
    error: recentError,
    refetch: refetchRecent,
  } = useGetRecentlyPlayedQuery({ accessToken }, { skip: !isLoggedIn });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      ...(isLoggedIn ? [refetchPersonalized()] : []),
      refetchDiscover(),
      refetchFeatured(),
      refetchPopular(),
      refetchRooms(),
      ...(isLoggedIn ? [refetchRecent()] : []),
    ]).finally(() => {
      setRefreshing(false);
      hapticSelection();
    });
  }, [
    refetchPersonalized,
    refetchDiscover,
    refetchFeatured,
    refetchPopular,
    refetchRooms,
    refetchRecent,
    isLoggedIn,
  ]);

  const releaseRooms = useMemo(
    () => dedupeRooms(roomsData?.rooms ?? []),
    [roomsData?.rooms],
  );

  /* lanes */
  const lanes = useMemo<DiscoverLane[]>(() => {
    const seen = new Set<number>();
    const result: DiscoverLane[] = [];
    const forYouItems = personalizedData?.forYou?.items ?? [];
    const forYouTracks = forYouItems.map((item) => item.track);
    const followedArtistTracks = personalizedData?.followedArtistFeed?.tracks ?? [];
    const followeeCount = personalizedData?.followedArtistFeed?.followeeUuids.length ?? 0;
    const discoverTracks = discoverData?.tracks ?? [];

    // 1. Latest from artists you follow (dedicated personalized feed)
    if (isLoggedIn && followeeCount > 0) {
      const followedDeduped = dedup(followedArtistTracks, seen, LANE_LIMIT);
      if (followedDeduped.length) {
        result.push({
          key: "followed_artists",
          title: "Latest from artists you follow",
          tracks: followedDeduped,
          isPersonalized: true,
          requiresAuth: true,
        });
      }
    }

    // 2. For You (personalized endpoint only)
    const forYouDeduped = dedup(forYouTracks, seen, LANE_LIMIT);
    if (forYouDeduped.length) {
      result.push({
        key: "for_you",
        title: "For You",
        tracks: forYouDeduped,
        isPersonalized: true,
        requiresAuth: true,
      });
    }

    // 3. Editor's Picks (featured)
    const featuredDeduped = dedup(featuredData?.tracks ?? [], seen, LANE_LIMIT);
    if (featuredDeduped.length) {
      result.push({
        key: "editors_picks",
        title: "Editor's Picks",
        tracks: featuredDeduped,
      });
    }

    // 4. Most Popular
    const popularDeduped = dedup(popularData?.tracks ?? [], seen, LANE_LIMIT);
    if (popularDeduped.length) {
      result.push({
        key: "most_popular",
        title: "Most Popular",
        tracks: popularDeduped,
      });
    }

    // 5. New Music
    const newMusicDeduped = dedup(discoverTracks, seen, LANE_LIMIT);
    if (newMusicDeduped.length) {
      result.push({
        key: "new_music",
        title: "New Music",
        tracks: newMusicDeduped,
      });
    }

    // 6. Recently Played (auth-only, after shared lanes to match web order)
    if (isLoggedIn) {
      const recentDeduped = dedup(recentData?.tracks ?? [], seen, LANE_LIMIT);
      if (recentDeduped.length) {
        result.push({
          key: "recently_played",
          title: "Recently Played",
          tracks: recentDeduped,
          isPersonalized: true,
          requiresAuth: true,
        });
      }
    }

    return result;
  }, [personalizedData, discoverData, featuredData, popularData, recentData, isLoggedIn]);

  const trendingArtists = useMemo(() => {
    const laneDerived = deriveTrendingArtistsFromLanes(lanes, 3);
    if (laneDerived.length > 0) return laneDerived;

    return uniqueArtists(
      lanes.flatMap((lane) => lane.tracks),
      3,
    );
  }, [lanes]);

  const [followed, setFollowed] = useState<Set<number>>(() => new Set());

  const toggleFollow = useCallback((id: number) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* player */
  const { activeId, playing, progressValue, handleAction } =
    useDiscoverPlayer();

  /* ── FlatList sections ─────────────────────────────────────────────── */
  type HomeSection =
    | { type: "rooms"; key: string; rooms: PublicRoomSummary[] }
    | { type: "lane"; key: string; lane: DiscoverLane }
    | { type: "newMusic"; key: string; tracks: PublicTrackSummary[] }
    | { type: "trending"; key: string; artists: PublicArtistSummary[] };

  const homeSections = useMemo<HomeSection[]>(() => {
    const result: HomeSection[] = [];
    if (releaseRooms.length > 0) {
      result.push({ type: "rooms", key: "__releaseRooms", rooms: releaseRooms });
    }
    result.push(...lanes.map((lane) => ({
      type: "lane" as const,
      key: lane.key,
      lane,
    })));
    if (trendingArtists.length > 0) {
      result.push({
        type: "trending",
        key: "__trending",
        artists: trendingArtists,
      });
    }
    return result;
  }, [releaseRooms, lanes, trendingArtists]);

  const renderHomeItem = useCallback(
    ({ item, index }: { item: HomeSection; index: number }) => {
      switch (item.type) {
        case "rooms":
          return (
            <View style={index > 0 ? s.laneGap : undefined}>
              <ReleaseRoomsSection
                rooms={item.rooms}
                onOpenAll={() => {
                  router.push("/(tabs)/rooms" as never);
                }}
                onOpenRoom={(room) => {
                  router.push({
                    pathname: "/album/[slug]/room",
                    params: { slug: room.release_identifier },
                  } as never);
                }}
              />
            </View>
          );
        case "lane":
          return (
            <View style={index > 0 ? s.laneGap : undefined}>
              <LaneSection
                lane={item.lane}
                activeId={activeId}
                playing={playing}
                progressValue={progressValue}
                onAction={handleAction}
              />
            </View>
          );
        case "newMusic":
          return (
            <View style={s.laneGap}>
              <SectionHeader bold="New" light="Music" />
              <NewMusicAlbums tracks={item.tracks} />
            </View>
          );
        case "trending":
          return (
            <View style={s.laneGap}>
              <SectionHeader bold="Trending" light="Artists" />
              <TrendingArtists
                artists={item.artists}
                followed={followed}
                onToggleFollow={toggleFollow}
              />
            </View>
          );
      }
    },
    [activeId, playing, progressValue, handleAction, followed, toggleFollow, router],
  );

  const extractKey = useCallback((item: HomeSection) => item.key, []);

  /* loading / empty */
  const hasAnyContent = homeSections.length > 0;
  const isSettlingInitialData = Boolean(
    !hasAnyContent &&
      (personalizedLoading ||
        personalizedFetching ||
        discoverLoading ||
        discoverFetching ||
        featuredLoading ||
        featuredFetching ||
        popularLoading ||
        popularFetching ||
        roomsLoading ||
        roomsFetching ||
        (isLoggedIn && (recentLoading || recentFetching))),
  );
  const hasStartupError = Boolean(
    !hasAnyContent &&
      (personalizedError ||
        discoverError ||
        featuredError ||
        popularError ||
        roomsError ||
        (isLoggedIn && recentError)),
  );

  if (isSettlingInitialData) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScreenHeader />
        <View style={s.scrollContent}>
          {[1, 2].map((lane) => (
            <View key={lane} style={lane > 1 ? s.laneGap : undefined}>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <ShimmerPlaceholder width={80} height={18} borderRadius={6} />
                <ShimmerPlaceholder width={60} height={18} borderRadius={6} />
              </View>
              <View style={s.trackList}>
                {[1, 2, 3, 4].map((row) => (
                  <View key={row} style={s.skeletonRow}>
                    <ShimmerPlaceholder
                      width={50}
                      height={50}
                      borderRadius={8}
                    />
                    <View style={{ flex: 1, gap: 8 }}>
                      <ShimmerPlaceholder
                        width="70%"
                        height={12}
                        borderRadius={6}
                      />
                      <ShimmerPlaceholder
                        width="45%"
                        height={10}
                        borderRadius={6}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAnyContent && hasStartupError) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScreenHeader />
        <View style={s.loadingWrap}>
          <Text style={s.emptyText}>Unable to load home right now</Text>
          <AnimatedPressable
            onPress={() => {
              onRefresh();
            }}
            style={s.retryBtn}
          >
            <Text style={s.retryLabel}>Retry</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAnyContent) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScreenHeader />
        <View style={s.loadingWrap}>
          <Text style={s.emptyText}>Nothing to show yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScreenHeader />
      <FlatList
        data={homeSections}
        keyExtractor={extractKey}
        renderItem={renderHomeItem}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 160 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
  },
  retryLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  roomsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roomsShowAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roomsShowAllLabel: {
    color: "rgba(238,238,242,0.52)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  roomsRail: {
    gap: 12,
    paddingRight: 8,
  },
  roomCard: {
    width: 176,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  roomArtwork: {
    width: "100%",
    height: 116,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  roomArtworkFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  roomArtworkFallbackLabel: {
    color: "rgba(238,238,242,0.65)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  roomCardCopy: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  roomCardTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  roomCardArtist: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  roomCardMeta: {
    color: tokens.colors.accentLight,
    fontSize: 11,
    marginTop: 4,
  },
  laneGap: { marginTop: 28 },
  trackList: {
    gap: 8,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
  },
});
