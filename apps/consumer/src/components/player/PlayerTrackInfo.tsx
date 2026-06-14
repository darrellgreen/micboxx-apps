import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { formatCompactNumber } from "@micboxx/api";
import { Heading, BodyText, Subtext } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

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
              <BodyText size="sm" weight="medium" color="secondary">{formatCompactNumber(plays)} Plays</BodyText>
            </View>
          ) : null}
          {typeof likes === "number" ? (
            <View style={s.statItem}>
              <Ionicons
                name="heart"
                size={12}
                color={tokens.colors.textSecondary}
              />
              <BodyText size="sm" weight="medium" color="secondary">{formatCompactNumber(likes)}</BodyText>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={s.titleWrap}>
        <Heading level="h3" align="center" numberOfLines={2}>
          {title}
        </Heading>
      </View>
      
      <View style={s.artistWrap}>
        <BodyText size="md" weight="medium" align="center" color="secondary">
          {artistName}
        </BodyText>
      </View>
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
    marginTop: 20,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  titleWrap: {
    marginTop: 10,
    paddingHorizontal: 32,
  },
  artistWrap: {
    marginTop: 2,
  },
});
