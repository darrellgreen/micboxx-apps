/**
 * Public artist profile screen
 *
 * Mobile equivalent of the web artist page — shows the creator's public
 * appearance (cover, avatar, name, bio, links, counts) without tracks or
 * music sections. An "Edit profile" button routes to the edit form.
 * Tapping the cover or avatar opens the image picker to replace them inline.
 */

import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable, Avatar } from "@micboxx/ui";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { replaceUserAvatar, replaceUserCover } from "@/shared/api/creator-dashboard";
import { useGetArtistPageQuery } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

const COVER_HEIGHT = 220;

// ─── Social link row ──────────────────────────────────────────────────────────

function SocialLink({
  icon,
  label,
  url,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  url: string;
}) {
  return (
    <AnimatedPressable
      onPress={() => void Linking.openURL(url)}
      haptic="selection"
      style={sl.row}
    >
      <Ionicons name={icon} size={16} color={tokens.colors.accent} />
      <Text style={sl.label} numberOfLines={1}>{label}</Text>
      <Ionicons name="open-outline" size={13} color={tokens.colors.textSecondary} />
    </AnimatedPressable>
  );
}
const sl = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: tokens.colors.borderSubtle,
  },
  label: { flex: 1, color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "500" },
});

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number; label: string }) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
  return (
    <View style={stat.wrap}>
      <Text style={stat.value}>{display}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}
