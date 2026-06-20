import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  usePurchasePlan,
  usePresentCustomerCenter,
  useRestorePurchases,
} from "@/features/subscription/hooks";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable, Skeleton } from "@micboxx/ui";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import type {
  EntitlementCapabilityDetail,
  EntitlementState,
  PublicSubscriptionPlan,
} from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { formatCurrency } from "@micboxx/api";
import {
  useGetCurrentEntitlementsQuery,
  useGetPublicSubscriptionPlansQuery,
} from "@micboxx/api";
import { tokens } from "@micboxx/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type BillingPeriod = "monthly" | "annual";
type TierKey = "free" | "subscriber" | "pro" | "vip";

const TIER_PALETTE: Record<
  TierKey,
  {
    label: string;
    icon: IoniconName;
    color: string;
    bg: string;
    border: string;
    mostPopular?: boolean;
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
    mostPopular: true,
  },
};


function resolveTierKey(machineKey: string): TierKey {
  const k = machineKey.toLowerCase();
  if (k.includes("vip")) return "vip";
  if (k.includes("pro")) return "pro";
  if (
    k.includes("subscriber") ||
    k.includes("listener") ||
    k.includes("premium")
  )
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
  // For annual plans, the API returns the per-month equivalent rate directly
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
  // Both amounts are per-month rates; compare directly
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
  if (s.includes("cancel") || s.includes("expired") || s.includes("lapsed"))
    return "lapsed";
  return "active";
}

