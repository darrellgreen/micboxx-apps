import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ComponentProps } from "react";
import { tokens } from "@micboxx/theme";

export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  message,
  action,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.emptyState}>
      <Ionicons name={icon} size={28} color={tokens.colors.textSecondary} style={{ opacity: 0.5 }} />
      <Text style={s.emptyStateText}>{message}</Text>
      {action && (
        <TouchableOpacity style={s.emptyStateAction} onPress={action.onPress}>
          <Text style={s.emptyStateActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ModalField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textMuted}
        style={[s.textInput, multiline && s.textArea]}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const s = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: tokens.colors.textPrimary, fontSize: 17, fontWeight: "800" },
  seeAll: { color: tokens.colors.accent, fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyStateText: { color: tokens.colors.textSecondary, fontSize: 13, textAlign: "center" },
  emptyStateAction: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
  },
  emptyStateActionText: { color: tokens.colors.accent, fontSize: 13, fontWeight: "700" },
  inputGroup: { gap: 8 },
  inputLabel: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  textInput: {
    backgroundColor: tokens.colors.bgInput,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: tokens.colors.textPrimary,
    fontSize: 14,
  },
  textArea: { height: 100, textAlignVertical: "top" },
});
