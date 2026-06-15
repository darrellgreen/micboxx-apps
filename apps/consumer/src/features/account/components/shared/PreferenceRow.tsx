import { StyleSheet, Switch, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

interface PreferenceRowProps {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
}

export function PreferenceRow({
  label,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: PreferenceRowProps) {
  return (
    <View
      style={[styles.preferenceRow, disabled && styles.preferenceRowDisabled]}
    >
      <View style={styles.preferenceCopy}>
        <Text
          style={[
            styles.preferenceLabel,
            disabled && styles.preferenceLabelDisabled,
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.preferenceSubtitle,
            disabled && styles.preferenceSubtitleDisabled,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: tokens.colors.borderSubtle,
          true: tokens.colors.accentStrong,
        }}
        thumbColor={
          value ? tokens.colors.accentLight : tokens.colors.textSecondary
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  preferenceRowDisabled: {
    opacity: 0.7,
  },
  preferenceCopy: {
    flex: 1,
    gap: 3,
  },
  preferenceLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  preferenceLabelDisabled: {
    color: tokens.colors.textSecondary,
  },
  preferenceSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  preferenceSubtitleDisabled: {
    color: tokens.colors.textDisabled,
  },
});
