import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";

type IconName = keyof typeof Ionicons.glyphMap;

export const FORM_SELECTOR_BACKGROUND = "rgba(255,255,255,0.03)";
export const FORM_SELECTOR_BORDER_COLOR = tokens.colors.borderStrong;

export function FormSelectorRow({
  icon,
  label,
  value,
  onPress,
  disabled = false,
  placeholder = false,
}: {
  icon?: IconName;
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  placeholder?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <AnimatedPressable
        style={[styles.selectorRow, disabled && styles.selectorRowDisabled]}
        onPress={onPress}
        disabled={disabled}
        haptic={disabled ? undefined : "selection"}
      >
        <View style={styles.selectorValue}>
          {icon ? (
            <Ionicons
              name={icon}
              size={21}
              color={placeholder ? tokens.colors.textSecondary : tokens.colors.textPrimary}
            />
          ) : null}
          <Text style={[styles.selectorText, placeholder && styles.selectorTextPlaceholder]} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={tokens.colors.textSecondary} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  selectorRow: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorRowDisabled: {
    opacity: 0.56,
  },
  selectorValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  selectorText: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  selectorTextPlaceholder: {
    color: tokens.colors.textSecondary,
  },
});
