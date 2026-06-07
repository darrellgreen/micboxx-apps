import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";

const CARD_BG = "#131820";

export function AlbumAudienceSummaryCards() {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="people-outline" size={18} color={tokens.colors.textSecondary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>No audience data yet</Text>
        <Text style={styles.description}>
          Listener locations and discovery sources will appear after this release starts receiving plays.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
