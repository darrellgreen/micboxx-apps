import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, VerifiedBadge } from "@micboxx/ui";
import type { DashboardAlbum } from "@/contracts/creator";

interface AlbumHeroCardProps {
  album: DashboardAlbum;
  onShare: () => void;
}

export function AlbumHeroCard({ album, onShare }: AlbumHeroCardProps) {
  const releaseYear = album.timestamps.createdAt
    ? new Date(album.timestamps.createdAt).getFullYear()
    : null;

  const displayTitle = album.title?.trim() || "Untitled release";
  const displayArtist = album.owner?.displayName?.trim() || "Artist not set";
  const displayTracksCount = album.counts.tracks;
  const upcValue = album.upc && album.upc.trim() !== "" ? album.upc : "Not assigned";
  const metaParts = [
    "Release",
    releaseYear ? String(releaseYear) : null,
    `${displayTracksCount} ${displayTracksCount === 1 ? "Track" : "Tracks"}`,
  ].filter((part): part is string => Boolean(part));

  const renderStatusBadge = () => {
    const state = album.status.releaseState || "published";
    const displayState = state.toUpperCase();
    const badgeStyle = state === "scheduled"
      ? styles.badgeScheduled
      : state === "published"
        ? styles.badge
        : styles.badgeDraft;
    const badgeTextStyle = state === "scheduled"
      ? styles.badgeTextScheduled
      : state === "published"
        ? styles.badgeText
        : styles.badgeTextDraft;

    return (
      <View style={badgeStyle}>
        <Text style={badgeTextStyle}>{displayState}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.artworkContainer}>
          {album.artworkUrl ? (
            <Image
              source={{ uri: album.artworkUrl }}
              style={styles.artwork}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Ionicons name="disc-outline" size={34} color={tokens.colors.textSecondary} />
            </View>
          )}
        </View>

        <View style={styles.infoCol}>
          {renderStatusBadge()}
          
          <Text style={styles.title} numberOfLines={2}>
            {displayTitle}
          </Text>

          <View style={styles.artistRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {displayArtist}
            </Text>
            {album.owner?.verifiedBadge ? <VerifiedBadge size={14} /> : null}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {metaParts.join(" • ")}
          </Text>

          <Text style={styles.upcText}>
            UPC: {upcValue}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <AnimatedPressable
          style={[styles.btnBase, styles.btnEdit]}
          onPress={() => router.push(`/catalog/albums/${album.id}/edit` as never)}
          haptic="selection"
        >
          <Ionicons name="pencil-outline" size={14} color="#FFFFFF" />
          <Text style={styles.btnLabel}>Edit Album</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[styles.btnBase, styles.btnShare]}
          onPress={onShare}
          haptic="selection"
        >
          <Ionicons name="share-outline" size={14} color="#FFFFFF" />
          <Text style={styles.btnLabel}>Share</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 4,
  },
  topRow: {
    flexDirection: "row",
    gap: 16,
  },
  artworkContainer: {
    position: "relative",
    width: 120,
    height: 120,
  },
  artwork: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: tokens.colors.bgElevated,
  },
  artworkPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(122, 196, 20, 0.15)",
  },
  badgeScheduled: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(167, 139, 250, 0.14)",
  },
  badgeDraft: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7AC414",
    letterSpacing: 0.5,
  },
  badgeTextScheduled: {
    fontSize: 9,
    fontWeight: "800",
    color: "#a78bfa",
    letterSpacing: 0.5,
  },
  badgeTextDraft: {
    fontSize: 9,
    fontWeight: "800",
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  artist: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.semibold,
  },
  meta: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  upcText: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnBase: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnEdit: {
    backgroundColor: "#00B3A6", // Keep the primary highlight color of the main button
  },
  btnShare: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  btnLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
