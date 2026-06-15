import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface NotificationStateCardProps {
  icon: IoniconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error";
}

export function NotificationStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "default",
}: NotificationStateCardProps) {
  const iconColor =
    tone === "error" ? tokens.colors.danger : tokens.colors.textSecondary;

  return (
    <View
      style={[
        styles.notificationStateCard,
        tone === "error" && styles.notificationStateCardError,
      ]}
    >
      <View
        style={[
          styles.notificationStateIconWrap,
          tone === "error" && styles.notificationStateIconWrapError,
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.notificationStateTitle}>{title}</Text>
      <Text style={styles.notificationStateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }: { pressed: boolean }) => [
            styles.notificationStateAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.notificationStateActionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notificationStateCard: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  notificationStateCardError: {},
  notificationStateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  notificationStateIconWrapError: {
    backgroundColor: "rgba(217,92,92,0.12)",
    borderColor: "rgba(217,92,92,0.2)",
  },
  notificationStateTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  notificationStateDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  notificationStateAction: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  notificationStateActionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
});
