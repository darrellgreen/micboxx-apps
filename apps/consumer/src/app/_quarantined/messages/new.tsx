import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { tokens } from "@micboxx/theme";

export default function NewConversationScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title}>New message</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.center}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={34}
          color={tokens.colors.accent}
        />
        <Text style={styles.heading}>Direct messaging is now wired up</Text>
        <Text style={styles.copy}>
          The next pass will add artist-profile entry points and user search.
          For now, inbox and conversation routes are ready for live Firestore
          conversations.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  iconButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  heading: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  copy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
