import { Alert, Switch, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/provider";
import { useAccountPreferences } from "@/features/account/provider";
import { deleteAccount } from "@/shared/api/creator-dashboard";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen, useToast, AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { preferences, setAdvancedModeEnabled } = useAccountPreferences();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleToggleAdvancedMode = (val: boolean) => {
    void setAdvancedModeEnabled(val);
    showToast({
      tone: "info",
      title: val ? "Advanced Mode Enabled" : "Standard Mode Restored",
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account, all your tracks, albums, and room data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Type your confirmation — once deleted, your account and all content are gone forever.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete my account",
                  style: "destructive",
                  onPress: () => void confirmDelete(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      // Navigate to the root index so it resets the full navigation stack.
      // router.replace("/welcome") from a nested screen leaves the tabs layout
      // underneath still active; going through "/" lets index.tsx handle routing.
      router.replace("/");
    } catch (err) {
      setDeleting(false);
      showToast({
        tone: "error",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unable to delete account. Please try again.",
      });
    }
  };

  return (
    <Screen
      header={<AppHeader variant="detail" title="Settings" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title="App Preferences">
        <View style={styles.row}>
          <Text style={styles.label}>Advanced Mode</Text>
          <Switch
            value={preferences.advancedModeEnabled}
            onValueChange={handleToggleAdvancedMode}
            trackColor={{ false: "#1E293B", true: "#7AC414" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Panel>

      <PillButton label="Sign out" tone="accent" onPress={() => void signOut()} />

      <View style={styles.dangerZone}>
        <AnimatedPressable
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          haptic="light"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={tokens.colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={tokens.colors.danger} />
          )}
          <Text style={styles.deleteLabel}>
            {deleting ? "Deleting account…" : "Delete account"}
          </Text>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  dangerZone: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: tokens.radiusSystem.control,
    borderWidth: 1,
    borderColor: "rgba(217,92,92,0.3)",
    backgroundColor: "rgba(217,92,92,0.06)",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteLabel: {
    color: tokens.colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
});
