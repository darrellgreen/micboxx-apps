import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

interface DetailRouteHeaderProps {
  title: string;
  fallbackRoute?: string;
}

export function DetailRouteHeader({ title, fallbackRoute = "/(tabs)/dashboard" }: DetailRouteHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as never);
    }
  };

  return (
    <View style={s.container}>
      <AnimatedPressable
        onPress={handleBack}
        haptic="selection"
        style={s.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={tokens.colors.textPrimary}
        />
      </AnimatedPressable>

      <Text numberOfLines={1} style={s.title}>
        {title}
      </Text>

      <View style={s.spacer} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
    marginRight: 40,
  },
  spacer: {
    width: 0,
  },
});
