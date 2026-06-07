import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardAlbum } from "@/contracts/creator";

const CARD_BG = "#131820";

interface TrackRowProps {
  index: number;
  title: string;
  trackId: number;
}

function TrackRow({ index, title, trackId }: TrackRowProps) {
  return (
    <AnimatedPressable
      onPress={() => router.push(`/catalog/tracks/${trackId}` as never)}
      style={styles.row}
      haptic="selection"
    >
      <View style={styles.left}>
        <Text style={styles.index}>{index}.</Text>
        <Text style={styles.trackTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
    </AnimatedPressable>
  );
}

interface AlbumTrackPreviewProps {
  album: DashboardAlbum;
  onViewAll: () => void;
}

export function AlbumTrackPreview({ album, onViewAll }: AlbumTrackPreviewProps) {
  const displayCount = album.counts.tracks;
  const previewTracks = album.tracks.slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Tracks ({displayCount})</Text>
      </View>

      {previewTracks.length > 0 ? (
        <>
          <View style={styles.list}>
            {previewTracks.map((track, idx) => (
              <TrackRow
                key={track.trackId}
                index={idx + 1}
                title={track.title}
                trackId={track.trackId}
              />
            ))}
          </View>

          <AnimatedPressable style={styles.viewAllCta} onPress={onViewAll} haptic="selection">
            <Text style={styles.ctaText}>View All Tracks</Text>
            <Ionicons name="arrow-forward" size={14} color="#00B3A6" />
          </AnimatedPressable>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={22} color={tokens.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No tracks added yet</Text>
          <Text style={styles.emptyCopy}>
            Tracks will be shown here once they are added to this release draft.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  index: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    width: 20,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  viewAllCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  ctaText: {
    color: "#00B3A6",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  emptyCta: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  emptyCtaText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
});
