import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Skeleton } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import type {
  LibraryOwnedAlbum,
  LibraryOwnedTrack,
} from "@/features/library/libraryTypes";

export type PurchasedView = "tracks" | "albums";
export type PurchasedSort = "recent" | "oldest" | "alpha";
export type PurchasedLayout = "list" | "grid";

export interface PurchasesPanelProps {
  albums: LibraryOwnedAlbum[];
  tracks: LibraryOwnedTrack[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  view: PurchasedView;
  onViewChange: (view: PurchasedView) => void;
  sortBy: PurchasedSort;
  onSortChange: (sortBy: PurchasedSort) => void;
  layoutMode: PurchasedLayout;
  onLayoutModeChange: (layoutMode: PurchasedLayout) => void;
}

export function PurchasesPanel({
  albums,
  tracks,
  loading,
  error,
  view,
  onViewChange,
  sortBy,
  onSortChange,
  layoutMode,
  onLayoutModeChange,
}: PurchasesPanelProps) {
  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={{ gap: 12, paddingVertical: 8 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Skeleton width={44} height={44} borderRadius={6} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="50%" height={13} borderRadius={6} />
                <Skeleton width="30%" height={11} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Unable to load purchases</Text>
        <Text style={styles.description}>{error}</Text>
      </View>
    );
  }

  const sortedTracks = sortPurchasedTracks(tracks, sortBy);
  const sortedAlbums = sortPurchasedAlbums(albums, sortBy);
  const tabs: { id: PurchasedView; label: string; count: number }[] = [
    { id: "tracks", label: "Tracks", count: tracks.length },
    { id: "albums", label: "Albums", count: albums.length },
  ];
  const activeCount = view === "tracks" ? sortedTracks.length : sortedAlbums.length;
  const isGridLayout = layoutMode === "grid";

  return (
    <View style={styles.purchasedPage}>
      <View style={styles.purchasedTabs}>
        {tabs.map((tab) => {
          const selected = view === tab.id;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onViewChange(tab.id)}
              style={({ pressed }: { pressed: boolean }) => [
                styles.purchasedTab,
                selected && styles.purchasedTabActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.purchasedTabLabel,
                  selected && styles.purchasedTabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              <Text
                style={[
                  styles.purchasedTabCount,
                  selected && styles.purchasedTabLabelActive,
                ]}
              >
                {tab.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.purchasedToolbar}>
        <View style={styles.purchasedTitleRow}>
          <Text style={styles.purchasedViewTitle}>
            {view === "tracks" ? "Tracks" : "Albums"}
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{activeCount}</Text>
          </View>
        </View>

        <View style={styles.purchasedControlRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.purchasedSortOptions}
          >
            {(["recent", "oldest", "alpha"] as const).map((option) => {
              const selected = sortBy === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => onSortChange(option)}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.purchasedSortChip,
                    selected && styles.purchasedSortChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.purchasedSortLabel,
                      selected && styles.purchasedSortLabelActive,
                    ]}
                  >
                    {getPurchasedSortLabel(option)}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={tokens.colors.accentLight}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.purchasedLayoutToggle}>
            <Pressable
              onPress={() => onLayoutModeChange("list")}
              style={({ pressed }: { pressed: boolean }) => [
                styles.purchasedLayoutButton,
                layoutMode === "list" && styles.purchasedLayoutButtonActive,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Show list view"
            >
              <Ionicons
                name="list-outline"
                size={18}
                color={
                  layoutMode === "list"
                    ? tokens.colors.accentLight
                    : tokens.colors.textSecondary
                }
              />
            </Pressable>
            <Pressable
              onPress={() => onLayoutModeChange("grid")}
              style={({ pressed }: { pressed: boolean }) => [
                styles.purchasedLayoutButton,
                layoutMode === "grid" && styles.purchasedLayoutButtonActive,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Show grid view"
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={
                  layoutMode === "grid"
                    ? tokens.colors.accentLight
                    : tokens.colors.textSecondary
                }
              />
            </Pressable>
          </View>
        </View>
      </View>

      {view === "tracks" ? (
        sortedTracks.length > 0 ? (
          isGridLayout ? (
            <PurchasedGrid>
              {sortedTracks.map((track) => (
                <PurchasedGridCard
                  key={`track-grid-${track.uuid || track.id}`}
                  title={track.title}
                  subtitle={track.artistName}
                  meta={`Acquired ${formatShortDate(track.acquiredAt) ?? ""}`}
                  artwork={track.artwork}
                />
              ))}
            </PurchasedGrid>
          ) : (
            <View style={styles.purchasedList}>
              {sortedTracks.map((track, index) => (
                <PurchasedRow
                  key={`track-${track.uuid || track.id}`}
                  index={index + 1}
                  title={track.title}
                  subtitle={
                    track.albumTitle
                      ? `${track.artistName} · ${track.albumTitle}`
                      : track.artistName
                  }
                  meta={`Purchased · ${formatShortDate(track.acquiredAt) ?? ""}`}
                  artwork={track.artwork}
                />
              ))}
            </View>
          )
        ) : (
          <PurchasedEmptyState title="No purchased tracks yet" />
        )
      ) : sortedAlbums.length > 0 ? (
        isGridLayout ? (
          <PurchasedGrid>
            {sortedAlbums.map((album) => (
              <PurchasedGridCard
                key={`album-grid-${album.uuid || album.id}`}
                title={album.title}
                subtitle={album.artistName}
                meta={`Acquired ${formatShortDate(album.acquiredAt) ?? ""}`}
                artwork={album.artwork}
              />
            ))}
          </PurchasedGrid>
        ) : (
          <View style={styles.purchasedList}>
            {sortedAlbums.map((album, index) => (
              <PurchasedRow
                key={`album-${album.uuid || album.id}`}
                index={index + 1}
                title={album.title}
                subtitle={album.artistName}
                meta={`Purchased · ${formatShortDate(album.acquiredAt) ?? ""}`}
                artwork={album.artwork}
              />
            ))}
          </View>
        )
      ) : (
        <PurchasedEmptyState title="No purchased albums yet" />
      )}
    </View>
  );
}

function PurchasedGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <View style={styles.purchasedGrid}>{children}</View>;
}

function PurchasedRow({
  index,
  title,
  subtitle,
  meta,
  artwork,
}: {
  index: number;
  title: string;
  subtitle: string;
  meta: string;
  artwork: string | null;
}) {
  return (
    <View style={styles.purchasedRow}>
      <Text style={styles.purchasedIndex}>{index}</Text>
      <View style={styles.purchasedArtwork}>
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.purchasedArtworkText}>
            {title.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.purchasedCopy}>
        <Text numberOfLines={1} style={styles.purchasedTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.purchasedSubtitle}>
          {subtitle}
        </Text>
        <Text numberOfLines={1} style={styles.purchasedMeta}>
          {meta.trim()}
        </Text>
      </View>
      <View style={styles.ownedBadge}>
        <Text style={styles.ownedBadgeText}>Owned</Text>
      </View>
    </View>
  );
}

function PurchasedGridCard({
  title,
  subtitle,
  meta,
  artwork,
}: {
  title: string;
  subtitle: string;
  meta: string;
  artwork: string | null;
}) {
  return (
    <View style={styles.purchasedGridCard}>
      <View style={styles.purchasedGridArtwork}>
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.purchasedArtworkText}>
            {title.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.purchasedGridTitle}>
        {title}
      </Text>
      <Text numberOfLines={1} style={styles.purchasedGridSubtitle}>
        {subtitle}
      </Text>
      <Text numberOfLines={1} style={styles.purchasedGridMeta}>
        {meta.trim()}
      </Text>
    </View>
  );
}

function PurchasedEmptyState({ title }: { title: string }) {
  return (
    <View style={styles.purchasedEmptyState}>
      <View style={styles.purchasedEmptyIconWrap}>
        <Ionicons
          name="musical-notes-outline"
          size={34}
          color={tokens.colors.textSecondary}
        />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.description}>
        {title.includes("tracks")
          ? "Tracks you purchase will appear here."
          : "Albums you purchase will appear here."}
      </Text>
    </View>
  );
}

function sortPurchasedTracks(
  tracks: LibraryOwnedTrack[],
  sortBy: PurchasedSort,
): LibraryOwnedTrack[] {
  const next = [...tracks];

  if (sortBy === "alpha") {
    next.sort((a, b) => a.title.localeCompare(b.title));
    return next;
  }

  next.sort((a, b) =>
    sortBy === "oldest"
      ? a.acquiredAt - b.acquiredAt
      : b.acquiredAt - a.acquiredAt,
  );

  return next;
}

function sortPurchasedAlbums(
  albums: LibraryOwnedAlbum[],
  sortBy: PurchasedSort,
): LibraryOwnedAlbum[] {
  const next = [...albums];

  if (sortBy === "alpha") {
    next.sort((a, b) => a.title.localeCompare(b.title));
    return next;
  }

  next.sort((a, b) =>
    sortBy === "oldest"
      ? a.acquiredAt - b.acquiredAt
      : b.acquiredAt - a.acquiredAt,
  );

  return next;
}

function getPurchasedSortLabel(sortBy: PurchasedSort): string {
  if (sortBy === "oldest") return "Oldest Added";
  if (sortBy === "alpha") return "Title A-Z";
  return "Recently Added";
}

function formatShortDate(secondsValue: number | null | undefined): string | null {
  if (!secondsValue) {
    return null;
  }

  return new Date(secondsValue * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    gap: 14,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  description: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  purchasedPage: {
    gap: 18,
  },
  purchasedTabs: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    padding: 4,
  },
  purchasedTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  purchasedTabActive: {
    backgroundColor: tokens.colors.accentDim,
  },
  purchasedTabLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  purchasedTabLabelActive: {
    color: tokens.colors.accentLight,
  },
  purchasedTabCount: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchasedToolbar: {
    gap: 12,
  },
  purchasedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  purchasedViewTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  countPill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  countPillText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchasedControlRow: {
    gap: 10,
  },
  purchasedSortOptions: {
    gap: 8,
    paddingRight: 20,
  },
  purchasedSortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 13,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  purchasedSortChipActive: {
    backgroundColor: tokens.colors.accentDim,
    borderColor: tokens.colors.borderAccent,
  },
  purchasedSortLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchasedSortLabelActive: {
    color: tokens.colors.accentLight,
  },
  purchasedLayoutToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 4,
  },
  purchasedLayoutButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  purchasedLayoutButtonActive: {
    backgroundColor: tokens.colors.accentDim,
  },
  purchasedList: {
    borderRadius: 8,
    overflow: "hidden",
  },
  purchasedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  purchasedGridCard: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 6,
  },
  purchasedGridArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  purchasedGridTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  purchasedGridSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  purchasedGridMeta: {
    color: tokens.colors.textDisabled,
    fontSize: 11,
  },
  purchasedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  purchasedIndex: {
    width: 18,
    textAlign: "center",
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  purchasedArtwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  purchasedArtworkText: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  purchasedCopy: {
    flex: 1,
    minWidth: 0,
  },
  purchasedTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  purchasedSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  purchasedMeta: {
    color: tokens.colors.textDisabled,
    fontSize: 11,
    marginTop: 4,
  },
  ownedBadge: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: tokens.colors.accentDim,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  ownedBadgeText: {
    color: tokens.colors.accentLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  purchasedEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 260,
    padding: 24,
  },
  purchasedEmptyIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  pressed: {
    opacity: 0.82,
  },
});
