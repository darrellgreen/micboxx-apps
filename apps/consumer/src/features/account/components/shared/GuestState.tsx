import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

interface GuestStateProps {
  message?: string;
}

export function GuestState({
  message = "Sign in to unlock this destination with your MicBoxx account.",
}: GuestStateProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Account required</Text>
      <View style={styles.guestWrap}>
        <Text style={styles.guestText}>{message}</Text>
        <Pressable
          onPress={() => router.push("/sign-in")}
          style={({ pressed }: { pressed: boolean }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonLabel}>Sign In</Text>
        </Pressable>
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
  guestWrap: {
    gap: 12,
    marginTop: 4,
  },
  guestText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.accent,
  },
  primaryButtonLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