const stat = StyleSheet.create({
  wrap: { alignItems: "center", gap: 2, flex: 1 },
  value: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "800" },
  label: { color: tokens.colors.textSecondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const bootstrap = useCreatorBootstrap();
  const profile = bootstrap.profile;
  const username = profile?.username ?? "";

  const { data: artistPage } = useGetArtistPageQuery(username, { skip: !username });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasCover = !!profile?.coverUrl;
  const isVerified = profile?.flags.verifiedBadge ?? false;
  const counts = artistPage?.artist.counts ?? { followers: 0, following: 0, tracks: 0, albums: 0 };

  const socialLinks = [
    profile?.links.website
      ? { icon: "globe-outline" as const, label: profile.links.website.replace(/^https?:\/\//, ""), url: profile.links.website }
      : null,
    profile?.links.instagram
      ? { icon: "logo-instagram" as const, label: `@${profile.links.instagram.replace(/^@/, "")}`, url: `https://instagram.com/${profile.links.instagram.replace(/^@/, "")}` }
      : null,
    profile?.links.twitter
      ? { icon: "logo-twitter" as const, label: `@${profile.links.twitter.replace(/^@/, "")}`, url: `https://x.com/${profile.links.twitter.replace(/^@/, "")}` }
      : null,
    profile?.links.facebook
      ? { icon: "logo-facebook" as const, label: profile.links.facebook, url: profile.links.facebook }
      : null,
  ].filter((l): l is NonNullable<typeof l> => l !== null);

  async function handlePickImage(kind: "avatar" | "cover") {
    setUploadError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: kind === "cover" ? [16, 7] : [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append(kind, {
      uri: asset.uri,
      name: asset.fileName ?? `${kind}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as never);

    try {
      if (kind === "avatar") {
        setUploadingAvatar(true);
        await replaceUserAvatar(formData);
      } else {
        setUploadingCover(true);
        await replaceUserCover(formData);
      }
      await bootstrap.refreshProfile();
    } catch {
      setUploadError(`Failed to update ${kind === "avatar" ? "profile photo" : "cover image"}. Please try again.`);
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScreenHeader
        title="Profile"
        subtitle="Your public artist page"
        showBackButton
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Cover hero ──────────────────────────────────────────── */}
        <AnimatedPressable
          style={s.heroWrap}
          onPress={() => void handlePickImage("cover")}
          haptic="light"
        >
          {hasCover ? (
            <Image
              source={{ uri: profile.coverUrl! }}
              style={s.cover}
              contentFit="cover"
            />
          ) : (
            <View style={[s.cover, s.coverFallback]} />
          )}
          <View style={s.gradient} pointerEvents="none" />

          {/* Camera overlay on cover */}
          <View style={s.coverCameraBtn}>
            {uploadingCover ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={18} color="#fff" />
            )}
          </View>

          {/* Avatar anchored to bottom-left of hero */}
          <View style={s.avatarAnchor}>
            <AnimatedPressable
              style={[s.avatarRing, hasCover && s.avatarRingOnCover]}
              onPress={(e) => {
                e.stopPropagation?.();
                void handlePickImage("avatar");
              }}
              haptic="light"
            >
              {uploadingAvatar ? (
                <View style={s.avatarLoadingWrap}>
                  <ActivityIndicator size="small" color={tokens.colors.accent} />
                </View>
              ) : (
                <Avatar
                  uri={profile?.avatarUrl}
                  displayName={profile?.displayName ?? ""}
                  size={88}
                />
              )}
              {/* Camera badge on avatar */}
              <View style={s.avatarCameraBtn}>
                <Ionicons name="camera" size={11} color="#fff" />
              </View>
            </AnimatedPressable>
          </View>
        </AnimatedPressable>

        {/* ── Upload error ─────────────────────────────────────────── */}
        {uploadError ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color={tokens.colors.danger} />
            <Text style={s.errorText}>{uploadError}</Text>
          </View>
        ) : null}

        {/* ── Identity ────────────────────────────────────────────── */}
        <View style={s.identity}>
          <View style={s.nameRow}>
            <Text style={s.displayName} numberOfLines={1}>
              {profile?.displayName ?? "Creator"}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={tokens.colors.accent} />
            )}
          </View>
          <Text style={s.handle}>@{username}</Text>
        </View>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatPill value={counts.followers ?? 0} label="Followers" />
          <View style={s.statDivider} />
          <StatPill value={counts.following ?? 0} label="Following" />
          <View style={s.statDivider} />
          <StatPill value={counts.tracks ?? 0} label="Tracks" />
          <View style={s.statDivider} />
          <StatPill value={counts.albums ?? 0} label="Albums" />
        </View>

        {/* ── Bio ─────────────────────────────────────────────────── */}
        {profile?.bio ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>About</Text>
            <Text style={s.bio}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Social links ────────────────────────────────────────── */}
        {socialLinks.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Links</Text>
            <View style={s.linksCard}>
              {socialLinks.map((link, i) => (
                <View
                  key={link.url}
                  style={i === socialLinks.length - 1 ? s.lastLink : undefined}
                >
                  <SocialLink icon={link.icon} label={link.label} url={link.url} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Edit nudge ──────────────────────────────────────────── */}
        <AnimatedPressable
          onPress={() => router.push("/account/profile-edit" as never)}
          haptic="selection"
          style={s.editNudge}
        >
          <Ionicons name="pencil-outline" size={16} color={tokens.colors.textSecondary} />
          <Text style={s.editNudgeLabel}>Edit your profile information</Text>
          <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
        </AnimatedPressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  scroll: { paddingBottom: 60 },

  // Hero
  heroWrap: { height: COVER_HEIGHT, position: "relative" },
  cover: { width: "100%", height: "100%" },
  coverFallback: { backgroundColor: tokens.colors.bgElevated },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  // Cover camera button (top-right of cover)
  coverCameraBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // Avatar
  avatarAnchor: { position: "absolute", bottom: -44, left: 20 },
  avatarRing: {
    borderRadius: 50, borderWidth: 3,
    borderColor: tokens.colors.bgApp,
    backgroundColor: tokens.colors.bgApp,
    position: "relative",
  },
  avatarRingOnCover: { borderColor: "rgba(255,255,255,0.15)" },
  avatarLoadingWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },

  // Avatar camera badge (bottom-right of avatar)
  avatarCameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: tokens.colors.bgApp,
  },

  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(220,38,38,0.12)",
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.25)",
  },
  errorText: { flex: 1, color: tokens.colors.danger, fontSize: 13, lineHeight: 18 },

  // Identity
  identity: { marginTop: 52, paddingHorizontal: 20, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  displayName: {
    color: tokens.colors.textPrimary, fontSize: 26,
    fontWeight: "800", letterSpacing: -0.5, flexShrink: 1,
  },
  handle: { color: tokens.colors.textSecondary, fontSize: 15, fontWeight: "500" },

  // Stats
  statsRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1, borderColor: tokens.colors.borderSubtle,
    paddingVertical: 14,
  },
  statDivider: { width: 1, height: 28, backgroundColor: tokens.colors.borderSubtle },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 20, gap: 10 },
  sectionLabel: {
    color: tokens.colors.textSecondary, fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  bio: { color: tokens.colors.textPrimary, fontSize: 15, lineHeight: 23 },

  // Links
  linksCard: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1, borderColor: tokens.colors.borderSubtle,
    overflow: "hidden",
  },
  lastLink: { borderBottomWidth: 0 },

  // Edit nudge
  editNudge: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginTop: 28,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1, borderColor: tokens.colors.borderSubtle,
  },
  editNudgeLabel: { flex: 1, color: tokens.colors.textSecondary, fontSize: 14, fontWeight: "500" },
});
