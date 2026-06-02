import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Heading, AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export function SectionHeader({
  bold,
  light,
  onSeeAll,
  seeAllIconName = "chevron-forward",
}: {
  bold: string;
  light: string;
  onSeeAll?: () => void;
  seeAllIconName?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionLeft}>
        <View style={s.accentBar} />
        <Heading level="h3" style={s.sectionTitle}>
          {bold} <Text style={s.sectionLight}>{light}</Text>
        </Heading>
      </View>
      {onSeeAll ? (
        <AnimatedPressable style={s.seeAll} onPress={onSeeAll} haptic="selection">
          <Text style={s.seeAllText}>See All</Text>
          <View style={s.seeAllCircle}>
            <Ionicons
              name={seeAllIconName}
              size={12}
              color={tokens.colors.textPrimary}
            />
          </View>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center" },
  accentBar: {
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: tokens.colors.brandSecondary,
    marginRight: 10,
  },
  sectionTitle: {
    letterSpacing: -0.3,
  },
  sectionLight: {
    color: tokens.colors.textSecondary,
    fontWeight: "400",
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 6 },
  seeAllText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  seeAllCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
});
