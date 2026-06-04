import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { Button, VerifiedBadge } from "@micboxx/ui";
import type { DashboardTrack } from "@/contracts/creator";

interface TrackHeroCardProps {
  track: DashboardTrack;
  onShare: () => void;
}

const CARD_BG = "#131820";

export function TrackHeroCard({ track, onShare }: TrackHeroCardProps) {
  const releaseYear = track.timestamps.createdAt
    ? new Date(track.timestamps.createdAt).getFullYear()
    : null;

  const renderStatusBadge = () => {
    const state = track.status.releaseState;
    let badgeColor: string = tokens.colors.textSecondary;
    let badgeBg: string = "rgba(169, 180, 192, 0.12)";

    if (state === "published") {
      badgeColor = tokens.colors.success;
      badgeBg = "rgba(71, 194, 122, 0.12)";
    } else if (state === "scheduled") {
      badgeColor = tokens.colors.warning;
      badgeBg = "rgba(230, 184, 92, 0.12)";
    }

    return (
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>
          {state.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
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

        <View style={styles.infoCol}>
          {renderStatusBadge()}
          <Text style={styles.title} numberOfLines={2}>
            {track.title}
          </Text>

          <View style={styles.artistRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {track.owner.displayName}
            </Text>
            {track.owner.verifiedBadge ? (
              <View style={styles.verifiedWrap}>
                <VerifiedBadge size={14} />
              </View>
            ) : null}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {track.genre?.name ? `${track.genre.name} • ` : ""}
            {releaseYear ? String(releaseYear) : ""}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.btnFlex}>
          <Button
            label="View Analytics"
            tone="primary"
            size="sm"
            onPress={() => router.push("/dashboard/analytics")}
          />
        </View>
        <View style={styles.btnFlex}>
          <Button
            label="Share"
            tone="secondary"
            size="sm"
            onPress={onShare}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: tokens.radiusSystem.container,
    padding: 16,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    gap: 16,
  },
  artwork: {
    width: 100,
    height: 100,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgElevated,
  },
  artworkPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
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
    borderRadius: tokens.radiusSystem.pill,
  },
  badgeText: {
    fontSize: tokens.typography.xs,
    fontWeight: tokens.typography.bold,
    letterSpacing: 0.5,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.lg,
    fontWeight: tokens.typography.bold,
    lineHeight: 24,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  artist: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.medium,
  },
  verifiedWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  meta: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnFlex: {
    flex: 1,
  },
});
