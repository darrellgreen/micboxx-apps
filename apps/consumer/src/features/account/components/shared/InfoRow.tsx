import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, Key } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface SummaryItem {
  key: string;
  label: string;
  subtitle: string;
  icon: IoniconName;
  tone?: "default" | "accent" | "warning";
}

interface InfoRowProps {
  key?: Key;
  item: SummaryItem;
  compact?: boolean;
}

export function InfoRow({ item, compact = false }: InfoRowProps) {
  const iconColor =
    item.tone === "accent"
      ? tokens.colors.accent
      : item.tone === "warning"
        ? tokens.colors.warning
        : tokens.colors.textSecondary;

  return (
    <View style={styles.listRow}>
      <Ionicons name={item.icon} size={16} color={iconColor} />
      <View style={styles.infoCopy}>
        <Text style={styles.listLabel}>{item.label}</Text>
        {!compact && item.subtitle ? (
          <Text style={styles.listDetail}>{item.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  listLabel: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  listDetail: {
    color: tokens.colors.textDisabled,
    fontSize: 12,
    lineHeight: 18,
  },
});
