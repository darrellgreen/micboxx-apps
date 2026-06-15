import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { PreferenceRow } from "../shared/PreferenceRow";

export interface SettingsNotificationsPanelProps {
  pushNotifications: boolean;
  onPushNotificationsChange: (value: boolean) => void;
  canManagePushNotifications: boolean;
  preferencesHydrating: boolean;
  settingsStatus: string;
}

export function SettingsNotificationsPanel({
  pushNotifications,
  onPushNotificationsChange,
  canManagePushNotifications,
  preferencesHydrating,
  settingsStatus,
}: SettingsNotificationsPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Push notifications</Text>
      <Text style={styles.description}>
        Control how and when you receive push notifications on your MicBoxx account.
      </Text>
      <Text style={styles.preferenceStatus}>{settingsStatus}</Text>

      <PreferenceRow
        label="Push notifications"
        subtitle={
          canManagePushNotifications
            ? "Control notification delivery for this signed-in account."
            : "Sign in to manage notification delivery for your account."
        }
        value={pushNotifications}
        onValueChange={() => onPushNotificationsChange(!pushNotifications)}
        disabled={!canManagePushNotifications || preferencesHydrating}
      />
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
  preferenceStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
