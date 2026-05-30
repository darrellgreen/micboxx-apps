import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@micboxx/ui";
import type { PublicTrackSummary } from "@micboxx/contracts";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { formatDuration } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

interface TrackCardProps {
  track: PublicTrackSummary;
  onPress: () => void;
  onPlay: () => void;
  layout?: "card" | "row";
  rank?: number;
  rowVariant?: "default" | "browser";
}

export function TrackCard({
  track,
  onPress,
  onPlay,
  layout = "card",
  rank,
  rowVariant = "default",
}: TrackCardProps) {
  const { currentItem, playbackState, progressPercent } = useNowPlaying();
  const isActive = currentItem?.id === String(track.id);
  const isPlaying =
    isActive && (playbackState === "playing" || playbackState === "buffering");

  if (layout === "row") {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.row,
          rowVariant === "browser" && styles.browserRow,
          isActive && styles.rowActive,
          isActive && rowVariant === "browser" && styles.browserRowActive,
        ]}
      >
        {rank != null ? (
          <Text
            style={[
              styles.rank,
              rowVariant === "browser" && styles.browserRank,
            ]}
          >
            {rank}
          </Text>
        ) : null}
        <View style={styles.rowArtwork}>
          {track.artworkUrl ? (
            <Image
              source={{ uri: track.artworkUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFillObject, styles.artworkPlaceholder]}
            />
          )}
        </View>
        <View style={styles.rowBody}>
          <Text
            numberOfLines={1}
            style={[
              styles.rowTitle,
              rowVariant === "browser" && styles.browserRowTitle,
            ]}
          >
            {track.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.rowSubtitle,
              rowVariant === "browser" && styles.browserRowSubtitle,
            ]}
          >
            {track.artist?.displayName ?? "Unknown artist"}
          </Text>
        </View>
        <View style={styles.rowRight}>
          {isActive ? (
            <View style={styles.rowPlaybackState}>
              <View
                style={[
                  styles.stateBar,
                  styles.stateBarTall,
                  isPlaying && styles.stateBarActive,
                ]}
              />
              <View
                style={[
                  styles.stateBar,
                  isPlaying && styles.stateBarActive,
                  { opacity: 0.85 },
                ]}
              />
              <View
                style={[
                  styles.stateBar,
                  styles.stateBarShort,
                  isPlaying && styles.stateBarActive,
                  { opacity: 0.7 },
                ]}
              />
            </View>
          ) : null}
          <Text
            style={[
              styles.rowDuration,
              rowVariant === "browser" && styles.browserRowDuration,
            ]}
          >
            {isActive && isPlaying
              ? `${Math.round(progressPercent * 100)
                  .toString()
                  .padStart(2, "0")}%`
              : formatDuration(track.duration)}
          </Text>
          <AnimatedPressable
            onPress={onPlay}
            hitSlop={8}
            scaleValue={0.9}
            style={[
              styles.rowPlayButton,
              rowVariant === "browser" && styles.browserRowPlayButton,
            ]}
          >
            <Ionicons
              name={isActive && isPlaying ? "pause" : "play"}
              size={14}
              color={tokens.colors.text}
            />
          </AnimatedPressable>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable onPress={onPress} style={styles.card}>
      <View style={styles.artwork}>
        {track.artworkUrl ? (
          <Image
            source={{ uri: track.artworkUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFillObject, styles.artworkPlaceholder]}
          />
        )}
        <View style={styles.cardGlow} />
        <AnimatedPressable
          onPress={onPlay}
          scaleValue={0.93}
          style={styles.playOverlay}
        >
          <View style={styles.playCircle}>
            <Ionicons name="play" size={20} color="#fff" />
          </View>
        </AnimatedPressable>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text numberOfLines={1} style={styles.title}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist?.displayName ?? "Unknown artist"}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.genrePill}>
            <Text style={styles.genreText}>
              {track.genre?.name ?? "Open format"}
            </Text>
          </View>
          <Text style={styles.meta}>{formatDuration(track.duration)}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const ARTWORK_HEIGHT = 180;

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderGlass,
    backgroundColor: tokens.colors.panelGlassStrong,
    overflow: "hidden",
  },
  artwork: {
    height: ARTWORK_HEIGHT,
    backgroundColor: tokens.colors.panelStrong,
  },
  artworkPlaceholder: {
    backgroundColor: tokens.colors.panelStrong,
  },
  cardGlow: {
    position: "absolute",
    right: -24,
    bottom: -36,
    width: 128,
    height: 128,
    borderRadius: 999,
    backgroundColor: tokens.colors.ctaGlow,
    opacity: 0.2,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 14,
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: tokens.colors.cta,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.shadows.cta,
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  cardInfo: {
    gap: 4,
  },
  title: {
    color: tokens.colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  artist: {
    color: tokens.colors.textMuted,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  genrePill: {
    borderRadius: 999,
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreText: {
    color: tokens.colors.accentLight,
    fontSize: 11,
    fontWeight: "700",
  },
  meta: {
    color: tokens.colors.textSubtle,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: "rgba(38,230,207,0.08)",
    backgroundColor: "rgba(8,53,70,0.58)",
  },
  browserRow: {
    borderWidth: 1,
    borderRadius: tokens.radii.sm,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowActive: {
    backgroundColor: "rgba(16,87,96,0.72)",
    borderColor: "rgba(185,255,93,0.16)",
  },
  browserRowActive: {
    backgroundColor: "rgba(34,211,197,0.10)",
    borderColor: "rgba(34,211,197,0.28)",
  },
  rank: {
    color: tokens.colors.accentWarm,
    fontSize: 13,
    fontWeight: "800",
    width: 20,
    textAlign: "center",
  },
  browserRank: {
    width: 18,
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  rowArtwork: {
    width: 52,
    height: 52,
    borderRadius: tokens.radii.lg,
    overflow: "hidden",
    backgroundColor: tokens.colors.panelStrong,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: tokens.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  browserRowTitle: {
    fontSize: 15,
  },
  rowSubtitle: {
    color: tokens.colors.textMuted,
    fontSize: 12,
  },
  browserRowSubtitle: {
    color: tokens.colors.textSecondary,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  rowPlaybackState: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 14,
  },
  stateBar: {
    width: 3,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  stateBarTall: {
    height: 14,
  },
  stateBarShort: {
    height: 7,
  },
  stateBarActive: {
    backgroundColor: "#B9FF5D",
  },
  rowDuration: {
    color: tokens.colors.text,
    fontSize: 11,
  },
  browserRowDuration: {
    color: tokens.colors.textSecondary,
    minWidth: 36,
    textAlign: "right",
  },
  rowPlayButton: {
    width: 34,
    height: 34,
    borderRadius: tokens.radii.xl,
    backgroundColor: "rgba(38,230,207,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  browserRowPlayButton: {
    backgroundColor: "rgba(34,211,197,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,211,197,0.18)",
  },
});
