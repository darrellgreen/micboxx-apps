import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface ActionItem {
  key: string;
  label: string;
  subtitle: string;
  icon: IoniconName;
  onPress: () => void;
  tone?: "default" | "accent" | "danger";
}

interface ActionPanelProps {
  title: string;
  items: ActionItem[];
}

export function ActionPanel({ title, items }: ActionPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.actionList}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }: { pressed: boolean }) => [
              styles.actionRow,
              item.tone === "accent" && styles.actionRowAccent,
              item.tone === "danger" && styles.actionRowDanger,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIconWrap,
                item.tone === "accent" && styles.actionIconWrapAccent,
                item.tone === "danger" && styles.actionIconWrapDanger,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={
                  item.tone === "danger"
                    ? tokens.colors.danger
                    : tokens.colors.textPrimary
                }
              />
            </View>

            <View style={styles.actionCopy}>
              <Text
                style={[
                  styles.actionLabel,
                  item.tone === "danger" && styles.actionLabelDanger,
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={tokens.colors.textSecondary}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    gap: 14,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  actionList: {
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  actionRowAccent: {},
  actionRowDanger: {},
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  actionIconWrapAccent: {},
  actionIconWrapDanger: {},
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  actionLabelDanger: {
    color: tokens.colors.danger,
  },
  actionSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
