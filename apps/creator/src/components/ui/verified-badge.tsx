import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { tokens } from "@/theme/tokens";

interface VerifiedBadgeProps {
  /** Diameter of the badge. Default 20. */
  size?: number;
}

/**
 * Cyan verified badge matching the web's VerifiedBadge component.
 * Displays a filled accent circle with a white checkmark.
 */
export function VerifiedBadge({ size = 20 }: VerifiedBadgeProps) {
  const iconSize = Math.round(size * 0.62);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Ionicons name="checkmark" size={iconSize} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
