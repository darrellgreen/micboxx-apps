import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { VerifiedBadge, AnimatedPressable } from "@micboxx/ui";
import type { DashboardTrack } from "@/contracts/creator";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";

interface TrackHeroCardProps {
  track: DashboardTrack;
  boostActionLabel?: string;
  boostActionLoading?: boolean;
  onBoostPress: () => void;
}

export function TrackHeroCard({
  track,
  boostActionLabel = "Boost Track",
  boostActionLoading = false,
  onBoostPress,
}: TrackHeroCardProps) {
  const releaseYear = track.timestamps.createdAt
    ? new Date(track.timestamps.createdAt).getFullYear()
    : 2026; // Match mockup default if empty

  const renderStatusBadge = () => {
    const state = resolveTrackReleaseState(track.status);
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
          {track.assets.artworkUrl ? (
            <Image
              source={{ uri: track.assets.artworkUrl }}
              style={styles.artwork}
              contentFit="cover"
            />
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Ionicons name="musical-note" size={40} color={tokens.colors.textSecondary} />
            </View>
          )}
          {/* Pencil Edit Icon Overlay */}
          <AnimatedPressable style={styles.editIconOverlay} onPress={() => router.push(`/catalog/tracks/${track.id}/edit` as never)}>
            <Ionicons name="pencil" size={14} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
 
        <View style={styles.infoCol}>
          {renderStatusBadge()}
          
          <Text style={styles.title} numberOfLines={2}>
            {track.title || "Scarface Freestyle (Clean)"}
          </Text>

          <View style={styles.artistRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {track.owner.displayName || "Rick Ross"}
            </Text>
            <VerifiedBadge size={14} />
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {track.genre?.name || "Hip-Hop"} • {releaseYear}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <AnimatedPressable
          style={[styles.btnBase, styles.btnEdit]}
          onPress={() => router.push(`/catalog/tracks/${track.id}/edit` as never)}
          haptic="selection"
        >
          <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
          <Text style={styles.btnLabel}>Edit Track</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[styles.btnBase, styles.btnBoost]}
          onPress={onBoostPress}
          haptic="selection"
        >
          {boostActionLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="megaphone" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.btnLabel} numberOfLines={1}>
            {boostActionLabel}
          </Text>
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
    width: 110,
    height: 110,
  },
  artwork: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: tokens.colors.bgElevated,
  },
  artworkPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
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
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0, 179, 166, 0.15)",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#00B3A6",
    letterSpacing: 0,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
    letterSpacing: 0,
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  btnBoost: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "#00B3A6",
  },
  btnLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
