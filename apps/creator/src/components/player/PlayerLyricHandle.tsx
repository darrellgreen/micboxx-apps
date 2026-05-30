import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";

export function PlayerLyricHandle() {
  return (
    <View style={s.lyricSection}>
      <Ionicons
        name="chevron-up"
        size={20}
        color={tokens.colors.textSecondary}
      />
      <Text style={s.lyricLabel}>Lyric</Text>
    </View>
  );
}

const s = StyleSheet.create({
  lyricSection: {
    alignItems: "center",
    paddingBottom: 4,
    marginTop: 24,
  },
  lyricLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -2,
  },
});
