import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import {
  buildPayoutReadinessSummary,
  buildRevenueTrendSummary,
} from "@/features/revenue/insights";
import {
  ChipTabs,
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import {
  EmptyState,
  KeyValueRow,
  Panel,
  SectionTitle,
} from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function RevenueScreen() {
  const revenue = useCreatorBootstrap().analytics?.revenue;
  const [filterKey, setFilterKey] = useState<"all" | "track" | "album">("all");
  const trendSummary = useMemo(
    () => buildRevenueTrendSummary(revenue ?? null),
    [revenue],
  );
  const payoutReadiness = useMemo(
    () => buildPayoutReadinessSummary(revenue ?? null),
    [revenue],
  );
  const filteredReleases = useMemo(() => {
    if (!revenue) {
      return [];
    }
    if (filterKey === "all") {
      return revenue.topEarningReleases;
    }
    return revenue.topEarningReleases.filter((item) => item.type === filterKey);
  }, [filterKey, revenue]);

  return (
    <Screen
      header={<AppHeader variant="detail" title="Revenue" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
      {!revenue ? (
        <EmptyState title="No revenue snapshot" description="Revenue data is missing or not available for this account yet." />
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {formatCurrency(revenue.snapshot?.grossRevenue ?? null)}
              </Text>
              <Text style={styles.summaryLabel}>Gross revenue</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {formatCount(revenue.snapshot?.salesCount ?? null)}
              </Text>
              <Text style={styles.summaryLabel}>Sales count</Text>
            </View>
          </View>

          <Panel title="Top earners">
            <View style={styles.topRow}>
              <View style={styles.topCard}>
                <Text style={styles.topTitle}>Top track</Text>
                <Text style={styles.topValue} numberOfLines={1}>
                  {revenue.snapshot?.topEarningTrack.title ?? "N/A"}
                </Text>
                <Text style={styles.topAmount}>
                  {formatCurrency(revenue.snapshot?.topEarningTrack.amount ?? null)}
                </Text>
              </View>
              <View style={styles.topCard}>
                <Text style={styles.topTitle}>Top album</Text>
                <Text style={styles.topValue} numberOfLines={1}>
                  {revenue.snapshot?.topEarningAlbum.title ?? "N/A"}
                </Text>
                <Text style={styles.topAmount}>
                  {formatCurrency(revenue.snapshot?.topEarningAlbum.amount ?? null)}
                </Text>
              </View>
            </View>
          </Panel>

          <Panel title="Revenue trend signal">
            <KeyValueRow
              label="Average order value"
              value={formatCurrency(trendSummary.averageOrderValue)}
            />
            <KeyValueRow
              label="Top release share"
              value={formatPercent(trendSummary.topReleaseSharePercent)}
            />
            <KeyValueRow
              label="Concentration"
              value={trendSummary.label}
            />
            <Text style={styles.signalText}>{trendSummary.description}</Text>
          </Panel>

          <Panel title="Payout readiness (visibility only)">
            <KeyValueRow
              label="State"
              value={formatReadinessState(payoutReadiness.state)}
            />
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
            <Text style={styles.signalText}>{payoutReadiness.summary}</Text>
            <AnimatedPressable
              style={styles.readinessAction}
              onPress={() => router.push(payoutReadiness.nextAction.href as never)}
            >
              <Text style={styles.readinessActionLabel}>
                {payoutReadiness.nextAction.label}
              </Text>
            </AnimatedPressable>
          </Panel>

          <SectionTitle title="Ranking" subtitle="Entity and status-aware release ranking." />
          <ChipTabs
            options={[
              { key: "all", label: "All", count: revenue.topEarningReleases.length },
              {
                key: "track",
                label: "Tracks",
                count: revenue.topEarningReleases.filter((item) => item.type === "track").length,
              },
              {
                key: "album",
                label: "Albums",
                count: revenue.topEarningReleases.filter((item) => item.type === "album").length,
              },
            ]}
            value={filterKey}
            onChange={(next) => setFilterKey(next as "all" | "track" | "album")}
          />
          {filteredReleases.length === 0 ? (
            <Panel title="No ranked releases" description="Revenue ranking will populate when monetized releases have sales." />
          ) : (
            <ListShell>
              <ListHeader
                columns={[
                  { key: "release", label: "Release" },
                  { key: "revenue", label: "Revenue", align: "right" },
                ]}
              />
              {filteredReleases.map((item) => (
                <ListRow key={`${item.type}-${item.id}`}>
                  <View style={styles.rankRow}>
                    <View style={styles.rankMain}>
                      <Text style={styles.rankTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.rankPills}>
                        <StatusPill
                          label={item.type}
                          tone={item.type === "album" ? "muted" : "default"}
                        />
                        <StatusPill
                          label={item.isPurchasable ? "On sale" : "Locked"}
                          tone={item.isPurchasable ? "success" : "warning"}
                        />
                      </View>
                    </View>
                    <View style={styles.rankMeta}>
                      <Text style={styles.rankAmount}>{formatCurrency(item.revenue)}</Text>
                      <Text style={styles.rankUnits}>
                        {item.unitsSold == null ? "N/A" : `${item.unitsSold} sold`}
                      </Text>
                    </View>
                  </View>
                </ListRow>
              ))}
            </ListShell>
          )}
        </>
      )}
    </Screen>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return "N/A";
  }

  return `${value}%`;
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
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: tokens.colors.panelGlassStrong,
    borderRadius: tokens.radii.xl,
    borderColor: tokens.colors.borderAccent,
    padding: 16,
    gap: 6,
  },
  summaryValue: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  summaryLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  topRow: {
    flexDirection: "row",
    gap: 10,
  },
  topCard: {
    flex: 1,
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.lg,
    borderColor: tokens.colors.borderSubtle,
    padding: 12,
    gap: 6,
  },
  topTitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topValue: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  topAmount: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  signalText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  readinessAction: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgApp,
    borderColor: tokens.colors.borderSubtle,
  },
  readinessActionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rankMain: {
    flex: 1,
    gap: 8,
  },
  rankTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  rankPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rankMeta: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 88,
  },
  rankAmount: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  rankUnits: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
