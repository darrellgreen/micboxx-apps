import { tokens } from "@micboxx/theme";
import {
    StyleSheet,
    Text,
    type PressableProps,
    type ViewStyle,
} from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";

interface PillProps extends Omit<PressableProps, "style"> {
  label: string;
  active?: boolean;
  variant?: "default" | "accent" | "cta";
  style?: ViewStyle;
}

export function Pill({
  label,
  active = false,
  variant = "default",
  style,
  ...props
}: PillProps) {
  return (
    <AnimatedPressable
      {...props}
      scaleValue={0.95}
      haptic="selection"
      style={[
        styles.pill,
        active && styles.pillActive,
        active && variant === "accent" && styles.pillAccent,
        active && variant === "cta" && styles.pillCta,
        style,
      ]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.panel,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  pillActive: {
    borderColor: "transparent",
    backgroundColor: tokens.colors.accent,
  },
  pillAccent: {
    backgroundColor: tokens.colors.accent,
  },
  pillCta: {
    backgroundColor: tokens.colors.cta,
  },
  label: {
    color: tokens.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 14,
    textAlignVertical: "center",
  },
  labelActive: {
    color: tokens.colors.text,
  },
});
