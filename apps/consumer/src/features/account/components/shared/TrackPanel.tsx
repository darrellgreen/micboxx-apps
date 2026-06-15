import { StyleSheet, Text, View } from "react-native";
import { Skeleton } from "@micboxx/ui";
import { TrackRow } from "@/components/discover";
import type { PublicTrackSummary } from "@micboxx/contracts";
import type { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import { tokens } from "@micboxx/theme";

type PlayerSurface = ReturnType<typeof useDiscoverPlayer>;

interface TrackPanelProps {
  title: string;
  subtitle: string;
  tracks: PublicTrackSummary[];
  emptyText: string;
  loading: boolean;
  player: PlayerSurface;
}

export function TrackPanel({
  title,
  subtitle,
  tracks,
  emptyText,
  loading,
  player,
}: TrackPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.description}>{subtitle}</Text>

      {loading ? (
        <View style={{ gap: 10, paddingVertical: 4 }}>
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
      ) : tracks.length ? (
        <View style={styles.trackCard}>
          {tracks.map((track, index) => {
            const active = track.id === player.activeId;
            const isLast = index === tracks.length - 1;
            const nextActive = tracks[index + 1]?.id === player.activeId;

            return (
              <View key={track.id}>
                <TrackRow
                  track={track}
                  active={active}
                  playing={active && player.playing}
                  onAction={() => player.handleAction(track, tracks)}
                  progressValue={player.progressValue}
                />
                {!isLast && !active && !nextActive ? (
                  <View style={styles.trackDivider} />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyInlineText}>{emptyText}</Text>
      )}
    </View>
  );
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
  trackCard: {
    paddingVertical: 4,
  },
  trackDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.colors.borderSubtle,
    marginLeft: 78,
    marginRight: 14,
  },
  emptyInlineText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
