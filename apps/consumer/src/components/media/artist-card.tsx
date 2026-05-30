import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { hapticSelection, hapticSuccess } from "@/hooks/useHaptic";
import type { PublicArtistSummary } from "@micboxx/contracts";
import { formatCount } from "@/lib/formatters";
import { tokens } from "@/theme/tokens";

interface ArtistCardProps {
  artist: PublicArtistSummary;
  onPress: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  followerCount?: number | null;
  layout?: "card" | "row";
}

export const ArtistCard = React.memo(function ArtistCard({
  artist,
  onPress,
  onFollow,
  isFollowing = false,
  followerCount,
  layout = "card",
}: ArtistCardProps) {
  if (layout === "row") {
    return (
      <AnimatedPressable onPress={onPress} style={styles.row}>
        <Avatar artist={artist} size={54} />
        <View style={styles.rowInfo}>
          <Text numberOfLines={1} style={styles.rowName}>
            {artist.displayName}
          </Text>
          {followerCount != null ? (
            <Text style={styles.rowMeta}>
              {formatCount(followerCount)} followers
            </Text>
          ) : null}
        </View>
        {onFollow ? (
          <AnimatedPressable
            onPress={() => {
              if (isFollowing) hapticSelection();
              else hapticSuccess();
              onFollow();
            }}
            scaleValue={0.95}
            style={[
              styles.followButton,
              isFollowing && styles.followButtonActive,
            ]}
          >
            <Text
              style={[
                styles.followLabel,
                isFollowing && styles.followLabelActive,
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </AnimatedPressable>
        ) : null}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable onPress={onPress} style={styles.card}>
      <View style={styles.banner}>
        {artist.coverUrl ? (
          <Image
            source={{ uri: artist.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFillObject, styles.bannerFallback]}
          />
        )}
      </View>
      <View style={styles.cardAvatar}>
        <Avatar artist={artist} size={62} />
      </View>
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardName}>
          {artist.displayName}
        </Text>
        {followerCount != null ? (
          <Text style={styles.cardMeta}>
            {formatCount(followerCount)} followers
          </Text>
        ) : null}
        {onFollow ? (
          <AnimatedPressable
            onPress={() => {
              if (isFollowing) hapticSelection();
              else hapticSuccess();
              onFollow();
            }}
            scaleValue={0.95}
            style={[
              styles.followButton,
              styles.fullWidthButton,
              isFollowing && styles.followButtonActive,
            ]}
          >
            <Text
              style={[
                styles.followLabel,
                isFollowing && styles.followLabelActive,
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </AnimatedPressable>
  );
});

function Avatar({
  artist,
  size,
}: {
  artist: PublicArtistSummary;
  size: number;
}) {
  const initial = artist.displayName[0]?.toUpperCase() ?? "?";

  return (
    <View
      style={[
        styles.avatarFrame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {artist.avatarUrl ? (
        <Image
          source={{ uri: artist.avatarUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={[styles.avatarInitial, { fontSize: size * 0.34 }]}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.gridSoft,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: tokens.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  rowMeta: {
    color: tokens.colors.textMuted,
    fontSize: 12,
  },
  card: {
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderGlass,
    backgroundColor: tokens.colors.panelGlassStrong,
    overflow: "hidden",
  },
  banner: {
    height: 92,
    backgroundColor: tokens.colors.panelStrong,
  },
  bannerFallback: {
    backgroundColor: tokens.colors.ctaDim,
  },
  cardAvatar: {
    position: "absolute",
    left: 16,
    top: 58,
  },
  cardBody: {
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  cardName: {
    color: tokens.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    color: tokens.colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  avatarFrame: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: tokens.colors.panelStrong,
    backgroundColor: tokens.colors.panelStrong,
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: tokens.colors.accentLight,
    fontWeight: "800",
  },
  followButton: {
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderGlass,
    backgroundColor: tokens.colors.panelMuted,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  fullWidthButton: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  followButtonActive: {
    backgroundColor: tokens.colors.tealDim,
    borderColor: "transparent",
  },
  followLabel: {
    color: tokens.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  followLabelActive: {
    color: tokens.colors.teal,
  },
});
