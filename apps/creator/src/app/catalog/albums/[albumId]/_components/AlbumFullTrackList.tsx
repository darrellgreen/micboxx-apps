import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import type { DashboardAlbum } from "@/contracts/creator";

const CARD_BG = "#131820";

interface AlbumFullTrackListProps {
  album: DashboardAlbum;
}

export function AlbumFullTrackList({ album }: AlbumFullTrackListProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>All Album Tracks</Text>
      
      <View style={styles.list}>
        {album.tracks.map((track, idx) => (
          <View key={track.trackId} style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.index}>{idx + 1}.</Text>
              <View>
                <Text style={styles.trackTitle}>{track.title}</Text>
                <Text style={styles.trackStatus}>Status: {track.status.processing || "ready"}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
          </View>
        ))}
      </View>
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
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  index: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    width: 18,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  trackStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textTransform: "capitalize",
  },
});
