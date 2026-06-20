import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AnimatedPressable, Screen, useToast } from "@micboxx/ui";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { useAuth } from "@/features/auth/provider";
import { deleteAccount, fetchUserProfile } from "@/features/account/api";
import { tokens } from "@micboxx/theme";

// Cached per user UUID for the lifetime of the app session — avoids
// re-fetching the profile every time this screen is mounted.
const profileCache = new Map<string, { emailVerified: boolean }>();

export default function AccountSecurityScreen() {
  const { session, signOut } = useAuth();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const email = session?.user?.email ?? "—";
  const userUuid = session?.user?.uuid ?? null;

  useEffect(() => {
    const token = session?.accessToken;
    if (!token || !userUuid) return;

    const cached = profileCache.get(userUuid);
    if (cached) {
      setEmailVerified(cached.emailVerified);
      return;
    }

    let cancelled = false;
    fetchUserProfile(token, session)
      .then((profile) => {
        if (cancelled) return;
        profileCache.set(userUuid, { emailVerified: profile.flags.emailVerified });
        setEmailVerified(profile.flags.emailVerified);
      })
      .catch(() => {
        if (!cancelled) setEmailVerified(null);
      });
    return () => { cancelled = true; };
  }, [session?.accessToken, userUuid]);

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete your MicBoxx account and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Once deleted, your account is gone forever.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete my account",
                  style: "destructive",
                  onPress: () => void confirmDelete(),
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function confirmDelete() {
    const token = session?.accessToken;
    if (!token) return;
    setDeleting(true);
    try {
      await deleteAccount(token, session);
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
        <DetailRouteHeader
          title="Account & Security"
          fallbackRoute="/settings"
        />
      }
      contentContainerStyle={s.scroll}
    >
      {/* Account access */}
      <Text style={s.sectionLabel}>Account access</Text>
      <View style={s.section}>
        <View style={s.infoRow}>
          <View style={s.iconWrap}>
            <Ionicons name="mail-outline" size={22} color={tokens.colors.textPrimary} />
          </View>
          <View style={s.infoCopy}>
            <Text style={s.infoLabel}>Email address</Text>
            <Text style={s.infoValue}>{email}</Text>
            {emailVerified === null ? (
              <ActivityIndicator size="small" color={tokens.colors.textSecondary} style={s.verifySpinner} />
            ) : emailVerified ? (
              <View style={s.verifiedRow}>
                <Ionicons name="checkmark-circle" size={13} color={tokens.colors.accent} />
                <Text style={s.verifiedText}>Verified</Text>
              </View>
            ) : (
              <Text style={s.unverifiedText}>Not verified</Text>
            )}
          </View>
        </View>
      </View>

      {/* Account management */}
      <Text style={[s.sectionLabel, s.sectionLabelSpaced]}>Account management</Text>
      <View style={s.section}>
        <AnimatedPressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          haptic="light"
          style={s.deleteRow}
        >
          <View style={s.iconWrap}>
            {deleting ? (
              <ActivityIndicator size="small" color={tokens.colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={tokens.colors.danger} />
            )}
          </View>
          <View style={s.infoCopy}>
            <Text style={[s.infoLabel, s.deleteLabel]}>
              {deleting ? "Deleting account…" : "Delete account"}
            </Text>
            <Text style={s.infoValue}>
              Permanently delete your MicBoxx account and associated data.
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 6,
  },

  sectionLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  sectionLabelSpaced: {
    marginTop: 16,
  },

  section: {},

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },

  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },

  iconWrap: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },

  infoCopy: { flex: 1, gap: 2 },

  infoLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  infoValue: {
    color: tokens.colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },

  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  verifiedText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  unverifiedText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  verifySpinner: {
    alignSelf: "flex-start",
    marginTop: 4,
  },

  deleteLabel: {
    color: tokens.colors.danger,
  },
});
