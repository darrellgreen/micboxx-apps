import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";

export function UnreadBadge({ count }: { count: number }) {
  if (!count || count <= 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: tokens.colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: tokens.colors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
  },
});
