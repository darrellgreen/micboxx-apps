import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { tokens } from "@/theme/tokens";

export function ComposeBar({
  value,
  onChangeText,
  onSend,
  disabled,
  placeholder = "Write a message…",
  maxLength = 1000,
}: {
  value: string;
  onChangeText: (nextValue: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const trimmed = value.trim();

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textMuted}
        multiline
        maxLength={maxLength}
        style={styles.input}
      />
      <Pressable
        disabled={disabled || trimmed.length === 0}
        onPress={onSend}
        style={({ pressed }) => [
          styles.sendButton,
          (disabled || trimmed.length === 0) && styles.sendButtonDisabled,
          pressed && !(disabled || trimmed.length === 0) && styles.pressed,
        ]}
      >
        <Ionicons name="send" size={18} color={tokens.colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "rgba(13,17,23,0.96)",
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderSubtle,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    color: tokens.colors.textPrimary,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