function formatCapabilityFallback(capability: string): string {
  const tail = capability.split(".").at(-1) ?? capability;
  return tail
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getCapabilityDetails(
  capabilityDetails: EntitlementCapabilityDetail[] | undefined,
  capabilities: string[],
): EntitlementCapabilityDetail[] {
  if (capabilityDetails && capabilityDetails.length > 0) {
    return capabilityDetails;
  }

  return capabilities.map((capability, index) => ({
    key: capability,
    label: formatCapabilityFallback(capability),
    shortLabel: formatCapabilityFallback(capability),
    description: "",
    group: "Plan",
    sortOrder: index + 1,
  }));
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const purchasePlan = usePurchasePlan();
  const presentCustomerCenter = usePresentCustomerCenter();
  const restorePurchases = useRestorePurchases();

  const { data: allPlans = [], isLoading: plansLoading } =
    useGetPublicSubscriptionPlansQuery();

  const { data: entitlement, isLoading: entitlementLoading } =
    useGetCurrentEntitlementsQuery(
      { accessToken: session?.accessToken },
      { skip: !session },
    );

  const loading = plansLoading || (!!session && entitlementLoading);
  const entitlementStatus = resolveEntitlementStatus(entitlement);
  const hasActivePlan =
    entitlementStatus === "active" || entitlementStatus === "grace";

  const hasAnnualPlans = allPlans.some(
    (p) => !isFreePlan(p) && isAnnualPlan(p),
  );

  const currentCapabilityDetails = getCapabilityDetails(
    entitlement?.plan.capabilityDetails,
    entitlement?.capabilities ?? [],
  );

  const visiblePlans = allPlans.filter((p) => {
    const tier = resolveTierKey(p.machineKey);
    if (tier !== "free" && tier !== "subscriber") return false;
    if (isFreePlan(p)) return true;
    if (billingPeriod === "annual") return isAnnualPlan(p);
    return !isAnnualPlan(p);
  });


  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader
          title="Subscriptions"
          subtitle="Plans and access"
          leftIcon="menu"
        />
        <View style={styles.loadingWrap}>
          <Skeleton width={140} height={20} borderRadius={10} />
          <Skeleton width="100%" height={260} borderRadius={8} />
          <Skeleton width="100%" height={260} borderRadius={8} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Subscriptions"
        subtitle="Plans and access"
        leftIcon="menu"
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          {hasActivePlan && entitlement ? (
            (() => {
              const tier = resolveTierKey(entitlement.plan.machineKey);
              const palette = TIER_PALETTE[tier];
              return (
                <>
                  <View
                    style={[
                      styles.heroBadge,
                      {
                        backgroundColor: palette.bg,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={palette.icon}
                      size={12}
                      color={palette.color}
                    />
                    <Text
                      style={[styles.heroBadgeText, { color: palette.color }]}
                    >
                      {palette.label}
                    </Text>
                  </View>
                  <Text style={styles.heroTitle}>{entitlement.plan.label}</Text>
                  <Text style={styles.heroSubtitle}>
                    Your current membership
                  </Text>
                  {entitlementStatus === "grace" && (
                    <View style={styles.graceRow}>
                      <Ionicons
                        name="warning-outline"
                        size={13}
                        color={tokens.colors.warning}
                      />
                      <Text style={styles.graceText}>
                        Payment issue — update billing to keep access
                      </Text>
                    </View>
                  )}
                </>
              );
            })()
          ) : (
            <>
              <Text style={styles.heroTitle}>
                Choose how you want{"\n"}MicBoxx to sound.
              </Text>
              <Text style={styles.heroSubtitle}>
                Start free, then upgrade for full access to subscriber-only
                releases and ad-free listening.
              </Text>
            </>
          )}
        </View>

        {/* Monthly / Annual toggle */}
        {hasAnnualPlans && (
          <View style={styles.toggleWrap}>
            <AnimatedPressable
              onPress={() => setBillingPeriod("monthly")}
              haptic="selection"
              style={[
                styles.toggleOption,
                billingPeriod === "monthly" && styles.toggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  billingPeriod === "monthly" && styles.toggleLabelActive,
                ]}
              >
                Monthly
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setBillingPeriod("annual")}
              haptic="selection"
              style={[
                styles.toggleOption,
                billingPeriod === "annual" && styles.toggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  billingPeriod === "annual" && styles.toggleLabelActive,
                ]}
              >
                Yearly
              </Text>
              <View style={styles.saveChip}>
                <Text style={styles.saveChipText}>SAVE 17%</Text>
              </View>
            </AnimatedPressable>
          </View>
        )}

        {/* Current plan perks */}
        {hasActivePlan && entitlement && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What&apos;s included</Text>
            <View style={styles.capList}>
              {currentCapabilityDetails.length > 0 ? (
                currentCapabilityDetails.map((capability) => (
                  <View key={capability.key} style={styles.capRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={tokens.colors.accent}
                    />
                    <View style={styles.capCopy}>
                      <Text style={styles.capText}>
                        {capability.shortLabel || capability.label}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.mutedText}>
                  Full access granted via your active plan.
                </Text>
              )}
            </View>
            {entitlement.period.currentPeriodEndsAt ? (
              <View style={styles.renewRow}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={tokens.colors.textSecondary}
                />
                <Text style={styles.renewText}>
                  {entitlementStatus === "grace"
                    ? "Grace period ends "
                    : "Renews "}
                  {new Date(
                    entitlement.period.currentPeriodEndsAt * 1000,
                  ).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
            <AnimatedPressable
              onPress={() => void presentCustomerCenter()}
              style={styles.manageButton}
            >
              <Text style={styles.manageButtonLabel}>Manage subscription</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Plan cards */}
        {visiblePlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {hasActivePlan ? "All plans" : "Choose a plan"}
            </Text>
            <View style={styles.planList}>
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
                    onUpgrade={() => plan.storeProductId ? void purchasePlan(plan.storeProductId) : undefined}
                    isSignedIn={!!session}
                    onSignIn={() => router.push("/sign-in")}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Guest nudge */}
        {!session && (
          <View style={styles.guestRow}>
            <Text style={styles.guestText}>Already subscribed?</Text>
            <AnimatedPressable
              onPress={() => router.push("/sign-in")}
              style={styles.inlineButton}
            >
              <Text style={styles.inlineButtonLabel}>Sign in</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerDisclaimer}>
            Auto-renewable subscription. Payment will be charged to your Apple ID at confirmation of purchase and will automatically renew unless canceled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID Account Settings.
          </Text>
          <View style={styles.footerLinks}>
            <Text
              style={styles.footerLink}
              onPress={() => void Linking.openURL("https://micboxx.com/terms")}
            >
              Terms of Use
            </Text>
            <Text style={styles.footerDot}>·</Text>
            <Text
              style={styles.footerLink}
              onPress={() => void Linking.openURL("https://micboxx.com/privacy")}
            >
              Privacy Policy
            </Text>
            <Text style={styles.footerDot}>·</Text>
            <Text
              style={styles.footerLink}
              onPress={() => void restorePurchases()}
            >
              Restore Purchases
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  tierKey,
  palette,
  isCurrent,
  savingsPct,
  allPlans,
  onUpgrade,
  isSignedIn,
  onSignIn,
}: {
  plan: PublicSubscriptionPlan;
  tierKey: TierKey;
  palette: (typeof TIER_PALETTE)[TierKey];
  isCurrent: boolean;
  savingsPct: number | null;
  allPlans: PublicSubscriptionPlan[];
  onUpgrade: () => void;
  isSignedIn: boolean;
  onSignIn: () => void;
}) {
  const isFree = isFreePlan(plan);

  return (
    <View>
      {palette.mostPopular && !isCurrent && (
        <View style={styles.popularLabelRow}>
          <View
            style={[
              styles.popularLabelPill,
              { backgroundColor: palette.border },
            ]}
          >
            <Text style={[styles.popularLabelText, { color: palette.color }]}>
              ★ MOST POPULAR
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.planCard,
          { backgroundColor: palette.bg },
          isCurrent && styles.planCardCurrent,
        ]}
      >
        {/* Header row */}
        <View style={styles.planHeader}>
          <View
            style={[
              styles.planIconWrap,
              { backgroundColor: palette.bg, borderColor: palette.border },
            ]}
          >
            <Ionicons name={palette.icon} size={20} color={palette.color} />
          </View>
          <View style={styles.planMeta}>
            <View
              style={[
                styles.tierChip,
                { backgroundColor: palette.bg, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.tierChipText, { color: palette.color }]}>
                {palette.label}
              </Text>
            </View>
            <Text style={styles.planTitle}>{plan.label}</Text>
          </View>
          <View style={styles.planPriceCol}>
            <Text style={[styles.planPrice, { color: palette.color }]}>
              {formatPriceLabel(plan)}
            </Text>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
            {savingsPct !== null && (
              <View
                style={[
                  styles.savingsBadge,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[styles.savingsBadgeText, { color: palette.color }]}
                >
                  SAVE {savingsPct}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Capabilities */}
        {getCapabilityDetails(plan.capabilityDetails, plan.capabilities)
          .length > 0 && (
          <View style={styles.capBlock}>
            {getCapabilityDetails(
              plan.capabilityDetails,
              plan.capabilities,
            ).map((capability) => (
              <View key={capability.key} style={styles.capRow}>
                <Ionicons
                  name="checkmark-outline"
                  size={13}
                  color={palette.color}
                />
                <View style={styles.capCopy}>
                  <Text style={styles.capText}>
                    {capability.shortLabel || capability.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        {isFree ? (
          <>
            <AnimatedPressable
              onPress={isSignedIn ? undefined : onSignIn}
              scaleValue={0.95}
              style={[styles.freeCta, { borderColor: palette.border }]}
            >
              <Text style={[styles.freeCtaLabel, { color: palette.color }]}>
                {isSignedIn ? "Your current access" : "Explore free"}
              </Text>
            </AnimatedPressable>
          </>
        ) : !isCurrent ? (
          <AnimatedPressable
            onPress={isSignedIn ? onUpgrade : onSignIn}
            scaleValue={0.93}
            style={[styles.planCta, { backgroundColor: palette.color }]}
          >
            <Text style={styles.planCtaLabel}>
              {isSignedIn ? "Upgrade" : "Get started"}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: { width: 36 },
  headerRight: { width: 36, alignItems: "flex-end" },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 18,
  },

  heroWrap: { gap: 10, paddingVertical: 4 },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
  },
  heroBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 33,
  },
  heroSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
  },
  graceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  graceText: {
    color: tokens.colors.warning,
    fontSize: 13,
    flexShrink: 1,
    lineHeight: 18,
  },

  toggleWrap: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    padding: 3,
    gap: 2,
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: tokens.radii.pill,
  },
  toggleOptionActive: { backgroundColor: tokens.colors.bgElevated },
  toggleLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  toggleLabelActive: { color: tokens.colors.textPrimary },
  saveChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(0,179,166,0.18)",
  },
  saveChipText: {
    color: "#00B3A6",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  section: { gap: 10 },
  sectionLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  capList: {
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 16,
    gap: 10,
  },
  capRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  capCopy: { flex: 1 },
  capText: { color: tokens.colors.textPrimary, fontSize: 13, flexShrink: 1 },
  mutedText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  renewRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  renewText: { color: tokens.colors.textSecondary, fontSize: 12 },
  manageButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    backgroundColor: tokens.colors.accentDim,
  },
  manageButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  planList: { gap: 16 },
  planCard: {
    borderRadius: tokens.radii.xl,
    padding: 22,
    gap: 20,
    overflow: "hidden",
  },
  planCardCurrent: {},
  popularLabelRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  popularLabelPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: tokens.radii.pill,
  },
  popularLabelText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  planMeta: { flex: 1, gap: 4 },
  tierChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
  },
  tierChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  planTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  planPriceCol: { alignItems: "flex-end", gap: 5 },
  planPrice: { fontSize: 14, fontWeight: "700" },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
  },
  currentBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  savingsBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
  },
  savingsBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  capBlock: { gap: 8 },
  planCta: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: tokens.radii.pill,
  },
  planCtaLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },
  freeCta: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
  },
  freeCtaLabel: { fontSize: 13, fontWeight: "600" },

  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  guestText: { color: tokens.colors.textSecondary, fontSize: 13 },
  inlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  inlineButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  footer: { gap: 12, paddingTop: 8 },
  footerDisclaimer: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  footerLink: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  footerDot: { color: tokens.colors.textSecondary, fontSize: 12 },
});
