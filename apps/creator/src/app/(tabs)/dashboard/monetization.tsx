import { router } from "expo-router";
import { Text, StyleSheet } from "react-native";

import { AnimatedPressable , AppHeader, Screen } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { buildPayoutReadinessSummary } from "@/features/revenue/insights";
import { getCreatorUpgradeUrl } from "@/shared/api/external-links";
import { KeyValueRow, Panel } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

export default function MonetizationScreen() {
  const bootstrap = useCreatorBootstrap();
  const revenue = bootstrap.analytics?.revenue ?? null;
  const readiness = revenue?.monetizationReadiness ?? null;
  const payoutReadiness = buildPayoutReadinessSummary(revenue);

  return (
    <Screen
      header={<AppHeader variant="detail" title="Monetization" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
      <Panel title="Plan and access">
        <KeyValueRow
          label="Can sell catalog"
          value={bootstrap.analytics?.access.canSellCatalog ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Monetization locked"
          value={revenue?.sellingLocked ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Upgrade URL"
          value={getCreatorUpgradeUrl() ?? "Not configured"}
        />
      </Panel>
      <Panel title="Payout readiness (visibility only)">
        <KeyValueRow label="State" value={formatReadinessState(payoutReadiness.state)} />
        <KeyValueRow
          label="Plan unlocked"
          value={payoutReadiness.checks.planUnlocked ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Purchasable catalog"
          value={payoutReadiness.checks.hasPurchasableCatalog ? "Yes" : "No"}
        />
        <KeyValueRow
          label="Recorded sales"
          value={payoutReadiness.checks.hasRecordedSales ? "Yes" : "No"}
        />
        <Text style={styles.copy}>{payoutReadiness.summary}</Text>
        <AnimatedPressable
          style={styles.actionButton}
          onPress={() => router.push(payoutReadiness.nextAction.href as never)}
        >
          <Text style={styles.actionLabel}>{payoutReadiness.nextAction.label}</Text>
        </AnimatedPressable>
      </Panel>
      {readiness ? (
        <Panel title="Readiness">
          <KeyValueRow label="Purchasable tracks" value={String(readiness.purchasableTracks)} />
          <KeyValueRow label="Purchasable albums" value={String(readiness.purchasableAlbums)} />
          <KeyValueRow
            label="Subscriber-only tracks"
            value={String(readiness.subscriberOnlyTracks)}
          />
          <KeyValueRow
            label="Unmonetized published tracks"
            value={String(readiness.unmonetizedPublishedTracks)}
          />
        </Panel>
      ) : (
        <Panel title="Revenue snapshot only">
          <Text style={styles.copy}>
            Detailed payout mechanics and creator-facing financial operations are
            intentionally out of scope for this v1 mobile scaffold.
          </Text>
        </Panel>
      )}
    </Screen>
  );
}

function formatReadinessState(state: "ready" | "needs_action" | "blocked") {
  if (state === "ready") {
    return "Ready";
  }

  if (state === "blocked") {
    return "Blocked";
  }

  return "Needs action";
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
  actionButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgApp,
    borderColor: tokens.colors.borderSubtle,
  },
  actionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
});
