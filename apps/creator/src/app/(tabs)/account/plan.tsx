import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import {
  usePresentCustomerCenter,
  usePresentPaywallIfNeeded,
  useRestorePurchases,
} from "@/features/subscription/hooks";
import { useSubscription } from "@/features/subscription/provider";
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
import { useState } from "react";

export default function PlanScreen() {
  const bootstrap = useCreatorBootstrap();
  const upgradeUrl = getCreatorUpgradeUrl();

  // RevenueCat subscription state
  const { isPro, isLoading: isSubscriptionLoading, customerInfo } = useSubscription();
  const presentPaywallIfNeeded = usePresentPaywallIfNeeded();
  const presentCustomerCenter = usePresentCustomerCenter();
  const restorePurchases = useRestorePurchases();

  const [isRestoring, setIsRestoring] = useState(false);

  const planLabel = bootstrap.analytics?.overview.planLabel ?? "Unknown";
  const uploadPolicy = bootstrap.uploadOptions?.uploadPolicy;
  const canSellCatalog = Boolean(bootstrap.analytics?.access.canSellCatalog);
  const trackLimit = uploadPolicy?.trackLimit;
  const tracksUsed = uploadPolicy?.tracksUsed ?? 0;
  const tracksRemaining =
    trackLimit == null ? "Unlimited" : String(Math.max(0, trackLimit - tracksUsed));

  // Subscription expiry — only present when the user is Pro
  const proExpiry = customerInfo?.entitlements.active["MicBoxx Pro"]?.expirationDate;

  async function handleUpgradeToPro() {
    await presentPaywallIfNeeded();
  }

  async function handleManageSubscription() {
    await presentCustomerCenter();
  }

  async function handleRestore() {
    setIsRestoring(true);
    await restorePurchases();
    setIsRestoring(false);
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Plan" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
      {/* ── Subscription hero ── */}
      <View style={styles.heroRow}>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{planLabel}</Text>
          <Text style={styles.heroLabel}>Current plan</Text>
        </View>

        <View style={[styles.heroCard, isPro && styles.heroCardPro]}>
          {isSubscriptionLoading ? (
            <ActivityIndicator color={tokens.colors.accent} />
          ) : (
            <>
              <Text style={[styles.heroValue, isPro && styles.heroValuePro]}>
                {isPro ? "Active" : "Free"}
              </Text>
              <Text style={styles.heroLabel}>MicBoxx Pro</Text>
            </>
          )}
        </View>
      </View>

      {/* ── Pro expiry ── */}
      {isPro && proExpiry ? (
        <Text style={styles.expiryHint}>
          Pro renews {new Date(proExpiry).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      ) : null}

      {/* ── Pro CTA / management buttons ── */}
      {!isSubscriptionLoading ? (
        <View style={styles.actionRow}>
          {isPro ? (
            <PillButton
              label="Manage subscription"
              tone="subtle"
              onPress={() => void handleManageSubscription()}
            />
          ) : (
            <PillButton
              label="Upgrade to Pro"
              tone="accent"
              onPress={() => void handleUpgradeToPro()}
            />
          )}
          <PillButton
            label={isRestoring ? "Restoring…" : "Restore purchases"}
            tone="subtle"
            onPress={() => void handleRestore()}
          />
        </View>
      ) : null}

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
        {upgradeUrl && !isPro ? (
          <>
            <Text style={styles.hint}>Upgrade and billing changes are also available on the web.</Text>
            <PillButton
              label="Open upgrade flow"
              tone="accent"
              onPress={() => void Linking.openURL(upgradeUrl)}
            />
          </>
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
    borderWidth: 1,
    padding: 16,
    gap: 6,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  heroCardPro: {
    borderColor: tokens.colors.accent,
    backgroundColor: "rgba(0,200,180,0.08)",
  },
  heroValue: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  heroValuePro: {
    color: tokens.colors.accent,
  },
  heroLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  expiryHint: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: -4,
  },
  actionRow: {
    gap: 8,
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
