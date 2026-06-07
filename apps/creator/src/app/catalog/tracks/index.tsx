import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import Svg, { Circle, Path, Line } from "react-native-svg";

import type { DashboardTrackSummary } from "@/contracts/creator";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { getMyTracks } from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { Screen, AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";

type TrackFilter = "all" | "draft" | "scheduled" | "published" | "failed";

function matchesFilter(track: DashboardTrackSummary, filter: TrackFilter) {
  const state = resolveTrackReleaseState(track.status);
  if (filter === "draft") return state === "draft";
  if (filter === "scheduled") return state === "scheduled";
  if (filter === "published") return state === "published";
  if (filter === "failed") return track.status.processing === "failed";
  return true;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "May 22, 2025";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "May 22, 2025";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "May 22, 2025";
  }
}

export default function TracksListScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const initialFilter: TrackFilter =
    params.filter === "draft" ||
    params.filter === "scheduled" ||
    params.filter === "published" ||
    params.filter === "failed"
      ? params.filter
      : "all";

  const [items, setItems] = useState<DashboardTrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TrackFilter>(initialFilter);
  
  const unreadCount = useUnreadNotificationCount();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setError(null);
        try {
          const response = await getMyTracks(1, 50);
          if (!active) return;
          setItems(response.tracks);
        } catch (nextError) {
          if (!active) return;
          setError(
            nextError instanceof Error ? nextError.message : "Unable to load tracks.",
          );
        } finally {
          if (active) setLoading(false);
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, []),
  );

  const filterCounts = useMemo(() => {
    const draft = items.filter((item) => {
      const state = resolveTrackReleaseState(item.status);
      return state === "draft";
    }).length;
    const scheduled = items.filter((item) => {
      const state = resolveTrackReleaseState(item.status);
      return state === "scheduled";
    }).length;
    const published = items.filter((item) => {
      const state = resolveTrackReleaseState(item.status);
      return state === "published";
    }).length;
    const failed = items.filter((item) => item.status.processing === "failed").length;
    return {
      all: items.length,
      draft,
      scheduled,
      published,
      failed,
    };
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items],
  );

  // Dynamic header rendering matching the mockup style
  const renderCustomHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Left: Back button */}
        <AnimatedPressable
          style={styles.circularBtn}
          onPress={() => router.replace("/(tabs)/catalog")}
          haptic="selection"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </AnimatedPressable>

        {/* Center: Title & Subtitle */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Tracks</Text>
          <Text style={styles.headerSubtitle}>{filterCounts.published} Published</Text>
        </View>

        {/* Right: Notifications & Ellipsis Menu */}
        <View style={styles.headerRightContainer}>
          <AnimatedPressable
            style={styles.circularBtn}
            onPress={() => router.push("/audience/notifications")}
            haptic="selection"
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <View style={styles.badgeWrap} pointerEvents="none">
              <UnreadBadge count={unreadCount} />
            </View>
          </AnimatedPressable>

          <AnimatedPressable style={styles.circularBtn} onPress={() => {}} haptic="selection">
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  const handleFilterChange = (val: TrackFilter) => {
    if (val !== filter) {
      setFilter(val);
    }
  };

  return (
    <Screen header={renderCustomHeader()} contentContainerStyle={styles.screenContent}>
      {/* Pill Filter Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: "all", label: "All", count: filterCounts.all },
            { key: "draft", label: "Drafts", count: filterCounts.draft },
            { key: "scheduled", label: "Scheduled", count: filterCounts.scheduled },
            { key: "published", label: "Published", count: filterCounts.published },
            { key: "failed", label: "Failed", count: filterCounts.failed },
          ].map((opt) => {
            const isActive = filter === opt.key;
            return (
              <AnimatedPressable
                key={opt.key}
                disabled={isActive}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilterChange(opt.key as TrackFilter)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {opt.label} • {opt.count}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel
          title="Loading tracks"
          description="Pulling creator track rows from the dashboard endpoint."
        />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No tracks in this filter"
          description="Try another state filter or upload a new track."
        />
      ) : (
        /* Unified Tracks Card container */
        <View style={styles.tracksCard}>
          {filteredItems.map((track, index) => {
            const durationText = formatDuration(track.duration || 180);
            const dateText = formatDate(track.timestamps.createdAt);
            const displayState = resolveTrackReleaseState(track.status);
            const isPublished = displayState === "published";
            
            return (
              <View key={track.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                
                <AnimatedPressable
                  style={styles.trackRow}
                  onPress={() => router.push(`/catalog/tracks/${track.id}` as never)}
                  haptic="selection"
                >
                  {/* Left: Artwork */}
                  {track.artworkUrl ? (
                    <Image
                      source={{ uri: track.artworkUrl }}
                      style={styles.trackArtwork}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.artworkPlaceholder}>
                      <Ionicons name="musical-note" size={24} color={tokens.colors.textSecondary} />
                    </View>
                  )}

                  {/* Center info */}
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.trackSubtitle} numberOfLines={1}>
                      {track.album?.title || "MicBoxx Singles"}
                    </Text>
                    <View style={styles.trackMetaRow}>
                      <Ionicons name="musical-note" size={12} color={tokens.colors.textSecondary} />
                      <Text style={styles.trackMetaText}>
                        {track.genre?.name || "Genre"} • {durationText}
                      </Text>
                    </View>
                  </View>

                  {/* Right Status badge and chevron */}
                  <View style={styles.trackRight}>
                    <View style={[styles.statusBadge, isPublished && styles.statusBadgePublished]}>
                      <Text style={[styles.statusBadgeText, isPublished && styles.statusBadgeTextPublished]}>
                        {displayState.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{dateText}</Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={tokens.colors.textSecondary}
                    style={styles.chevron}
                  />
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgApp,
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  headerRightContainer: {
    flexDirection: "row",
    gap: 8,
  },
  badgeWrap: {
    position: "absolute",
    top: 2,
    right: 1,
  },
  screenContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  filterBarContainer: {
    backgroundColor: "#131820",
    borderRadius: 12,
    padding: 4,
  },
  filterScroll: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 1,
  },
  filterChipActive: {
    backgroundColor: "rgba(0, 179, 166, 0.15)",
  },
  filterChipText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#00B3A6",
    fontWeight: "700",
  },
  tracksCard: {
    padding: 16,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackArtwork: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: tokens.colors.bgApp,
  },
  artworkPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: tokens.colors.bgApp,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
    minWidth: 0,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  trackSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  trackMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trackMetaText: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  trackRight: {
    alignItems: "flex-end",
    gap: 6,
    marginRight: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(169, 180, 192, 0.12)",
  },
  statusBadgePublished: {
    backgroundColor: "rgba(71, 194, 122, 0.12)",
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
  },
  statusBadgeTextPublished: {
    color: "#47C27A",
  },
  dateText: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  chevron: {
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginVertical: 12,
  },
});
