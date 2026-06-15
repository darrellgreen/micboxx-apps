import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { PreferenceRow } from "../shared/PreferenceRow";

export interface SettingsPlaybackPanelProps {
  autoplayPreview: boolean;
  onAutoplayPreviewChange: (value: boolean) => void;
  explicitFilter: boolean;
  onExplicitFilterChange: (value: boolean) => void;
  preferencesHydrating: boolean;
}

export function SettingsPlaybackPanel({
  autoplayPreview,
  onAutoplayPreviewChange,
  explicitFilter,
  onExplicitFilterChange,
  preferencesHydrating,
}: SettingsPlaybackPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Audio & Content Preferences</Text>
      <Text style={styles.description}>
        Playback preferences and explicit filters are saved locally on this device.
      </Text>

      <PreferenceRow
        label="Autoplay previews"
        subtitle="Saved on this device for preview and browsing behavior."
        value={autoplayPreview}
        onValueChange={() => onAutoplayPreviewChange(!autoplayPreview)}
        disabled={preferencesHydrating}
      />
      <PreferenceRow
        label="Filter explicit tracks"
        subtitle="Saved on this device for account browsing and playback surfaces."
        value={explicitFilter}
        onValueChange={() => onExplicitFilterChange(!explicitFilter)}
        disabled={preferencesHydrating}
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
});
