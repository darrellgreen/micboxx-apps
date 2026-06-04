import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

interface FlowHeaderProps {
  title: string;
  step?: string;
  fallbackRoute?: string;
}

export function FlowHeader({ title, step, fallbackRoute = "/(tabs)/home" }: FlowHeaderProps) {
  const router = useRouter();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as never);
    }
  };

  return (
    <View style={s.container}>
      <AnimatedPressable
        onPress={handleClose}
        haptic="selection"
        style={s.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons
          name="close"
          size={24}
          color={tokens.colors.textPrimary}
        />
        <Text style={s.closeLabel}>Close</Text>
      </AnimatedPressable>

      <View style={s.centerBlock}>
        <Text numberOfLines={1} style={s.title}>
          {title}
        </Text>
        {step && (
          <Text numberOfLines={1} style={s.step}>
            {step}
          </Text>
        )}
      </View>

      <View style={s.rightSpacer} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingRight: 8,
  },
  closeLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  step: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  rightSpacer: {
    width: 60, // approximate width of the close button to keep title centered
  },
});
