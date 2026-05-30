import { StyleSheet, Text, View } from "react-native";

import { PlayerArtwork } from "@/features/player/components/PlayerArtwork";
import { PlayerControls } from "@/features/player/components/PlayerControls";
import { PlayerProgress } from "@/features/player/components/PlayerProgress";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { selectDisplaySubtitle } from "@/features/player/selectors";
import { tokens } from "@micboxx/theme";

export function PlayerBar() {
  const { currentItem } = useNowPlaying();
  if (!currentItem) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <PlayerArtwork size={56} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {currentItem.title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {selectDisplaySubtitle(currentItem)}
          </Text>
        </View>
      </View>
      <PlayerProgress />
      <PlayerControls />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: "rgba(10,14,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: tokens.colors.textMuted,
    fontSize: 12,
  },
});
