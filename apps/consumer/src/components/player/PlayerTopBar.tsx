import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { tokens } from "@micboxx/theme";

interface PlayerTopBarProps {
  onBack: () => void;
}

export function PlayerTopBar({ onBack }: PlayerTopBarProps) {
  return (
    <View style={s.topBar}>
      <Pressable onPress={onBack} style={s.circleBtn}>
        <Ionicons
          name="chevron-back"
          size={22}
          color={tokens.colors.textPrimary}
        />
      </Pressable>

      <View style={s.centerFill}>
        <Image
          source={require("../../../assets/images/fav.png")}
          style={s.centerIcon}
          contentFit="contain"
        />
      </View>
      <View style={s.circleSpacer} />
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
  },
  centerIcon: {
    width: 28,
    height: 28,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(21,27,35,0.70)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleSpacer: {
    width: 42,
    height: 42,
  },
});
