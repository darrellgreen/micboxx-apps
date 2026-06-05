import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardAlbum } from "@/contracts/creator";

const CARD_BG = "#131820";

interface TrackRowProps {
  index: number;
  title: string;
}

function TrackRow({ index, title }: TrackRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.index}>{index}.</Text>
        <Text style={styles.trackTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
    </View>
  );
}

interface AlbumTrackPreviewProps {
  album: DashboardAlbum;
  onViewAll: () => void;
}

export function AlbumTrackPreview({ album, onViewAll }: AlbumTrackPreviewProps) {
  const displayCount = album.counts?.tracks || 13;

  // Mockup list of first 4 tracks
  const mockTracks = [
    { id: 1, title: "Intro" },
    { id: 2, title: "Push It" },
    { id: 3, title: "Hustler's Dream" },
    { id: 4, title: "Maybach Music" },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Tracks ({displayCount})</Text>
      </View>

      <View style={styles.list}>
        {mockTracks.map((t, idx) => (
          <TrackRow key={t.id} index={idx + 1} title={t.title} />
        ))}
      </View>

      <AnimatedPressable style={styles.viewAllCta} onPress={onViewAll} haptic="selection">
        <Text style={styles.ctaText}>View All Tracks</Text>
        <Ionicons name="arrow-forward" size={14} color="#00B3A6" />
      </AnimatedPressable>
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
});
