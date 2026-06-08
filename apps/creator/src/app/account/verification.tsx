import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable, AppHeader } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { requestArtistVerification } from "@/shared/api/creator-dashboard";
import { getPublicProfileUrl } from "@/shared/api/external-links";
import { tokens } from "@micboxx/theme";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return <View style={[s.card, accent && s.cardAccent]}>{children}</View>;
}

function Divider() {
  return <View style={s.divider} />;
}

function StatusRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <View style={s.statusRow}>
      <Text style={s.statusLabel}>{label}</Text>
      <Text style={[s.statusValue, positive && s.statusValuePositive]}>{value}</Text>
    </View>
  );
}

function CtaButton({
  label,
  onPress,
  accent,
  loading,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={[s.cta, accent && s.ctaAccent]} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color={accent ? "#fff" : tokens.colors.textPrimary} />
      ) : (
        <Text style={[s.ctaLabel, accent && s.ctaLabelAccent]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={s.checklistItem}>
      <Ionicons
        name={done ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={done ? tokens.colors.accent : tokens.colors.textSecondary}
      />
      <Text style={[s.checklistLabel, done && s.checklistLabelDone]}>{label}</Text>
    </View>
  );
}

// ─── Badge visual ─────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <View style={s.badgeWrap}>
      <View style={s.badgeGlow} />
      <View style={s.badgeCircle}>
        <Ionicons name="checkmark" size={36} color="#fff" />
      </View>
    </View>
  );
}

function PendingBadge() {
  return (
    <View style={s.badgeWrap}>
      <View style={s.badgeCirclePending}>
        <Ionicons name="time-outline" size={34} color={tokens.colors.accent} />
      </View>
    </View>
  );
}

