import { Text, StyleSheet } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { KeyValueRow, Panel } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function ReleaseHealthScreen() {
  const bootstrap = useCreatorBootstrap();

  return (
    <Screen
      header={<AppHeader variant="detail" title="Release Health" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
      <Panel title="Catalog readiness">
        <KeyValueRow
          label="Albums"
          value={bootstrap.catalogReadiness.hasAlbums ? "Ready" : "Missing"}
        />
        <KeyValueRow
          label="Tracks"
          value={bootstrap.catalogReadiness.hasTracks ? "Ready" : "Missing"}
        />
        <KeyValueRow
          label="Backend drafts"
          value={bootstrap.catalogReadiness.hasBackendDraftTracks ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Scheduled releases"
          value={bootstrap.catalogReadiness.hasScheduledReleases ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Failed processing"
          value={bootstrap.catalogReadiness.hasFailedProcessing ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Published releases"
          value={bootstrap.catalogReadiness.hasPublishedReleases ? "Yes" : "No"}
        />
      </Panel>
      <Panel title="Operational note">
        <Text style={styles.copy}>
          This surface stays summary-driven. Detailed fixes happen in Catalog
          and Create, while Dashboard only calls out what needs attention.
        </Text>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  copy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
