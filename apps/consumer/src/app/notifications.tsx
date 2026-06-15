import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@micboxx/ui";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { useAuth } from "@/features/auth/provider";
import { NotificationsFeedPanel } from "@/features/notifications/components/NotificationsFeedPanel";
import { tokens } from "@micboxx/theme";

export default function NotificationsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const handleOpenRoute = (href: string) => {
    router.push(href as never);
  };

  return (
    <Screen
      header={
        <>
          <Stack.Screen options={{ headerShown: false }} />
          <DetailRouteHeader
            title="Notifications"
            fallbackRoute="/(tabs)/home"
          />
        </>
      }
      contentContainerStyle={styles.container}
    >
      {session ? (
        <NotificationsFeedPanel onOpenRoute={handleOpenRoute} />
      ) : (
        <View style={styles.notifEmptyGate}>
          <View style={styles.notifEmptyIconWrap}>
            <Ionicons
              name="notifications-outline"
              size={44}
              color={tokens.colors.accent}
            />
          </View>
          <Text style={styles.notifEmptyTitle}>Sign in to view notifications</Text>
          <Text style={styles.notifEmptyBody}>
            Sign in to get real-time activity from your MicBoxx profile.
          </Text>
          <Pressable
            onPress={() => router.push("/sign-in")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonLabel}>Sign In</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexGrow: 1,
  },
  notifEmptyGate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 12,
    marginTop: 60,
  },
  notifEmptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  notifEmptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  notifEmptyBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: tokens.radii.pill,
  },
  primaryButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
