import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { tokens } from "@/theme/tokens";

export function SectionHeader({
  bold,
  light,
  onSeeAll,
}: {
  bold: string;
  light: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionLeft}>
        <View style={s.accentBar} />
        <Text style={s.sectionBold}>{bold} </Text>
        <Text style={s.sectionLight}>{light}</Text>
      </View>
      <AnimatedPressable style={s.seeAll} onPress={onSeeAll} haptic="selection">
        <Text style={s.seeAllText}>See All</Text>
        <View style={s.seeAllCircle}>
          <Ionicons
            name="chevron-forward"
            size={12}
            color={tokens.colors.textPrimary}
          />
        </View>
      </AnimatedPressable>
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
    height: 28,
    borderRadius: 2,
    backgroundColor: tokens.colors.brandSecondary,
    marginRight: 10,
  },
  sectionBold: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionLight: {
    color: tokens.colors.textSecondary,
    fontSize: 22,
    fontWeight: "400",
    letterSpacing: -0.3,
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
