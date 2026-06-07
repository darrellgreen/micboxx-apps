import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import type { DashboardAlbumSummary } from "@/contracts/creator";
import { getMyAlbums } from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { Screen, AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";

type AlbumFilter = "all" | "draft" | "scheduled" | "published";

function matchesFilter(album: DashboardAlbumSummary, filter: AlbumFilter) {
  if (filter === "draft") return album.status.releaseState === "draft";
  if (filter === "scheduled") return album.status.releaseState === "scheduled";
  if (filter === "published") return album.status.releaseState === "published";
  return true;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "Date unavailable";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Date unavailable";
  }
}

export default function AlbumsListScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const initialFilter: AlbumFilter =
    params.filter === "draft" ||
    params.filter === "scheduled" ||
    params.filter === "published"
      ? params.filter
      : "all";

  const [items, setItems] = useState<DashboardAlbumSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlbumFilter>(initialFilter);

  const unreadCount = useUnreadNotificationCount();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setError(null);
        try {
          const response = await getMyAlbums(1, 50);
          if (!active) return;
          setItems(response.albums);
        } catch (nextError) {
          if (!active) return;
          setError(
            nextError instanceof Error ? nextError.message : "Unable to load albums.",
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
    const draft = items.filter((item) => item.status.releaseState === "draft").length;
    const scheduled = items.filter(
      (item) => item.status.releaseState === "scheduled",
    ).length;
    const published = items.filter(
      (item) => item.status.releaseState === "published",
    ).length;
    return {
      all: items.length,
      draft,
      scheduled,
      published,
    };
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items],
  );

  // Dynamic header rendering
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
          <Text style={styles.headerTitle}>Releases</Text>
          <Text style={styles.headerSubtitle}>{filterCounts.published} Published · {filterCounts.draft} Draft</Text>
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

  const handleFilterChange = (val: AlbumFilter) => {
    if (val !== filter) {
      setFilter(val);
    }
  };

  return (
    <Screen header={renderCustomHeader()} contentContainerStyle={styles.screenContent}>
      {/* Create Release button - Left Aligned */}
      <View style={styles.actionsRow}>
        <AnimatedPressable
          style={styles.uploadBtn}
          onPress={() => router.push("/create/release")}
          haptic="selection"
        >
          <Ionicons name="disc-outline" size={16} color="#FFFFFF" />
          <Text style={styles.uploadBtnLabel}>Create Release</Text>
        </AnimatedPressable>
      </View>

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
          ].map((opt) => {
            const isActive = filter === opt.key;
            return (
              <AnimatedPressable
                key={opt.key}
                disabled={isActive}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilterChange(opt.key as AlbumFilter)}
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
          title="Loading albums"
          description="Pulling creator album rows from the dashboard endpoint."
        />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No albums in this filter"
          description="Try another state filter or create a new album."
        />
      ) : (
        /* Unified Albums Card container */
        <View style={styles.albumsCard}>
          {filteredItems.map((album, index) => {
            const dateText = formatDate(album.timestamps.createdAt);
            const isPublished = album.status.releaseState === "published";
            const isScheduled = album.status.releaseState === "scheduled";
            
            return (
              <View key={album.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                
                <AnimatedPressable
                  style={styles.albumRow}
                  onPress={() => {
                    if (album.status.releaseState === "draft" || album.status.releaseState === "scheduled") {
                      router.push(`/create/release?draftAlbumId=${album.id}` as never);
                    } else {
                      router.push(`/catalog/albums/${album.id}` as never);
                    }
                  }}
                  haptic="selection"
                >
                  {/* Left: Artwork */}
                  {album.artworkUrl ? (
                    <Image
                      source={{ uri: album.artworkUrl }}
                      style={styles.albumArtwork}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.artworkPlaceholder}>
                      <Ionicons name="disc-outline" size={24} color={tokens.colors.textSecondary} />
                    </View>
                  )}

                  {/* Center info */}
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumTitle} numberOfLines={1}>
                      {album.title}
                    </Text>
                    <Text style={styles.albumSubtitle} numberOfLines={1}>
                      {album.counts.tracks} tracks • {album.counts.publicReadyTracks} public-ready
                    </Text>
                    <View style={styles.albumMetaRow}>
                      <Ionicons name="albums-outline" size={12} color={tokens.colors.textSecondary} />
                      <Text style={styles.albumMetaText}>
                        Album Code • {album.slug}
                      </Text>
                    </View>
                  </View>

                  {/* Right Status badge and date */}
                  <View style={styles.albumRight}>
                    <View style={[styles.statusBadge, isPublished && styles.statusBadgePublished, isScheduled && styles.statusBadgeScheduled]}>
                      <Text style={[styles.statusBadgeText, isPublished && styles.statusBadgeTextPublished, isScheduled && styles.statusBadgeTextScheduled]}>
                        {album.status.releaseState.toUpperCase()}
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
  actionsRow: {
    flexDirection: "row",
  },
  uploadBtn: {
    backgroundColor: "#00B3A6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  uploadBtnLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
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
  albumsCard: {
    padding: 16,
  },
  albumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  albumArtwork: {
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
  albumInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
    minWidth: 0,
  },
  albumTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  albumSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  albumMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  albumMetaText: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  albumRight: {
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
  statusBadgeScheduled: {
    backgroundColor: "rgba(167, 139, 250, 0.14)",
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
  statusBadgeTextScheduled: {
    color: "#a78bfa",
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
