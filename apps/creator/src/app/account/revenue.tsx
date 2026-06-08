import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable, AppHeader } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { tokens } from "@micboxx/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <View style={[s.card, accent && s.cardAccent]}>{children}</View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function CtaButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={[s.cta, accent && s.ctaAccent]}>
      <Text style={[s.ctaLabel, accent && s.ctaLabelAccent]}>{label}</Text>
    </AnimatedPressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const bootstrap = useCreatorBootstrap();
  const revenue = bootstrap.analytics?.revenue ?? null;
  const trackCount = bootstrap.tracksSummary?.tracks.length ?? 0;
  const albumCount = bootstrap.albumsSummary?.albums.length ?? 0;

  const sellingLocked = Boolean(revenue?.sellingLocked ?? true);
  const grossRevenue = revenue?.snapshot?.grossRevenue ?? 0;
  const salesCount = revenue?.snapshot?.salesCount ?? 0;
  const hasSales = salesCount > 0;
  const topTrack = revenue?.snapshot?.topEarningTrack ?? null;
  const topAlbum = revenue?.snapshot?.topEarningAlbum ?? null;

  const topEarners = useMemo(() => {
    if (!revenue?.topEarningReleases) return [];
    return revenue.topEarningReleases
      .filter((r) => r.revenue > 0)
      .slice(0, 5);
  }, [revenue]);

  // ── State: Free / selling locked ────────────────────────────────────────
  if (sellingLocked) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader variant="detail" title="Earnings" fallbackRoute="/(tabs)/dashboard" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Card accent>
            <View style={s.heroIcon}>
              <Ionicons name="storefront-outline" size={28} color={tokens.colors.accent} />
            </View>
            <Text style={s.heroTitle}>Start earning from your catalog</Text>
            <Text style={s.heroBody}>
              Upgrade to unlock direct-to-fan selling and track your sales here.
            </Text>
            <CtaButton
              label="Unlock selling tools"
              accent
              onPress={() => router.push("/account/plan" as never)}
            />
          </Card>

          {/* Progress */}
          <Card>
            <Text style={s.cardTitle}>Your progress</Text>
            <Divider />
            <StatRow label="Tracks uploaded" value={String(trackCount)} />
            <Divider />
            <StatRow label="Albums created" value={String(albumCount)} />
            <Divider />
            <View style={s.lockedRow}>
              <Ionicons name="lock-closed" size={13} color="#A78BFA" style={{ marginRight: 6 }} />
              <Text style={s.lockedLabel}>Selling tools locked on Free</Text>
            </View>
            <CtaButton label="View plans" onPress={() => router.push("/account/plan" as never)} />
          </Card>

          {/* Payouts locked */}
          <Card>
            <Text style={s.cardTitle}>Payouts</Text>
            <Divider />
            <Text style={s.bodyText}>Available after selling is enabled.</Text>
            <CtaButton label="View plans" onPress={() => router.push("/account/plan" as never)} />
          </Card>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── State: Pro, selling enabled, no sales yet ────────────────────────────
  if (!hasSales) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader variant="detail" title="Earnings" fallbackRoute="/(tabs)/dashboard" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Card accent>
            <View style={s.heroIcon}>
              <Ionicons name="checkmark-circle-outline" size={28} color={tokens.colors.accent} />
            </View>
            <Text style={s.heroTitle}>Your store is ready</Text>
            <Text style={s.heroBody}>
              Sales from tracks and releases will appear here once fans start buying.
            </Text>
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>$0.00</Text>
                <Text style={s.heroStatLabel}>Earned</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>0</Text>
                <Text style={s.heroStatLabel}>Sales</Text>
              </View>
            </View>
            <CtaButton
              label="Go to catalog"
              onPress={() => router.push("/catalog/tracks" as never)}
            />
          </Card>

          {/* Next milestone */}
          <Card>
            <Text style={s.cardTitle}>Next milestone</Text>
            <Divider />
            <View style={s.milestoneRow}>
              <View style={s.milestoneIcon}>
                <Ionicons name="trophy-outline" size={20} color={tokens.colors.accent} />
              </View>
              <View style={s.milestoneCopy}>
                <Text style={s.milestoneTitle}>First sale</Text>
                <Text style={s.milestoneBody}>
                  Share your latest release to start building momentum.
                </Text>
              </View>
            </View>
          </Card>

          {/* Progress */}
          <Card>
            <Text style={s.cardTitle}>Your progress</Text>
            <Divider />
            <StatRow label="Tracks uploaded" value={String(trackCount)} />
            <Divider />
            <StatRow label="Albums created" value={String(albumCount)} />
          </Card>

          {/* Top earners — empty state */}
          <Card>
            <Text style={s.cardTitle}>Top earners</Text>
            <Divider />
            <Text style={s.bodyText}>
              Your top earning tracks and albums will appear here once you have sales.
            </Text>
          </Card>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── State: Has sales ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <AppHeader variant="detail" title="Earnings" fallbackRoute="/(tabs)/dashboard" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero earnings card */}
        <Card accent>
          <View style={s.milestoneRow}>
            <View style={s.milestoneIcon}>
              <Ionicons name="ribbon-outline" size={20} color={tokens.colors.accent} />
            </View>
            <Text style={s.milestoneTitle}>Milestone unlocked</Text>
          </View>
          <Text style={[s.milestoneBody, { marginTop: 4, marginBottom: 16 }]}>
            Your catalog has started earning.
          </Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{formatCurrency(grossRevenue)}</Text>
              <Text style={s.heroStatLabel}>Total earned</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{salesCount}</Text>
              <Text style={s.heroStatLabel}>Sales</Text>
            </View>
          </View>
        </Card>

        {/* Top earners */}
        {(topTrack?.title || topAlbum?.title) && (
          <Card>
            <Text style={s.cardTitle}>Top earners</Text>
            {topTrack?.title && (
              <>
                <Divider />
                <View style={s.earnerRow}>
                  <View style={s.earnerCopy}>
                    <Text style={s.earnerLabel}>Top track</Text>
                    <Text style={s.earnerTitle} numberOfLines={1}>{topTrack.title}</Text>
                  </View>
                  <Text style={s.earnerAmount}>{formatCurrency(topTrack.amount ?? 0)}</Text>
                </View>
              </>
            )}
            {topAlbum?.title && (
              <>
                <Divider />
                <View style={s.earnerRow}>
                  <View style={s.earnerCopy}>
                    <Text style={s.earnerLabel}>Top album</Text>
                    <Text style={s.earnerTitle} numberOfLines={1}>{topAlbum.title}</Text>
                  </View>
                  <Text style={s.earnerAmount}>{formatCurrency(topAlbum.amount ?? 0)}</Text>
                </View>
              </>
            )}
          </Card>
        )}

        {/* Ranked releases */}
        {topEarners.length > 0 && (
          <Card>
            <Text style={s.cardTitle}>Sales breakdown</Text>
            {topEarners.map((item, i) => (
              <View key={`${item.type}-${item.id}`}>
                {i > 0 && <Divider />}
                <View style={s.earnerRow}>
                  <View style={s.earnerCopy}>
                    <Text style={s.earnerTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.earnerLabel}>{item.type === "album" ? "Album" : "Track"}</Text>
                  </View>
                  <View style={s.earnerMeta}>
                    <Text style={s.earnerAmount}>{formatCurrency(item.revenue)}</Text>
                    {item.unitsSold != null && (
                      <Text style={s.earnerUnits}>{item.unitsSold} sold</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Progress */}
        <Card>
          <Text style={s.cardTitle}>Catalog</Text>
          <Divider />
          <StatRow label="Tracks" value={String(trackCount)} />
          <Divider />
          <StatRow label="Albums" value={String(albumCount)} />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  scroll: { padding: 16, gap: 12, paddingBottom: 60 },

  card: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  cardAccent: {
    borderColor: tokens.colors.borderAccent,
    backgroundColor: "rgba(0,200,180,0.04)",
  },
  cardTitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  divider: { height: 1, backgroundColor: tokens.colors.borderSubtle },

  // Hero
  heroIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.bgApp,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingVertical: 14,
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatValue: { color: tokens.colors.textPrimary, fontSize: 20, fontWeight: "800" },
  heroStatLabel: { color: tokens.colors.textSecondary, fontSize: 12, fontWeight: "600" },
  heroStatDivider: { width: 1, height: 28, backgroundColor: tokens.colors.borderSubtle },

  // CTA
  cta: {
    alignItems: "center", paddingVertical: 12,
    borderRadius: tokens.radii.pill,
    borderWidth: 1, borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgApp,
  },
  ctaAccent: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  ctaLabel: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  ctaLabelAccent: { color: "#fff" },

  // Stat row
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statLabel: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "600" },
  statValue: { color: tokens.colors.textSecondary, fontSize: 14, fontWeight: "600" },

  // Locked
  lockedRow: { flexDirection: "row", alignItems: "center" },
  lockedLabel: { color: "#A78BFA", fontSize: 13, fontWeight: "600" },

  // Body text
  bodyText: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 21 },

  // Milestone
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  milestoneIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center", justifyContent: "center",
  },
  milestoneTitle: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "700" },
  milestoneBody: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 21 },

  // Earner rows
  earnerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12,
  },
  earnerCopy: { flex: 1, gap: 2 },
  earnerLabel: { color: tokens.colors.textSecondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  earnerTitle: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  earnerMeta: { alignItems: "flex-end", gap: 2 },
  earnerAmount: { color: tokens.colors.accent, fontSize: 14, fontWeight: "800" },
  earnerUnits: { color: tokens.colors.textSecondary, fontSize: 11, fontWeight: "600" },
});
