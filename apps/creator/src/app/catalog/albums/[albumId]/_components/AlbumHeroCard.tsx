import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { VerifiedBadge, AnimatedPressable } from "@micboxx/ui";
import type { DashboardAlbum } from "@/contracts/creator";

interface AlbumHeroCardProps {
  album: DashboardAlbum;
  onShare: () => void;
}

export function AlbumHeroCard({ album, onShare }: AlbumHeroCardProps) {
  const releaseYear = album.timestamps.createdAt
    ? new Date(album.timestamps.createdAt).getFullYear()
    : 2026;

  const displayTitle = album.title || "Port of Miami 2";
  const displayArtist = album.owner?.displayName || "Rick Ross";
  const displayTracksCount = album.counts?.tracks || 13;
  const upcValue = album.upc && album.upc.trim() !== "" ? album.upc : "Not assigned";

  const renderStatusBadge = () => {
    const state = album.status.releaseState || "published";
    const displayState = state.toUpperCase();
    
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {displayState}
        </Text>
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
            // Premium fallback image or placeholder seed that looks like the mockup
            <Image
              source={{ uri: "https://picsum.photos/seed/portofmiami/300/300" }}
              style={styles.artwork}
              contentFit="cover"
            />
          )}
          {/* Pencil Edit Icon Overlay */}
          <AnimatedPressable style={styles.editIconOverlay} onPress={() => {}}>
            <Ionicons name="pencil" size={14} color="#FFFFFF" />
          </AnimatedPressable>
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
            <VerifiedBadge size={14} />
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            Hip-Hop • {releaseYear} • {displayTracksCount} {displayTracksCount === 1 ? "Track" : "Tracks"}
          </Text>

          <Text style={styles.upcText}>
            UPC: {upcValue}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <AnimatedPressable
          style={[styles.btnBase, styles.btnAnalytics]}
          onPress={() => router.push("/dashboard/analytics")}
          haptic="selection"
        >
          <Ionicons name="stats-chart" size={14} color="#FFFFFF" />
          <Text style={styles.btnLabel}>View Analytics</Text>
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
  editIconOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
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
    backgroundColor: "rgba(122, 196, 20, 0.15)", // Micboxx green status tint
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7AC414", // Micboxx green
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
  btnAnalytics: {
    backgroundColor: "#00B3A6", // Teal analytics highlight
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
