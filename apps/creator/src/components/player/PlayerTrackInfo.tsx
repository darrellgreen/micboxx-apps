import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { formatCompactNumber } from "@/lib/formatters";
import { tokens } from "@/theme/tokens";

interface PlayerTrackInfoProps {
  title: string;
  artistName: string;
  plays?: number | null;
  likes?: number | null;
}

export function PlayerTrackInfo({
  title,
  artistName,
  plays,
  likes,
}: PlayerTrackInfoProps) {
  const hasStats = typeof plays === "number" || typeof likes === "number";

  return (
    <View style={s.wrapper}>
      {hasStats ? (
        <View style={s.statsRow}>
          {typeof plays === "number" ? (
            <View style={s.statItem}>
              <Ionicons
                name="play"
                size={12}
                color={tokens.colors.textSecondary}
              />
              <Text style={s.statText}>{formatCompactNumber(plays)} Plays</Text>
            </View>
          ) : null}
          {typeof likes === "number" ? (
            <View style={s.statItem}>
              <Ionicons
                name="heart"
                size={12}
                color={tokens.colors.textSecondary}
              />
              <Text style={s.statText}>{formatCompactNumber(likes)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={s.trackTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={s.artistName}>{artistName}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 56,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 32,
  },
  artistName: {
    color: tokens.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 5,
  },
});
