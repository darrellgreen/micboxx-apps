import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetMyPlaylistsQuery, getMyRoomHistory, getRecentlyPlayedTracks, type RoomHistoryEntry } from "@micboxx/api";
import type { PublicTrackSummary } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, Avatar, Button } from "@micboxx/ui";
import { useFollowedUsers } from "@/features/social/hooks/useFollowedUsers";

import type { DashboardUserProfile } from "../api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PLAYLIST_CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `${value}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserProfileViewProps {
  profile: DashboardUserProfile;
  accessToken: string;
  coverTopInset?: number;
  onUpdateProfile: (data: Partial<DashboardUserProfile>) => void;
  onUploadAvatar: (fileUri: string, filename: string) => Promise<void>;
  onUploadCover: (fileUri: string, filename: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserProfileView({
  profile,
  accessToken,
  coverTopInset = 0,
  onUpdateProfile,
  onUploadAvatar,
  onUploadCover,
}: UserProfileViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName);
  const [editBio, setEditBio] = useState(profile.bio ?? "");
  const [editWebsite, setEditWebsite] = useState(profile.links.website ?? "");
  const [editInstagram, setEditInstagram] = useState(profile.links.instagram ?? "");
  const [editFacebook, setEditFacebook] = useState(profile.links.facebook ?? "");
  const [editTwitter, setEditTwitter] = useState(profile.links.twitter ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: playlistsData, isLoading: playlistsLoading } = useGetMyPlaylistsQuery({ accessToken });
  const { followerCount, followingCount } = useFollowedUsers();
  const [recentTracks, setRecentTracks] = useState<PublicTrackSummary[]>([]);
  const [recentTracksLoading, setRecentTracksLoading] = useState(true);
  const [roomHistory, setRoomHistory] = useState<RoomHistoryEntry[]>([]);
  const [roomHistoryLoading, setRoomHistoryLoading] = useState(true);

  const playlists = playlistsData?.playlists ?? [];

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setRecentTracksLoading(true);
    getRecentlyPlayedTracks(6, accessToken)
      .then((res) => { if (!cancelled) { setRecentTracks(res.tracks); setRecentTracksLoading(false); } })
      .catch(() => { if (!cancelled) setRecentTracksLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    setRoomHistoryLoading(true);
    getMyRoomHistory({ accessToken, limit: 10 })
      .then((res) => { if (!cancelled) { setRoomHistory(res.rooms); setRoomHistoryLoading(false); } })
      .catch(() => { if (!cancelled) setRoomHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const openEditModal = () => {
    setEditDisplayName(profile.displayName);
    setEditBio(profile.bio ?? "");
    setEditWebsite(profile.links.website ?? "");
    setEditInstagram(profile.links.instagram ?? "");
    setEditFacebook(profile.links.facebook ?? "");
    setEditTwitter(profile.links.twitter ?? "");
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert("Validation Error", "Display name cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const { updateUserProfile } = await import("../api");
      const updated = await updateUserProfile(accessToken, {
        displayName: editDisplayName,
        bio: editBio,
        website: editWebsite,
        instagram: editInstagram,
        facebook: editFacebook,
        twitter: editTwitter,
      });
      onUpdateProfile(updated);
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert("Save failed", err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need camera roll access to change your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      await onUploadAvatar(asset.uri, asset.fileName ?? `avatar.jpg`);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need camera roll access to change your cover photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setUploadingCover(true);
    try {
      await onUploadCover(asset.uri, asset.fileName ?? `cover.jpg`);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingCover(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>

      {/* Cover Photo Banner */}
      <View style={[s.coverContainer, { height: 140 + coverTopInset }]}>
        {profile.coverUrl ? (
          <Image source={{ uri: profile.coverUrl }} style={s.coverImage} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={["#79C96B", "#00B3A6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.coverImage}
          />
        )}
        <TouchableOpacity style={[s.coverCameraBtn, { top: 12 + coverTopInset }]} onPress={handlePickCover}>
          {uploadingCover ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.avatarWrap}>
          <Avatar uri={profile.avatarUrl} displayName={profile.displayName} size={88} />
          <TouchableOpacity style={s.cameraBtn} onPress={handlePickAvatar}>
            {uploadingAvatar
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>

        <Button label="Edit Profile" tone="secondary" size="sm" onPress={openEditModal} />
      </View>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <View style={s.identity}>
        <View style={s.listenerBadge}>
          <Ionicons name="sparkles" size={11} color={tokens.colors.accent} />
          <Text style={s.listenerBadgeText}>Listener</Text>
        </View>
        <Text style={s.displayName}>{profile.displayName}</Text>
        <View style={s.handleRow}>
          <Text style={s.handle}>@{profile.username}</Text>
          <Text style={s.handle}> · {formatCompactCount(followerCount)} followers · {formatCompactCount(followingCount)} following</Text>
        </View>
        {profile.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}

        {/* Social links */}
        {(profile.links.website || profile.links.instagram || profile.links.facebook || profile.links.twitter) ? (
          <View style={s.socials}>
            {profile.links.website && (
              <TouchableOpacity
                onPress={() => void Linking.openURL(profile.links.website!)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={s.socialLinkText} numberOfLines={1}>
                  {profile.links.website.replace(/^https?:\/\//, "")}
                </Text>
              </TouchableOpacity>
            )}
            {profile.links.instagram && (
              <TouchableOpacity onPress={() => void Linking.openURL(profile.links.instagram!)}>
                <Text style={s.socialLinkText} numberOfLines={1}>
                  {profile.links.instagram.replace(/^https?:\/\//, "")}
                </Text>
              </TouchableOpacity>
            )}
            {profile.links.facebook && (
              <TouchableOpacity onPress={() => void Linking.openURL(profile.links.facebook!)}>
                <Text style={s.socialLinkText} numberOfLines={1}>
                  {profile.links.facebook.replace(/^https?:\/\//, "")}
                </Text>
              </TouchableOpacity>
            )}
            {profile.links.twitter && (
              <TouchableOpacity onPress={() => void Linking.openURL(profile.links.twitter!)}>
                <Text style={s.socialLinkText} numberOfLines={1}>
                  {profile.links.twitter.replace(/^https?:\/\//, "")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

      </View>

      {/* ── Recently Played ───────────────────────────────────────────────── */}
      <View style={s.section}>
        <SectionHeader title="Recently Played" onSeeAll={() => {}} />
        {recentTracksLoading ? (
          <ActivityIndicator color={tokens.colors.accent} style={{ marginVertical: 20 }} />
        ) : recentTracks.length === 0 ? (
          <EmptyState icon="musical-notes-outline" message="Tracks you listen to will appear here." />
        ) : (
          <View style={s.followedArtistsRow}>
            {recentTracks.map((track) => (
              <View key={track.uuid} style={s.followedArtistItem}>
                <View style={s.followedArtistImgWrap}>
                  {track.artworkUrl ? (
                    <Image source={{ uri: track.artworkUrl }} style={s.followedArtistImg} contentFit="cover" />
                  ) : (
                    <View style={[s.followedArtistImg, s.followedArtistImgPlaceholder]}>
                      <Ionicons name="musical-note" size={20} color={tokens.colors.textMuted} />
                    </View>
                  )}
                </View>
                <Text style={s.followedArtistName} numberOfLines={1}>{track.title}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Playlists ─────────────────────────────────────────────────────── */}
      <View style={s.section}>
        <SectionHeader title="Playlists" onSeeAll={() => router.push("/(tabs)/library" as never)} />
        {playlistsLoading ? (
          <ActivityIndicator color={tokens.colors.accent} style={{ marginVertical: 20 }} />
        ) : playlists.length === 0 ? (
          <EmptyState
            icon="musical-notes-outline"
            message="No playlists yet."
            action={{ label: "Create Playlist", onPress: () => router.push("/playlist/create" as never) }}
          />
        ) : (
          <View style={s.playlistGrid}>
            {playlists.slice(0, 4).map((playlist) => (
              <View key={playlist.id} style={s.playlistCard}>
                <View style={s.playlistArtWrap}>
                  {playlist.artworkUrl ? (
                    <Image source={{ uri: playlist.artworkUrl }} style={s.playlistArt} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={[tokens.colors.brandSecondary, tokens.colors.brandPrimary]}
                      style={s.playlistArt}
                    />
                  )}
                  <View style={s.trackCountBadge}>
                    <Ionicons name="musical-note" size={10} color="rgba(255,255,255,0.85)" />
                    <Text style={s.trackCountText}>{playlist.counts.tracks}</Text>
                  </View>
                </View>
                <Text style={s.playlistTitle} numberOfLines={1}>{playlist.title}</Text>
                <Text style={s.playlistMeta}>{playlist.counts.tracks} tracks</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Room History ──────────────────────────────────────────────────── */}
      <View style={s.section}>
        <SectionHeader title="Room History" onSeeAll={() => {}} />
        {roomHistoryLoading ? (
          <ActivityIndicator color={tokens.colors.accent} style={{ marginVertical: 20 }} />
        ) : roomHistory.length === 0 ? (
          <EmptyState icon="mic-outline" message="Rooms you join will appear here." />
        ) : (
          <View style={s.roomHistoryList}>
            {roomHistory.map((entry, index) => (
              <TouchableOpacity
                key={entry.room_id}
                style={[s.roomHistoryItem, index === roomHistory.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => router.push(`/album/${entry.release_identifier}/room` as never)}
              >
                <View style={s.roomHistoryArtWrap}>
                  {entry.artwork_url ? (
                    <Image source={{ uri: entry.artwork_url }} style={s.roomHistoryArt} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={[tokens.colors.brandSecondary, tokens.colors.brandPrimary]}
                      style={s.roomHistoryArt}
                    />
                  )}
                </View>
                <View style={s.roomHistoryInfo}>
                  <Text style={s.roomHistoryTitle} numberOfLines={1}>{entry.release_title}</Text>
                  <Text style={s.roomHistoryMeta}>
                    Joined {new Date(entry.joined_at * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Edit Profile Modal ────────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={editModalVisible}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <AnimatedPressable onPress={() => setEditModalVisible(false)} style={s.closeBtn}>
                <Ionicons name="close" size={24} color={tokens.colors.textPrimary} />
              </AnimatedPressable>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll}>
              <ModalField label="Display Name" value={editDisplayName} onChangeText={setEditDisplayName} placeholder="Your public name" maxLength={120} />
              <ModalField label="Bio" value={editBio} onChangeText={setEditBio} placeholder="Tell others about your sound preferences..." multiline maxLength={600} />
              <ModalField label="Website" value={editWebsite} onChangeText={setEditWebsite} placeholder="https://yourwebsite.com" autoCapitalize="none" />
              <ModalField label="Instagram" value={editInstagram} onChangeText={setEditInstagram} placeholder="instagram.com/handle" autoCapitalize="none" />
              <ModalField label="Facebook" value={editFacebook} onChangeText={setEditFacebook} placeholder="facebook.com/handle" autoCapitalize="none" />
              <ModalField label="Twitter / X" value={editTwitter} onChangeText={setEditTwitter} placeholder="x.com/handle" autoCapitalize="none" />
              <View style={{ marginTop: 10 }}>
                <Button label={isSaving ? "Saving…" : "Save Profile"} tone="primary" fullWidth onPress={handleSaveProfile} disabled={isSaving} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({
  icon,
  message,
  action,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.emptyState}>
      <Ionicons name={icon} size={28} color={tokens.colors.textSecondary} style={{ opacity: 0.5 }} />
      <Text style={s.emptyStateText}>{message}</Text>
      {action && (
        <TouchableOpacity style={s.emptyStateAction} onPress={action.onPress}>
          <Text style={s.emptyStateActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={s.seeAll}>See all</Text>
      </TouchableOpacity>
    </View>
  );
}

function ModalField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textMuted}
        style={[s.textInput, multiline && s.textArea]}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 0 },

  // Cover Image
  coverContainer: {
    position: "relative",
    height: 140,
    marginHorizontal: -20, // bleed out to edge of scroll content padding
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverCameraBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end", // align items to bottom to align edit button and avatar
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: 16,
  },
  avatarWrap: {
    position: "relative",
    width: 92,
    height: 92,
    marginTop: -46, // overlap half of avatar on top of cover image
    borderRadius: 46,
    borderWidth: 3,
    borderColor: tokens.colors.bgApp, // match background app theme
    backgroundColor: tokens.colors.bgApp,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Identity
  identity: { gap: 4, paddingBottom: 8 },
  listenerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    marginBottom: 6,
  },
  listenerBadgeText: { color: tokens.colors.accent, fontSize: 12, fontWeight: "800" },
  displayName: { color: tokens.colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, lineHeight: 30 },
  handleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2 },
  handle: { color: tokens.colors.textSecondary, fontSize: 14 },
  bio: { color: tokens.colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  socials: { gap: 4, marginTop: 12 },
  socialLinkText: { color: tokens.colors.accent, fontSize: 13, fontWeight: "500" },


  // Sections
  section: { marginTop: 24, gap: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: tokens.colors.textPrimary, fontSize: 17, fontWeight: "800" },
  seeAll: { color: tokens.colors.accent, fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyStateText: { color: tokens.colors.textSecondary, fontSize: 13, textAlign: "center" },
  emptyStateAction: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
  },
  emptyStateActionText: { color: tokens.colors.accent, fontSize: 13, fontWeight: "700" },

  // Recently played tracks grid
  followedArtistsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  followedArtistItem: { alignItems: "center", width: (SCREEN_WIDTH - 32 - 14 * 5) / 6, minWidth: 48 },
  followedArtistImgWrap: { width: "100%", aspectRatio: 1, borderRadius: tokens.radii.sm, overflow: "hidden" },
  followedArtistImg: { width: "100%", height: "100%" },
  followedArtistImgPlaceholder: { backgroundColor: tokens.colors.bgElevated, alignItems: "center", justifyContent: "center" },
  followedArtistName: { color: tokens.colors.textSecondary, fontSize: 10, textAlign: "center", marginTop: 4 },

  // Room history
  roomHistoryList: { gap: 0 },
  roomHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  roomHistoryArtWrap: {
    width: 52,
    height: 52,
    borderRadius: tokens.radii.sm,
    overflow: "hidden",
    flexShrink: 0,
  },
  roomHistoryArt: { width: "100%", height: "100%" },
  roomHistoryInfo: { flex: 1, gap: 3 },
  roomHistoryTitle: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  roomHistoryMeta: { color: tokens.colors.textSecondary, fontSize: 12 },

  // Playlists grid
  playlistGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  playlistCard: { width: PLAYLIST_CARD_WIDTH, gap: 6 },
  playlistArtWrap: { width: "100%", aspectRatio: 1, borderRadius: tokens.radii.md, overflow: "hidden", position: "relative" },
  playlistArt: { width: "100%", height: "100%" },
  trackCountBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  trackCountText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" },
  playlistTitle: { color: tokens.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  playlistMeta: { color: tokens.colors.textSecondary, fontSize: 11 },

  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: tokens.colors.bgSurface,
    borderTopLeftRadius: tokens.radii.xl,
    borderTopRightRadius: tokens.radii.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  modalTitle: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 4 },
  modalScroll: { padding: 20, gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  textInput: {
    backgroundColor: tokens.colors.bgInput,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: tokens.colors.textPrimary,
    fontSize: 14,
  },
  textArea: { height: 100, textAlignVertical: "top" },
});
