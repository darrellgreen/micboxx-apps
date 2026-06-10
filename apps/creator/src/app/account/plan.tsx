/**
 * Creator Plans screen
 *
 * Plan cards driven by the backend API (same as consumer premium screen),
 * with RevenueCat wired for purchase / manage / restore actions.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable, Skeleton } from "@micboxx/ui";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { useAuth } from "@/features/auth/provider";
import {
  ENTITLEMENT_PRO,
  useSubscription,
} from "@/features/subscription/provider";
import {
  usePresentPaywallIfNeeded,
  usePresentCustomerCenter,
  useRestorePurchases,
} from "@/features/subscription/hooks";
import {
  useGetCurrentEntitlementsQuery,
  useGetPublicSubscriptionPlansQuery,
  formatCurrency,
} from "@micboxx/api";
import type {
  EntitlementCapabilityDetail,
  EntitlementState,
  PublicSubscriptionPlan,
} from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type TierKey = "free" | "subscriber" | "pro" | "vip";
type BillingPeriod = "monthly" | "annual";

// ─── Palette — matches consumer premium screen exactly ────────────────────────

const TIER_PALETTE: Record<
  TierKey,
  {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    bg: string;
    border: string;
    bestValue?: boolean;
  }
> = {
  free: {
    label: "FREE",
    icon: "musical-notes-outline",
    color: "rgba(216,223,238,0.65)",
    bg: "rgba(216,223,238,0.05)",
    border: "rgba(216,223,238,0.16)",
  },
  subscriber: {
    label: "SUBSCRIBER",
    icon: "headset-outline",
    color: "#00B3A6",
    bg: "rgba(0,179,166,0.09)",
    border: "rgba(0,179,166,0.32)",
  },
  pro: {
    label: "PRO",
    icon: "flash-outline",
    color: "#E6B85C",
    bg: "rgba(230,184,92,0.09)",
    border: "rgba(230,184,92,0.32)",
  },
  vip: {
    label: "VIP",
    icon: "diamond-outline",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.09)",
    border: "rgba(167,139,250,0.32)",
    bestValue: true,
  },
};

// ─── Helpers (shared with consumer) ──────────────────────────────────────────

function resolveTierKey(machineKey: string): TierKey {
  const k = machineKey.toLowerCase();
  if (k.includes("founding")) return "subscriber"; // treated as consumer-only
  if (k.includes("vip")) return "vip";
  if (k.includes("pro")) return "pro";
  if (k.includes("subscriber") || k.includes("listener") || k.includes("premium"))
    return "subscriber";
  return "free";
}

function isAnnualPlan(plan: PublicSubscriptionPlan): boolean {
  return (
    plan.billingIntervalUnit === "year" ||
    (plan.billingIntervalUnit === "month" && plan.billingIntervalCount >= 10)
  );
}

function isFreePlan(plan: PublicSubscriptionPlan): boolean {
  return !plan.amount || plan.amount === 0;
}

function formatPriceLabel(plan: PublicSubscriptionPlan): string {
  if (isFreePlan(plan)) return "Free";
  if (!plan.amount) return "Free";
  if (isAnnualPlan(plan)) {
    return `${formatCurrency(String(plan.amount), plan.currency)} / mo`;
  }
  return `${formatCurrency(String(plan.amount), plan.currency)} / month`;
}

function computeSavingsPct(
  annualPlan: PublicSubscriptionPlan,
  allPlans: PublicSubscriptionPlan[],
): number | null {
  if (!annualPlan.amount) return null;
  const monthlyPlan = allPlans.find(
    (p) =>
      !isAnnualPlan(p) &&
      !isFreePlan(p) &&
      p.label === annualPlan.label &&
      p.billingIntervalUnit === "month" &&
      p.billingIntervalCount === 1,
  );
  if (!monthlyPlan?.amount) return null;
  return Math.round((1 - annualPlan.amount / monthlyPlan.amount) * 100);
}

function isCurrentPlan(
  plan: PublicSubscriptionPlan,
  entitlement: EntitlementState | null | undefined,
): boolean {
  if (!entitlement) return false;
  return (
    entitlement.plan.machineKey === plan.machineKey ||
    entitlement.source.planMachineKey === plan.machineKey
  );
}

function resolveEntitlementStatus(
  entitlement: EntitlementState | null | undefined,
): "active" | "grace" | "lapsed" | "none" {
  if (!entitlement) return "none";
  const s = entitlement.status.toLowerCase();
  if (s === "active") return "active";
  if (s.includes("grace")) return "grace";
  if (s.includes("cancel") || s.includes("expired") || s.includes("lapsed")) return "lapsed";
  return "active";
}

function formatCapabilityFallback(capability: string): string {
  const tail = capability.split(".").at(-1) ?? capability;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCapabilityDetails(
  capabilityDetails: EntitlementCapabilityDetail[] | undefined,
  capabilities: string[],
): EntitlementCapabilityDetail[] {
  if (capabilityDetails && capabilityDetails.length > 0) return capabilityDetails;
  return capabilities.map((capability, index) => ({
    key: capability,
    label: formatCapabilityFallback(capability),
    shortLabel: formatCapabilityFallback(capability),
    description: "",
    group: "Plan",
    sortOrder: index + 1,
  }));
}

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit == null) return null;
  const pct = Math.min(1, used / limit);
  return (
    <View style={bar.track}>
      <View
        style={[
          bar.fill,
          { width: `${Math.round(pct * 100)}%` as `${number}%` },
          pct >= 0.8 && bar.warn,
        ]}
      />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: tokens.colors.accent },
  warn: { backgroundColor: "#FF8C42" },
});

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  tierKey,
  palette,
  isCurrent,
  savingsPct,
  allPlans,
  onUpgrade,
}: {
  plan: PublicSubscriptionPlan;
  tierKey: TierKey;
  palette: typeof TIER_PALETTE[TierKey];
  isCurrent: boolean;
  savingsPct: number | null;
  allPlans: PublicSubscriptionPlan[];
  onUpgrade: () => void;
}) {
  const isFree = isFreePlan(plan);
  const capabilities = getCapabilityDetails(plan.capabilityDetails, plan.capabilities);

  return (
    <View>
      {palette.bestValue && !isCurrent && (
        <View style={s.bestValueRow}>
          <View style={[s.bestValuePill, { backgroundColor: palette.border }]}>
            <Text style={[s.bestValueText, { color: palette.color }]}>★ BEST VALUE</Text>
          </View>
        </View>
      )}

      <View style={[s.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={[s.iconWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Ionicons name={palette.icon} size={20} color={palette.color} />
          </View>
          <View style={s.cardMeta}>
            <View style={[s.tierChip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[s.tierChipText, { color: palette.color }]}>{palette.label}</Text>
            </View>
            <Text style={s.cardTitle}>{plan.label}</Text>
          </View>
          <View style={s.priceCol}>
            <Text style={[s.price, { color: palette.color }]}>{formatPriceLabel(plan)}</Text>
            {isCurrent && (
              <View style={s.currentBadge}>
                <Text style={s.currentBadgeText}>Current</Text>
              </View>
            )}
            {savingsPct !== null && (
              <View style={[s.savingsBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <Text style={[s.savingsBadgeText, { color: palette.color }]}>SAVE {savingsPct}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <View style={s.capBlock}>
            {capabilities.map((cap) => (
              <View key={cap.key} style={s.capRow}>
                <Ionicons name="checkmark-outline" size={13} color={palette.color} />
                <Text style={s.capText}>{cap.shortLabel || cap.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        {isFree ? (
          <View style={[s.freeCta, { borderColor: palette.border }]}>
            <Text style={[s.freeCtaLabel, { color: palette.color }]}>Your current access</Text>
          </View>
        ) : !isCurrent ? (
          <AnimatedPressable onPress={onUpgrade} scaleValue={0.93} style={[s.cta, { backgroundColor: palette.color }]}>
            <Text style={s.ctaLabel}>Upgrade</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlanScreen() {

  const { session } = useAuth();
  const { isPro, customerInfo } = useSubscription();
  const presentPaywallIfNeeded = usePresentPaywallIfNeeded();
  const presentCustomerCenter = usePresentCustomerCenter();
  const restorePurchases = useRestorePurchases();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [isRestoring, setIsRestoring] = useState(false);

  const { data: allPlans = [], isLoading: plansLoading } = useGetPublicSubscriptionPlansQuery();
  const { data: entitlement, isLoading: entitlementLoading } = useGetCurrentEntitlementsQuery(
    { accessToken: session?.accessToken },
    { skip: !session },
  );

  const loading = plansLoading || (!!session && entitlementLoading);
  const entitlementStatus = resolveEntitlementStatus(entitlement);
  const hasActivePlan = entitlementStatus === "active" || entitlementStatus === "grace";
  const hasAnnualPlans = allPlans.some((p) => !isFreePlan(p) && isAnnualPlan(p));

  const currentCapabilityDetails = getCapabilityDetails(
    entitlement?.plan.capabilityDetails,
    entitlement?.capabilities ?? [],
  );

  const visiblePlans = allPlans.filter((p) => {
    // Allowlist: only show free, pro, and vip tiers in the creator app.
    // Subscriber/listener and founder plans are consumer-facing only.
    const tier = resolveTierKey(p.machineKey);
    if (tier !== "free" && tier !== "pro" && tier !== "vip") return false;
    if (isFreePlan(p)) return true;
    if (billingPeriod === "annual") return isAnnualPlan(p);
    return !isAnnualPlan(p);
  });

  const proExpiry = customerInfo?.entitlements.active[ENTITLEMENT_PRO]?.expirationDate;

  async function handleRestore() {
    setIsRestoring(true);
    await restorePurchases();
    setIsRestoring(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScreenHeader title="Plans" subtitle="Subscription and access" showBackButton />
        <View style={s.loadingWrap}>
          <Skeleton width={140} height={20} borderRadius={10} />
          <Skeleton width="100%" height={260} borderRadius={8} />
          <Skeleton width="100%" height={260} borderRadius={8} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScreenHeader title="Plans" subtitle="Subscription and access" showBackButton />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={s.heroWrap}>
          {hasActivePlan && entitlement ? (
            (() => {
              const tier = resolveTierKey(entitlement.plan.machineKey);
              const palette = TIER_PALETTE[tier];
              return (
                <>
                  <View style={[s.heroBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                    <Ionicons name={palette.icon} size={12} color={palette.color} />
                    <Text style={[s.heroBadgeText, { color: palette.color }]}>{palette.label}</Text>
                  </View>
                  <Text style={s.heroTitle}>{entitlement.plan.label}</Text>
                  <Text style={s.heroSubtitle}>Your current plan</Text>
                  {entitlementStatus === "grace" && (
                    <View style={s.graceRow}>
                      <Ionicons name="warning-outline" size={13} color={tokens.colors.warning} />
                      <Text style={s.graceText}>Payment issue — update billing to keep access</Text>
                    </View>
                  )}
                </>
              );
            })()
          ) : (
            <>
              <Text style={s.heroTitle}>Unlock the full{"\n"}creator toolkit.</Text>
              <Text style={s.heroSubtitle}>
                Sell directly to fans, access advanced analytics, and upload faster.
              </Text>
            </>
          )}
        </View>


        {/* ── Billing toggle ────────────────────────────────────────────── */}
        {hasAnnualPlans && (
          <View style={s.toggleWrap}>
            <AnimatedPressable
              onPress={() => setBillingPeriod("monthly")}
              haptic="selection"
              style={[s.toggleOption, billingPeriod === "monthly" && s.toggleOptionActive]}
            >
              <Text style={[s.toggleLabel, billingPeriod === "monthly" && s.toggleLabelActive]}>
                Monthly
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setBillingPeriod("annual")}
              haptic="selection"
              style={[s.toggleOption, billingPeriod === "annual" && s.toggleOptionActive]}
            >
              <Text style={[s.toggleLabel, billingPeriod === "annual" && s.toggleLabelActive]}>
                Yearly
              </Text>
              <View style={s.saveChip}>
                <Text style={s.saveChipText}>SAVE 17%</Text>
              </View>
            </AnimatedPressable>
          </View>
        )}

        {/* ── Current plan perks ────────────────────────────────────────── */}
        {hasActivePlan && entitlement && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>What&apos;s included</Text>
            <View style={s.capList}>
              {currentCapabilityDetails.length > 0 ? (
                currentCapabilityDetails.map((cap) => (
                  <View key={cap.key} style={s.capRow}>
                    <Ionicons name="checkmark-circle" size={15} color={tokens.colors.accent} />
                    <Text style={s.capText}>{cap.shortLabel || cap.label}</Text>
                  </View>
                ))
              ) : (
                <Text style={s.mutedText}>Full access granted via your active plan.</Text>
              )}
            </View>
            {entitlement.period.currentPeriodEndsAt ? (
              <View style={s.renewRow}>
                <Ionicons name="calendar-outline" size={13} color={tokens.colors.textSecondary} />
                <Text style={s.renewText}>
                  {entitlementStatus === "grace" ? "Grace period ends " : "Renews "}
                  {new Date(entitlement.period.currentPeriodEndsAt * 1000).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
            <AnimatedPressable onPress={() => void presentCustomerCenter()} style={s.manageButton}>
              <Text style={s.manageButtonLabel}>Manage subscription</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* ── Plan cards ────────────────────────────────────────────────── */}
        {visiblePlans.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{hasActivePlan ? "All plans" : "Choose a plan"}</Text>
            <View style={s.cardList}>
              {visiblePlans.map((plan) => {
                const tierKey = resolveTierKey(plan.machineKey);
                const palette = TIER_PALETTE[tierKey];
                const isCurrent = isCurrentPlan(plan, entitlement);
                const savingsPct =
                  billingPeriod === "annual" && isAnnualPlan(plan)
                    ? computeSavingsPct(plan, allPlans)
                    : null;
                return (
                  <PlanCard
                    key={plan.uuid}
                    plan={plan}
                    tierKey={tierKey}
                    palette={palette}
                    isCurrent={isCurrent}
                    savingsPct={savingsPct}
                    allPlans={allPlans}
                    onUpgrade={() => void presentPaywallIfNeeded()}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* ── Restore ───────────────────────────────────────────────────── */}
        <View style={s.restoreWrap}>
          <Text style={s.restoreLink} onPress={() => void handleRestore()}>
            {isRestoring ? "Restoring…" : "Restore purchases"}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 140, gap: 20 },

  heroWrap: { gap: 10, paddingVertical: 4 },
  heroBadge: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center",
    gap: 5, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: tokens.radii.pill, borderWidth: 1,
  },
  heroBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  heroTitle: { color: tokens.colors.textPrimary, fontSize: 26, fontWeight: "800", lineHeight: 33 },
  heroSubtitle: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 21, maxWidth: 320 },
  graceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  graceText: { color: tokens.colors.warning, fontSize: 13, flexShrink: 1, lineHeight: 18 },

  usageCard: {
    backgroundColor: tokens.colors.panelGlassStrong,
    borderRadius: tokens.radii.xl, borderWidth: 1,
    borderColor: tokens.colors.borderAccent, padding: 16, gap: 10,
  },
  usageLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  usageLabel: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  usageCount: { color: tokens.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  usageWarning: { color: "#FF8C42", fontSize: 12, lineHeight: 18 },

  toggleWrap: {
    flexDirection: "row", alignSelf: "center",
    borderRadius: tokens.radii.pill, borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface, padding: 3, gap: 2,
  },
  toggleOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: tokens.radii.pill },
  toggleOptionActive: { backgroundColor: tokens.colors.bgElevated },
  toggleLabel: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  toggleLabelActive: { color: tokens.colors.textPrimary },
  saveChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: tokens.radii.pill, backgroundColor: "rgba(0,179,166,0.18)" },
  saveChipText: { color: "#00B3A6", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  section: { gap: 10 },
  sectionLabel: { color: tokens.colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  capList: { borderRadius: tokens.radii.xl, backgroundColor: tokens.colors.bgSurface, borderWidth: 1, borderColor: tokens.colors.borderSubtle, padding: 16, gap: 10 },
  capRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  capText: { color: tokens.colors.textPrimary, fontSize: 13, flex: 1 },
  mutedText: { color: tokens.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  renewRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  renewText: { color: tokens.colors.textSecondary, fontSize: 12 },
  manageButton: {
    alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: tokens.radii.pill, borderWidth: 1,
    borderColor: tokens.colors.borderAccent, backgroundColor: tokens.colors.accentDim,
  },
  manageButtonLabel: { color: tokens.colors.textPrimary, fontSize: 13, fontWeight: "700" },

  cardList: { gap: 16 },
  bestValueRow: { alignItems: "center", marginBottom: 8 },
  bestValuePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: tokens.radii.pill },
  bestValueText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  card: { borderRadius: tokens.radii.xl, borderWidth: 1, padding: 20, gap: 18 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cardMeta: { flex: 1, gap: 4 },
  tierChip: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: tokens.radii.pill, borderWidth: 1 },
  tierChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  cardTitle: { color: tokens.colors.textPrimary, fontSize: 16, fontWeight: "700" },
  priceCol: { alignItems: "flex-end", gap: 5 },
  price: { fontSize: 14, fontWeight: "700" },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: tokens.radii.pill, backgroundColor: tokens.colors.accent },
  currentBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  savingsBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: tokens.radii.pill, borderWidth: 1 },
  savingsBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  capBlock: { gap: 8 },
  cta: { alignItems: "center", paddingVertical: 14, borderRadius: tokens.radii.pill },
  ctaLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },
  freeCta: { alignItems: "center", paddingVertical: 13, borderRadius: tokens.radii.pill, borderWidth: 1 },
  freeCtaLabel: { fontSize: 13, fontWeight: "600" },

  restoreWrap: { alignItems: "center" },
  restoreLink: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "500", textDecorationLine: "underline" },
});
