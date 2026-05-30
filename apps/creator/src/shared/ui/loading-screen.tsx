import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { tokens } from "@/theme/tokens";

export function LoadingScreen({
  label = "Loading MicBoxx Creators…",
}: {
  label?: string;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={tokens.colors.accent} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 15,
  },
});
