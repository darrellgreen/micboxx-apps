import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { tokens } from "@micboxx/theme";
import {
  FORM_SELECTOR_BACKGROUND,
  FORM_SELECTOR_BORDER_COLOR,
} from "@/shared/ui/selector-row";

export function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "url";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.textMuted}
      multiline={multiline}
      keyboardType={keyboardType}
      style={[styles.input, multiline && styles.inputMultiline]}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <Text style={styles.error}>{children}</Text>;
}

export const formStyles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  helper: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    minHeight: 48,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    color: tokens.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 112,
    textAlignVertical: "top",
  },
  error: {
    color: tokens.colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
