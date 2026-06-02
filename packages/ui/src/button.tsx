import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "./animated-pressable";
import { hapticLight } from "./useHaptic";
import { tokens } from "@micboxx/theme";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  tone = "primary",
  size = "md",
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const isPrimary = tone === "primary";
  const isDanger = tone === "danger";
  const isGhost = tone === "ghost";

  const handlePress = () => {
    if (disabled || loading) return;
    hapticLight();
    onPress();
  };

  const activityColor = isPrimary || isDanger ? "#ffffff" : tokens.colors.textPrimary;
  const labelColor = isPrimary || isDanger
    ? "#ffffff"
    : isGhost
    ? tokens.colors.textSecondary
    : tokens.colors.textPrimary;

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled || loading}
      scaleValue={0.96}
      style={[
        styles.buttonBase,
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        styles[`tone_${tone}`],
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={activityColor} />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.labelBase,
                styles[`labelSize_${size}`],
                { color: labelColor },
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: tokens.radiusSystem.pill,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  // Sizes
  size_sm: {
    minHeight: 32,
    paddingHorizontal: 12,
  },
  size_md: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
  size_lg: {
    minHeight: 52,
    paddingHorizontal: 24,
  },
  // Label sizes
  labelBase: {
    fontFamily: tokens.typography.fontFamily.sans,
    fontWeight: tokens.typography.semibold,
  },
  labelSize_sm: {
    fontSize: tokens.typography.sm,
  },
  labelSize_md: {
    fontSize: tokens.typography.base,
  },
  labelSize_lg: {
    fontSize: tokens.typography.md,
  },
  // Tones
  tone_primary: {
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.sm, // very subtle elevation, no heavy glow
  },
  tone_secondary: {
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  tone_ghost: {
    backgroundColor: "transparent",
  },
  tone_danger: {
    backgroundColor: tokens.colors.danger,
    ...tokens.shadows.sm,
  },
});
