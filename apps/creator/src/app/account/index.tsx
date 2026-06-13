import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { AnimatedPressable, Avatar, Screen, useToast } from "@micboxx/ui";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { useAuth } from "@/features/auth/provider";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { useAccountPreferences } from "@/features/account/provider";
import {
  ENTITLEMENT_PRO,
  useSubscription,
} from "@/features/subscription/provider";
import {
  usePresentPaywallIfNeeded,
  usePresentCustomerCenter,
  useRestorePurchases,
} from "@/features/subscription/hooks";
import { deleteAccount } from "@/shared/api/creator-dashboard";
import { tokens } from "@micboxx/theme";

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used, limit }: { used: number; limit: number }) {
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

// ─── Access row ───────────────────────────────────────────────────────────────

function AccessRow({
  label,
  unlocked,
  unlockedLabel = "Enabled",
  lockedLabel = "Locked",
}: {
  label: string;
  unlocked: boolean;
  unlockedLabel?: string;
  lockedLabel?: string;
}) {
  return (
    <View style={s.accessRow}>
      <Text style={s.accessLabel}>{label}</Text>
      <View style={[s.accessBadge, unlocked ? s.accessBadgeEnabled : s.accessBadgeLocked]}>
        {!unlocked && (
          <Ionicons name="lock-closed" size={9} color="#A78BFA" style={{ marginRight: 3 }} />
        )}
        <Text style={[s.accessBadgeText, unlocked ? s.accessBadgeTextEnabled : s.accessBadgeTextLocked]}>
          {unlocked ? unlockedLabel : lockedLabel}
        </Text>
      </View>
    </View>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const bootstrap = useCreatorBootstrap();
  const { session, signOut } = useAuth();
  const { preferences, setAdvancedModeEnabled } = useAccountPreferences();
  const { showToast } = useToast();

  const { isPro, isLoading: subLoading, customerInfo } = useSubscription();
  const presentPaywallIfNeeded = usePresentPaywallIfNeeded();
  const presentCustomerCenter = usePresentCustomerCenter();
  const restorePurchases = useRestorePurchases();

  const [isRestoring, setIsRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const profile = bootstrap.profile;
  const analytics = bootstrap.analytics;
  const uploadPolicy = bootstrap.uploadOptions?.uploadPolicy;

  const trackLimit = uploadPolicy?.trackLimit ?? null;
  const tracksUsed = uploadPolicy?.tracksUsed ?? 0;
  const tracksRemaining = trackLimit != null ? Math.max(0, trackLimit - tracksUsed) : null;

  const canSellCatalog = Boolean(analytics?.access.canSellCatalog);
  const hasAdvancedAnalytics = Boolean(analytics?.access.hasAdvancedAnalytics);
  const hasPremiumAnalytics = Boolean(analytics?.access.hasPremiumAnalytics);
  const canMultiUpload = Boolean(uploadPolicy?.canMultiUpload);

  const verificationStatus = profile?.verification.status ?? null;
  const isVerified = verificationStatus?.toLowerCase() === "verified";

  const proExpiry = customerInfo?.entitlements.active[ENTITLEMENT_PRO]?.expirationDate;
  const planLabel = analytics?.overview.planLabel ?? (isPro ? "MicBoxx Pro" : "Free Artist Plan");

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleRestore() {
    setIsRestoring(true);
    await restorePurchases();
    setIsRestoring(false);
  }

  function handleToggleAdvancedMode(val: boolean) {
    void setAdvancedModeEnabled(val);
    showToast({
      tone: "info",
      title: val ? "Advanced Mode Enabled" : "Standard Mode Restored",
    });
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account, all your tracks, albums, and room data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Once deleted, your account and all content are gone forever.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete my account", style: "destructive", onPress: () => void confirmDelete() },
              ],
            );
          },
        },
      ],
    );
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      router.replace("/");
    } catch (err) {
      setDeleting(false);
      showToast({
        tone: "error",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unable to delete account. Please try again.",
      });
    }
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title="Account"
          subtitle="Profile, plan, and creator access"
          showBackButton
        />
      }
      contentContainerStyle={s.scroll}
    >
      {/* ── Profile card ──────────────────────────────────────────────── */}
      <AnimatedPressable
        onPress={() => router.push("/account/profile" as never)}
        haptic="selection"
        style={s.profileCard}
      >
        <Avatar
          uri={profile?.avatarUrl}
          displayName={profile?.displayName ?? "Creator"}
          size={56}
        />
        <View style={s.profileCopy}>
          <Text style={s.profileName} numberOfLines={1}>
            {profile?.displayName ?? "Creator"}
          </Text>
          <Text style={s.profileHandle} numberOfLines={1}>
            @{profile?.username ?? "creator"}
          </Text>
          <View style={s.profileBadgeRow}>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>Creator</Text>
            </View>
            {isVerified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={11} color={tokens.colors.accent} style={{ marginRight: 3 }} />
                <Text style={s.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.editHint}>
          <Text style={s.editHintText}>View profile</Text>
          <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
        </View>
      </AnimatedPressable>

      {/* ── Plan & usage card ─────────────────────────────────────────── */}
      <Card style={isPro ? s.cardPro : undefined}>
        <View style={s.planTopRow}>
          <View style={s.planNameWrap}>
            {isPro && <Ionicons name="sparkles" size={14} color={tokens.colors.accent} style={{ marginRight: 5 }} />}
            <Text style={[s.planName, isPro && s.planNamePro]}>{planLabel}</Text>
          </View>
          {subLoading && <ActivityIndicator size="small" color={tokens.colors.accent} />}
        </View>

        {isPro && proExpiry && (
          <Text style={s.planRenewal}>
            Renews {new Date(proExpiry).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </Text>
        )}

        {trackLimit != null && (
          <View style={s.usageBlock}>
            <View style={s.usageLabelRow}>
              <Text style={s.usageLabel}>Track uploads</Text>
              <Text style={s.usageCount}>{tracksUsed} / {trackLimit}</Text>
            </View>
            <UsageBar used={tracksUsed} limit={trackLimit} />
            {tracksRemaining != null && (
              <Text style={s.usageRemaining}>{tracksRemaining} upload{tracksRemaining !== 1 ? "s" : ""} remaining</Text>
            )}
          </View>
        )}

        {!subLoading && (
          <>
            {isPro ? (
              <AnimatedPressable onPress={() => void presentCustomerCenter()} style={s.manageBtn}>
                <Text style={s.manageBtnLabel}>Manage subscription</Text>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                onPress={() => void presentPaywallIfNeeded()}
                scaleValue={0.96}
                style={s.upgradeBtn}
              >
                <Text style={s.upgradeBtnLabel}>Upgrade to Pro</Text>
              </AnimatedPressable>
            )}
            <Text style={s.restoreLink} onPress={() => void handleRestore()}>
              {isRestoring ? "Restoring…" : "Restore purchases"}
            </Text>
          </>
        )}
      </Card>

      {/* ── Creator access card ───────────────────────────────────────── */}
      <Card>
        <Text style={s.cardTitle}>Creator access</Text>
        <AccessRow label="Catalog selling" unlocked={canSellCatalog} lockedLabel="Pro" />
        <View style={s.divider} />
        <AccessRow label="Advanced analytics" unlocked={hasAdvancedAnalytics} lockedLabel="Pro" unlockedLabel="Enabled" />
        <View style={s.divider} />
        <AccessRow label="Premium analytics" unlocked={hasPremiumAnalytics} lockedLabel="Pro" unlockedLabel="Enabled" />
        <View style={s.divider} />
        <AccessRow label="Multi-upload" unlocked={canMultiUpload} lockedLabel="Pro" unlockedLabel="Enabled" />
      </Card>

      {/* ── Verification card ─────────────────────────────────────────── */}
      {verificationStatus && (
        <AnimatedPressable
          onPress={() => router.push("/account/verification" as never)}
          haptic="selection"
          style={s.card}
        >
          <View style={s.verificationRow}>
            <View>
              <Text style={s.cardTitle}>Verification</Text>
              <Text style={[s.verificationStatus, isVerified && s.verificationStatusVerified]}>
                {isVerified ? "Your creator badge is active." : verificationStatus}
              </Text>
            </View>
            <Ionicons
              name={isVerified ? "checkmark-circle" : "chevron-forward"}
              size={isVerified ? 22 : 16}
              color={isVerified ? tokens.colors.accent : tokens.colors.textSecondary}
            />
          </View>
        </AnimatedPressable>
      )}

      {/* ── App preferences ───────────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>App preferences</Text>
        <Card>
          <View style={s.prefRow}>
            <View style={s.prefCopy}>
              <Text style={s.prefLabel}>Advanced Mode</Text>
              <Text style={s.prefSubtitle}>Show additional developer and diagnostic tools</Text>
            </View>
            <Switch
              value={preferences.advancedModeEnabled}
              onValueChange={handleToggleAdvancedMode}
              trackColor={{ false: "#1E293B", true: tokens.colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>
      </View>


      {/* ── Danger zone ───────────────────────────────────────────────── */}
      <AnimatedPressable
        onPress={handleDeleteAccount}
        disabled={deleting}
        haptic="light"
        style={[s.deleteBtn, deleting && s.deleteBtnDisabled]}
      >
        {deleting
          ? <ActivityIndicator size="small" color={tokens.colors.danger} />
          : <Ionicons name="trash-outline" size={16} color={tokens.colors.danger} />
        }
        <Text style={s.deleteBtnLabel}>{deleting ? "Deleting account…" : "Delete account"}</Text>
      </AnimatedPressable>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 160,
    gap: 10,
  },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.section,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 14,
  },
  profileCopy: { flex: 1, gap: 3 },
  profileName: { color: tokens.colors.textPrimary, fontSize: 16, fontWeight: "800" },
  profileHandle: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  profileBadgeRow: { flexDirection: "row", gap: 6, marginTop: 2, flexWrap: "wrap" },
  roleBadge: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: tokens.radiusSystem.pill, backgroundColor: tokens.colors.accentDim,
  },
  roleBadgeText: { color: tokens.colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: tokens.radiusSystem.pill,
    backgroundColor: "rgba(0,200,180,0.10)",
    borderWidth: 1, borderColor: "rgba(0,200,180,0.25)",
  },
  verifiedBadgeText: { color: tokens.colors.accent, fontSize: 10, fontWeight: "700" },
  editHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  editHintText: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "500" },

  // Card
  card: {
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.section,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  cardPro: {
    borderColor: tokens.colors.accent,
    backgroundColor: "rgba(0,200,180,0.04)",
  },
  cardTitle: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  // Plan
  planTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planNameWrap: { flexDirection: "row", alignItems: "center" },
  planName: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "800" },
  planNamePro: { color: tokens.colors.accent },
  planRenewal: { color: tokens.colors.textSecondary, fontSize: 12, fontWeight: "500", marginTop: -4 },

  // Usage
  usageBlock: { gap: 8 },
  usageLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  usageLabel: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  usageCount: { color: tokens.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  usageRemaining: { color: tokens.colors.textSecondary, fontSize: 12 },

  // CTAs
  upgradeBtn: {
    alignItems: "center", paddingVertical: 13,
    borderRadius: tokens.radiusSystem.pill,
    backgroundColor: tokens.colors.accent,
  },
  upgradeBtnLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },
  manageBtn: {
    alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: tokens.radiusSystem.pill, borderWidth: 1,
    borderColor: tokens.colors.borderAccent, backgroundColor: tokens.colors.accentDim,
  },
  manageBtnLabel: { color: tokens.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  restoreLink: {
    textAlign: "center", color: tokens.colors.textSecondary,
    fontSize: 13, fontWeight: "500", textDecorationLine: "underline", marginTop: -4,
  },

  // Access
  accessRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accessLabel: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "600" },
  accessBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  accessBadgeEnabled: { backgroundColor: "rgba(0,200,180,0.10)", borderColor: "rgba(0,200,180,0.25)" },
  accessBadgeLocked: { backgroundColor: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.25)" },
  accessBadgeText: { fontSize: 11, fontWeight: "700" },
  accessBadgeTextEnabled: { color: tokens.colors.accent },
  accessBadgeTextLocked: { color: "#A78BFA" },

  divider: { height: 1, backgroundColor: tokens.colors.borderSubtle, marginHorizontal: -16 },

  // Verification
  verificationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verificationStatus: { color: tokens.colors.textSecondary, fontSize: 13, marginTop: 4 },
  verificationStatusVerified: { color: tokens.colors.accent },

  // Preferences
  section: { gap: 6 },
  sectionLabel: { color: tokens.colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 2 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  prefCopy: { flex: 1, gap: 2 },
  prefLabel: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "600" },
  prefSubtitle: { color: tokens.colors.textSecondary, fontSize: 12, lineHeight: 17 },

  // Session
  sessionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.section, borderWidth: 1,
    borderColor: tokens.colors.borderSubtle, padding: 14,
  },
  sessionLabel: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "600" },

  // Delete
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: tokens.radiusSystem.control,
    borderWidth: 1, borderColor: "rgba(217,92,92,0.3)", backgroundColor: "rgba(217,92,92,0.06)",
    marginTop: 6,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnLabel: { color: tokens.colors.danger, fontSize: 15, fontWeight: "700" },
});
