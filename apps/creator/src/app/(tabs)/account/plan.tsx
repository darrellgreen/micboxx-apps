import { Linking, StyleSheet, Text, View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { getCreatorUpgradeUrl } from "@/shared/api/external-links";
import {
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import { Panel, PillButton, SectionTitle } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function PlanScreen() {
  const bootstrap = useCreatorBootstrap();
  const upgradeUrl = getCreatorUpgradeUrl();
  const planLabel = bootstrap.analytics?.overview.planLabel ?? "Unknown";
  const uploadPolicy = bootstrap.uploadOptions?.uploadPolicy;
  const canSellCatalog = Boolean(bootstrap.analytics?.access.canSellCatalog);
  const trackLimit = uploadPolicy?.trackLimit;
  const tracksUsed = uploadPolicy?.tracksUsed ?? 0;
  const tracksRemaining =
    trackLimit == null ? "Unlimited" : String(Math.max(0, trackLimit - tracksUsed));

  return (
    <Screen
      header={<AppHeader variant="detail" title="Plan" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.heroRow}>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{planLabel}</Text>
          <Text style={styles.heroLabel}>Current plan</Text>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{tracksRemaining}</Text>
          <Text style={styles.heroLabel}>Tracks remaining</Text>
        </View>
      </View>

      <SectionTitle title="Access capabilities" subtitle="Snapshot-only access checks in v1." />
      <ListShell>
        <ListHeader
          columns={[
            { key: "capability", label: "Capability" },
            { key: "state", label: "State", align: "right" },
          ]}
        />
        <ListRow>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Catalog selling</Text>
            <StatusPill
              label={canSellCatalog ? "Enabled" : "Locked"}
              tone={canSellCatalog ? "success" : "warning"}
            />
          </View>
        </ListRow>
        <ListRow>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Advanced analytics</Text>
            <StatusPill
              label={bootstrap.analytics?.access.hasAdvancedAnalytics ? "Enabled" : "Basic"}
              tone={bootstrap.analytics?.access.hasAdvancedAnalytics ? "success" : "muted"}
            />
          </View>
        </ListRow>
        <ListRow>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Premium analytics</Text>
            <StatusPill
              label={bootstrap.analytics?.access.hasPremiumAnalytics ? "Enabled" : "Basic"}
              tone={bootstrap.analytics?.access.hasPremiumAnalytics ? "success" : "muted"}
            />
          </View>
        </ListRow>
      </ListShell>

      <Panel title="Upload policy">
        <View style={styles.policyRow}>
          <Text style={styles.policyLabel}>Track limit</Text>
          <Text style={styles.policyValue}>
            {trackLimit == null ? "Unlimited" : trackLimit}
          </Text>
        </View>
        <View style={styles.policyRow}>
          <Text style={styles.policyLabel}>Tracks used</Text>
          <Text style={styles.policyValue}>{tracksUsed}</Text>
        </View>
        <View style={styles.policyRow}>
          <Text style={styles.policyLabel}>Multi upload</Text>
          <Text style={styles.policyValue}>
            {uploadPolicy?.canMultiUpload ? "Enabled" : "Single upload only"}
          </Text>
        </View>
        <Text style={styles.hint}>Upgrade and billing changes are web handoffs in v1.</Text>
        {upgradeUrl ? (
          <PillButton
            label="Open upgrade flow"
            tone="accent"
            onPress={() => void Linking.openURL(upgradeUrl)}
          />
        ) : null}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  heroRow: {
    flexDirection: "row",
    gap: 12,
  },
  heroCard: {
    flex: 1,
    backgroundColor: tokens.colors.panelGlassStrong,
    borderRadius: tokens.radii.xl,
    borderColor: tokens.colors.borderAccent,
    padding: 16,
    gap: 6,
  },
  heroValue: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  heroLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  policyLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  policyValue: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  hint: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