function UnverifiedBadge({ eligible }: { eligible: boolean }) {
  return (
    <View style={s.badgeWrap}>
      <View style={[s.badgeCircle, s.badgeCircleSubtle]}>
        <Ionicons
          name={eligible ? "shield-outline" : "shield-half-outline"}
          size={32}
          color={eligible ? tokens.colors.accent : tokens.colors.textSecondary}
        />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VerificationScreen() {
  const bootstrap = useCreatorBootstrap();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const verification = bootstrap.profile?.verification;
  const status = verification?.status ?? "unknown";
  const eligible = Boolean(verification?.eligible);
  const canRequest = Boolean(verification?.canRequest);

  const isVerified = status === "verified";
  const isPending = status === "pending";

  const username = bootstrap.profile?.username ?? null;
  const publicProfileUrl = username ? getPublicProfileUrl(username) : null;

  function openPublicProfile() {
    if (publicProfileUrl) {
      void Linking.openURL(publicProfileUrl);
    } else {
      router.push("/(tabs)/dashboard" as never);
    }
  }

  // Checklist derived from bootstrap
  const hasProfile = Boolean(bootstrap.profile?.displayName);
  const hasMedia = Boolean(bootstrap.profile?.avatarUrl);
  const hasRelease = Boolean(bootstrap.catalogReadiness?.hasTracks || bootstrap.catalogReadiness?.hasAlbums);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      await requestArtistVerification();
      await bootstrap.refetch();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Verification request failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Verified ─────────────────────────────────────────────────────────────
  if (isVerified) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader variant="detail" title="Verification" fallbackRoute="/(tabs)/dashboard" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Badge hero */}
          <Card accent>
            <VerifiedBadge />
            <Text style={s.heroTitle}>Verified Creator</Text>
            <Text style={s.heroBody}>
              Your MicBoxx creator badge is active and visible to fans.
            </Text>
          </Card>

          {/* Badge visibility */}
          <Card>
            <Text style={s.cardTitle}>Where your badge appears</Text>
            <Divider />
            <StatusRow label="Profile" value="Active" positive />
            <Divider />
            <StatusRow label="Rooms" value="Active" positive />
            <Divider />
            <StatusRow label="Releases" value="Active" positive />
            <Divider />
            <StatusRow label="Fan-facing pages" value="Active" positive />
          </Card>

          {/* Account status */}
          <Card>
            <Text style={s.cardTitle}>Account status</Text>
            <Divider />
            <StatusRow label="Status" value="Verified" positive />
            <Divider />
            <StatusRow label="Badge" value="Active" positive />
          </Card>

          <CtaButton
            label="View public profile"
            onPress={openPublicProfile}
          />

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader variant="detail" title="Verification" fallbackRoute="/(tabs)/dashboard" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <Card accent>
            <PendingBadge />
            <Text style={s.heroTitle}>Verification in review</Text>
            <Text style={s.heroBody}>
              We're reviewing your creator badge request. You'll be notified when your status changes.
            </Text>
          </Card>

          <Card>
            <Text style={s.cardTitle}>Account status</Text>
            <Divider />
            <StatusRow label="Status" value="In review" />
            <Divider />
            <StatusRow label="Badge" value="Pending" />
          </Card>

          <CtaButton
            label="View profile"
            onPress={openPublicProfile}
          />

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Eligible, can request ────────────────────────────────────────────────
  if (eligible && canRequest) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <AppHeader variant="detail" title="Verification" fallbackRoute="/(tabs)/dashboard" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <Card accent>
            <UnverifiedBadge eligible />
            <Text style={s.heroTitle}>Request verification</Text>
            <Text style={s.heroBody}>
              Confirm your creator identity and apply for a MicBoxx verified badge.
            </Text>
          </Card>

          {/* Requirements */}
          <Card>
            <Text style={s.cardTitle}>Before you apply</Text>
            <Divider />
            <View style={s.checklist}>
              <ChecklistItem label="Complete your creator profile" done={hasProfile} />
              <ChecklistItem label="Add profile media" done={hasMedia} />
              <ChecklistItem label="Publish at least one track or release" done={hasRelease} />
            </View>
          </Card>

          {error ? (
            <Text style={s.errorText}>{error}</Text>
          ) : null}

          <CtaButton
            label={submitting ? "Submitting…" : "Request verification"}
            accent
            loading={submitting}
            onPress={() => void handleRequest()}
          />

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Not eligible yet ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <AppHeader variant="detail" title="Verification" fallbackRoute="/(tabs)/dashboard" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Card>
          <UnverifiedBadge eligible={false} />
          <Text style={s.heroTitle}>Build your creator profile first</Text>
          <Text style={s.heroBody}>
            Complete a few more steps before requesting your verified badge.
          </Text>
        </Card>

        {/* Checklist */}
        <Card>
          <Text style={s.cardTitle}>Complete these steps</Text>
          <Divider />
          <View style={s.checklist}>
            <ChecklistItem label="Complete your creator profile" done={hasProfile} />
            <ChecklistItem label="Add profile media" done={hasMedia} />
            <ChecklistItem label="Publish at least one track or release" done={hasRelease} />
          </View>
        </Card>

        {verification?.reason ? (
          <Card>
            <Text style={s.bodyText}>{verification.reason}</Text>
          </Card>
        ) : null}

        <CtaButton
          label="Finish profile"
          accent
          onPress={() => router.push("/account/profile-edit" as never)}
        />

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

  // Badge
  badgeWrap: { alignItems: "center", paddingVertical: 8 },
  badgeGlow: {
    position: "absolute",
    top: 0,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: tokens.colors.accent,
    opacity: 0.15,
  },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCirclePending: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.colors.accentDim,
    borderWidth: 2,
    borderColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCircleSubtle: {
    backgroundColor: tokens.colors.accentDim,
  },

  // Hero
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  heroBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  // Status rows
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "600" },
  statusValue: { color: tokens.colors.textSecondary, fontSize: 14, fontWeight: "600" },
  statusValuePositive: { color: tokens.colors.accent },

  // Checklist
  checklist: { gap: 12 },
  checklistItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  checklistLabel: { color: tokens.colors.textSecondary, fontSize: 14, fontWeight: "600" },
  checklistLabelDone: { color: tokens.colors.textPrimary },

  // CTA
  cta: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
  },
  ctaAccent: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  ctaLabel: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  ctaLabelAccent: { color: "#fff" },

  // Body / error
  bodyText: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 21 },
  errorText: { color: "#F87171", fontSize: 13, fontWeight: "600", textAlign: "center" },
});
