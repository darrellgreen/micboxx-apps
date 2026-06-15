import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { InfoRow, type SummaryItem } from "./InfoRow";

interface SummaryPanelProps {
  title: string;
  description: string;
  items: readonly SummaryItem[];
}

export function SummaryPanel({
  title,
  description,
  items,
}: SummaryPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.listWrap}>
        {items.map((item) => (
          <InfoRow key={item.key} item={item} />
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
  description: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  listWrap: {
    gap: 10,
  },
});
