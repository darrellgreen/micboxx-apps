import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ensureFreshSession } from "@/features/auth/api";
import { useAuth } from "@/features/auth/provider";
import {
  fetchUserProfile,
  uploadUserAvatar,
  uploadUserCover,
  type DashboardUserProfile,
} from "@/features/account/api";
import { UserProfileView } from "@/features/account/components/UserProfileView";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function ProfileTab() {
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<DashboardUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }

    // Avoid re-fetching if the token hasn't changed.
    if (loadedForToken.current === session.accessToken && profile) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const fresh = await ensureFreshSession(session);
        if (!fresh?.accessToken) throw new Error("Session expired.");
        const data = await fetchUserProfile(fresh.accessToken);
        if (!cancelled) {
          setProfile(data);
          loadedForToken.current = session!.accessToken;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session]);

  const handleUploadAvatar = async (fileUri: string, filename: string) => {
    const fresh = await ensureFreshSession(session);
    if (!fresh?.accessToken) return;
    const updated = await uploadUserAvatar(fresh.accessToken, fileUri, filename);
    setProfile(updated);
  };

  const handleUploadCover = async (fileUri: string, filename: string) => {
    const fresh = await ensureFreshSession(session);
    if (!fresh?.accessToken) return;
    const updated = await uploadUserCover(fresh.accessToken, fileUri, filename);
    setProfile(updated);
  };

  // ── Not signed in ──────────────────────────────────────────────────────────

  if (!session) {
    return (
      <SafeAreaView style={s.safe} edges={["left", "right"]}>
        <ScreenHeader title="Profile" leftIcon="menu" />
        <View style={s.centered}>
          <Ionicons name="person-circle-outline" size={56} color={tokens.colors.textSecondary} />
          <Text style={s.guestTitle}>Sign in to view your profile</Text>
          <Text style={s.guestSubtitle}>
            Manage your music taste, playlists, and activity.
          </Text>
          <AnimatedPressable
            onPress={() => router.push("/sign-in")}
            scaleValue={0.95}
            style={s.signInButton}
          >
            <Text style={s.signInLabel}>Sign in</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading && !profile) {
    return (
      <SafeAreaView style={s.safe} edges={["left", "right"]}>
        <ScreenHeader title="Profile" leftIcon="menu" />
        <View style={s.centered}>
          <ActivityIndicator color={tokens.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error && !profile) {
    return (
      <SafeAreaView style={s.safe} edges={["left", "right"]}>
        <ScreenHeader title="Profile" leftIcon="menu" />
        <View style={s.centered}>
          <Text style={s.errorText}>Unable to load profile. Please try again later.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {profile && session && (
          <UserProfileView
            profile={profile}
            accessToken={session.accessToken}
            coverTopInset={insets.top}
            onUpdateProfile={(updated) => setProfile(updated as DashboardUserProfile)}
            onUploadAvatar={handleUploadAvatar}
            onUploadCover={handleUploadCover}
          />
        )}
      </ScrollView>
      {/* Floating header overlaid on top of cover image */}
      <View style={[s.floatingHeader, { top: insets.top }]}>
        <ScreenHeader title="" leftIcon="menu" />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 0 },
  floatingHeader: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  guestTitle: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center" },
  guestSubtitle: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 280 },
  signInButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
  },
  signInLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },
  errorText: { color: tokens.colors.textSecondary, fontSize: 14, textAlign: "center" },
});
