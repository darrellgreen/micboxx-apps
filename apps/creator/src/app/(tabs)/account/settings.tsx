import { Switch, View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/features/auth/provider";
import { useAccountPreferences } from "@/features/account/provider";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen, useToast } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { preferences, setAdvancedModeEnabled } = useAccountPreferences();
  const { showToast } = useToast();

  const handleToggleAdvancedMode = (val: boolean) => {
    void setAdvancedModeEnabled(val);
    showToast({
      tone: "info",
      title: val ? "Advanced Mode Enabled" : "Standard Mode Restored",
    });
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
      <Panel title="Session">
        <PillButton label="Sign out" tone="accent" onPress={() => void signOut()} />
      </Panel>
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
});
