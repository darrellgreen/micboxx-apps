import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { tokens } from "@micboxx/theme";
import { Screen, AnimatedPressable, BottomActionSheet, useToast } from "@micboxx/ui";
import { useMediaPicker, type MediaAsset } from "@micboxx/media";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import type {
  DashboardAlbumSummary,
  DashboardTrack,
  DashboardUploadOptions,
  TrackMetadataUpdate,
} from "@/contracts/creator";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import {
  FORM_SELECTOR_BACKGROUND,
  FORM_SELECTOR_BORDER_COLOR,
} from "@/shared/ui/selector-row";
import {
  getTrackStatus,
  getUploadOptions,
  updateTrackMetadata,
  publishTrack,
  unpublishTrack,
  requeueTrack,
  deleteTrack,
  getMyAlbums,
  replaceTrackArtwork,
} from "@/shared/api/creator-dashboard";

function buildArtworkFormData(asset: MediaAsset): FormData {
  const formData = new FormData();
  formData.append("artwork", {
    uri: asset.uri,
    name: asset.fileName ?? "track-artwork.jpg",
    type: asset.mimeType ?? "image/jpeg",
  } as any);
  return formData;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "May 22, 2025";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "May 22, 2025";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "May 22, 2025";
  }
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function EditTrackScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const { showToast } = useToast();
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [options, setOptions] = useState<DashboardUploadOptions | null>(null);
  const [albumSummaries, setAlbumSummaries] = useState<DashboardAlbumSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenreId, setSelectedGenreId] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [selectedAlbumTitle, setSelectedAlbumTitle] = useState("MicBoxx Singles");
  
  const [albumSheetVisible, setAlbumSheetVisible] = useState(false);
  const [genreSheetVisible, setGenreSheetVisible] = useState(false);
  const [publishSheetVisible, setPublishSheetVisible] = useState(false);
  const [overflowSheetVisible, setOverflowSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [artworkDirty, setArtworkDirty] = useState(false);
  const selectedGenre = useMemo(
    () => options?.genres.find((genre) => String(genre.id) === selectedGenreId) ?? null,
    [options?.genres, selectedGenreId],
  );
  const albumSummaryById = useMemo(
    () => new Map(albumSummaries.map((album) => [String(album.id), album])),
    [albumSummaries],
  );
  const selectedAlbumSummary = selectedAlbumId ? albumSummaryById.get(selectedAlbumId) ?? null : null;
  const selectedAlbumArtworkUrl = selectedAlbumSummary?.artworkUrl ?? track?.assets?.artworkUrl ?? null;
  const selectedGenreName = selectedGenre?.name ?? track?.genre?.name ?? "Select genre";

  useEffect(() => {
    let active = true;

    async function load() {
      if (!trackId) return;
      try {
        const [nextTrack, nextOptions] = await Promise.all([
          getTrackStatus(trackId),
          getUploadOptions(),
        ]);

        if (!active) return;
        setTrack(nextTrack);
        setOptions(nextOptions);
        setTitle(nextTrack.title);
        setDescription(nextTrack.description ?? "");
        setSelectedAlbumId(nextTrack.album?.id ? String(nextTrack.album.id) : "");
        setSelectedAlbumTitle(nextTrack.album?.title || "MicBoxx Singles");
        setSelectedGenreId(nextTrack.genre?.id ? String(nextTrack.genre.id) : "");
      } catch (nextError) {
        if (!active) return;
        showToast({
          tone: "error",
          title: "Loading Failed",
          message: nextError instanceof Error ? nextError.message : "Unable to load edit form.",
        });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [trackId, showToast]);

  useEffect(() => {
    let active = true;

    async function loadAlbumSummaries() {
      try {
        const response = await getMyAlbums(1, 50);
        if (active) {
          setAlbumSummaries(response.albums);
        }
      } catch {
        if (active) {
          setAlbumSummaries([]);
        }
      }
    }

    void loadAlbumSummaries();
    return () => {
      active = false;
    };
  }, []);

  async function pickArtwork() {
    const picked = await artworkPicker.pickImage({ allowsEditing: true, quality: 0.92 });
    if (picked) {
      setArtworkDirty(true);
    }
  }

  async function handleSave() {
    if (!trackId) return;
    setSaving(true);
    try {
      const payload: TrackMetadataUpdate = {
        title: title.trim(),
        description: description.trim(),
        genreId: selectedGenreId ? Number(selectedGenreId) : null,
        albumId: selectedAlbumId ? Number(selectedAlbumId) : null,
      };

      let nextTrack = await updateTrackMetadata(trackId, payload);

      // Upload artwork if user picked a new image
      if (artworkPicker.asset && artworkDirty) {
        nextTrack = await replaceTrackArtwork(
          trackId,
          buildArtworkFormData(artworkPicker.asset),
        );
        setArtworkDirty(false);
      }

      setTrack(nextTrack);
      showToast({
        title: "Track changes saved",
        message: "Your track is up to date.",
        tone: "success",
      });
      router.back();
    } catch (nextError) {
      showToast({
        tone: "error",
        title: "Save Failed",
        message: nextError instanceof Error ? nextError.message : "Track could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(action: "requeue" | "unpublish") {
    if (!trackId) return;
    setSaving(true);
    try {
      const nextTrack = action === "requeue"
        ? await requeueTrack(trackId)
        : await unpublishTrack(trackId);
      setTrack(nextTrack);
      showToast({
        tone: action === "requeue" ? "success" : "info",
        title: action === "requeue" ? "Requeued for Processing" : "Track Draft Saved",
        message: action === "requeue" ? "Track processing restarted." : "Track reverted to draft.",
      });
    } catch (err) {
      showToast({
        tone: "error",
        title: "Action Failed",
        message: err instanceof Error ? err.message : "Action failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!trackId) return;
    Alert.alert(
      "Delete Track",
      "Are you sure you want to permanently delete this track?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrack(trackId);
              showToast({
                tone: "success",
                title: "Track Deleted",
                message: "Track was permanently removed.",
              });
              router.replace("/(tabs)/catalog");
            } catch (err) {
              showToast({
                tone: "error",
                title: "Delete Failed",
                message: err instanceof Error ? err.message : "Unable to delete track.",
              });
            }
          }
        }
      ]
    );
  }

  const renderCustomHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <AnimatedPressable
          style={styles.circularBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/catalog");
            }
          }}
          haptic="selection"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </AnimatedPressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Edit Track</Text>
          <Text style={styles.headerSubtitle}>Update your track details</Text>
        </View>

        <View style={styles.headerRight}>
          <AnimatedPressable style={styles.circularBtn} onPress={() => {}} haptic="selection">
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <View style={styles.badgeWrap} pointerEvents="none">
              <View style={styles.redBadge}>
                <Text style={styles.badgeTextVal}>2</Text>
              </View>
            </View>
          </AnimatedPressable>

          <AnimatedPressable style={styles.circularBtn} onPress={() => setOverflowSheetVisible(true)} haptic="selection">
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  const albumSheetItems = (options?.albums && options.albums.length > 0)
    ? options.albums.map((album) => ({
        key: String(album.id),
        label: album.title,
        imageUrl: albumSummaryById.get(String(album.id))?.artworkUrl ?? null,
        icon: "albums-outline" as const,
        onPress: () => {
          setSelectedAlbumId(String(album.id));
          setSelectedAlbumTitle(album.title);
        },
      }))
    : [
        {
          key: "default-singles",
          label: "MicBoxx Singles",
          icon: "albums-outline" as const,
          onPress: () => {
            setSelectedAlbumId("");
            setSelectedAlbumTitle("MicBoxx Singles");
          },
        },
      ];
  const genreSheetItems = (options?.genres ?? []).map((genre) => ({
    key: String(genre.id),
    label: genre.name,
    icon: "musical-notes-outline" as const,
    onPress: () => setSelectedGenreId(String(genre.id)),
  }));

  const publishSheetItems = [
    {
      key: "publish",
      label: "Publish Track",
      onPress: () => void handleAction("requeue"), // Fallback or route appropriately
    },
    {
      key: "unpublish",
      label: "Unpublish Track",
      onPress: () => void handleAction("unpublish"),
    },
  ];

  const trackAlbumId = track?.album?.id;
  const overflowSheetItems = [
    ...(trackAlbumId ? [{
      key: "view-release",
      label: "View Release",
      icon: "albums-outline" as const,
      onPress: () => {
        setOverflowSheetVisible(false);
        router.push(`/catalog/albums/${trackAlbumId}` as never);
      },
    }] : []),
    ...(track?.permissions.canDelete ? [{
      key: "delete",
      label: "Delete Track",
      icon: "trash-outline" as const,
      tone: "destructive" as const,
      onPress: () => {
        setOverflowSheetVisible(false);
        handleDelete();
      },
    }] : []),
  ];

  return (
    <Screen
      header={renderCustomHeader()}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <AnimatedPressable style={styles.artworkWrapper} onPress={() => void pickArtwork()} haptic="selection">
            {artworkPicker.asset?.uri ? (
              <Image
                source={{ uri: artworkPicker.asset.uri }}
                style={styles.heroArtwork}
                contentFit="cover"
              />
            ) : track?.assets?.artworkUrl ? (
              <Image
                source={{ uri: track.assets.artworkUrl }}
                style={styles.heroArtwork}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.heroArtwork, styles.artworkPlaceholder]}>
                <Ionicons name="musical-note" size={32} color={tokens.colors.textSecondary} />
              </View>
            )}
            <View style={styles.editArtworkOverlay} pointerEvents="none">
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </View>
          </AnimatedPressable>

          <View style={styles.heroInfo}>
            <View style={styles.publishedBadge}>
              <Text style={styles.publishedBadgeText}>PUBLISHED</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {title || track?.title || "Lover Lover"}
            </Text>
            <Text style={styles.heroSubtitleText} numberOfLines={1}>
              {selectedAlbumTitle || track?.album?.title || "MicBoxx Singles"}
            </Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="musical-note-outline" size={12} color={tokens.colors.textSecondary} />
              <Text style={styles.heroMetaText} numberOfLines={1}>
                {selectedGenreName}  •  {track?.duration ? formatDuration(track.duration) : "3:49"}  •  {track?.timestamps?.createdAt ? formatDate(track.timestamps.createdAt) : "May 22, 2025"}
              </Text>
            </View>
          </View>
        </View>


      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>TRACK INFORMATION</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Title</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder="Title"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.charCount}>{`${title.length}/100`}</Text>
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={[styles.inputContainer, styles.multilineContainer]}>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            placeholder="Description"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.multilineCharCount}>{`${description.length}/1000`}</Text>
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Genre</Text>
        <AnimatedPressable
          style={styles.selectorCard}
          onPress={() => setGenreSheetVisible(true)}
          haptic="selection"
        >
          <View style={styles.selectorLeft}>
            <Ionicons
              name="musical-notes-outline"
              size={21}
              color={selectedGenre ? tokens.colors.textPrimary : tokens.colors.textSecondary}
            />
            <Text style={[styles.selectorValue, !selectedGenre && styles.selectorPlaceholder]} numberOfLines={1}>
              {selectedGenreName}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Album</Text>
        <AnimatedPressable
          style={styles.selectorCard}
          onPress={() => setAlbumSheetVisible(true)}
          haptic="selection"
        >
          <View style={styles.selectorLeft}>
            {selectedAlbumArtworkUrl ? (
              <Image
                source={{ uri: selectedAlbumArtworkUrl }}
                style={styles.selectorThumb}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.selectorThumb, styles.selectorThumbPlaceholder]}>
                <Ionicons name="albums-outline" size={15} color={tokens.colors.textSecondary} />
              </View>
            )}
            <Text style={styles.selectorValue} numberOfLines={1}>
              {selectedAlbumTitle || "MicBoxx Singles"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <Text style={styles.sectionLabel}>PUBLISHING</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Status</Text>
        <AnimatedPressable
          style={styles.selectorCard}
          onPress={() => setPublishSheetVisible(true)}
          haptic="selection"
        >
          <View style={styles.selectorLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.selectorValue}>
              {track ? capitalize(resolveTrackReleaseState(track.status)) : "Published"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <AnimatedPressable
        style={[styles.saveChangesBtn, saving && styles.saveChangesBtnDisabled]}
        onPress={() => void handleSave()}
        disabled={saving}
        haptic="selection"
      >
        <Text style={styles.saveChangesBtnText}>
          {saving ? "Saving Changes..." : "Save Changes"}
        </Text>
      </AnimatedPressable>

      <BottomActionSheet
        visible={albumSheetVisible}
        title="Select Target Album"
        items={albumSheetItems}
        onClose={() => setAlbumSheetVisible(false)}
      />

      <BottomActionSheet
        visible={genreSheetVisible}
        title="Select Genre"
        items={genreSheetItems}
        onClose={() => setGenreSheetVisible(false)}
      />

      <BottomActionSheet
        visible={publishSheetVisible}
        title="Update Status"
        items={publishSheetItems}
        onClose={() => setPublishSheetVisible(false)}
      />

      <BottomActionSheet
        visible={overflowSheetVisible}
        title="Track Options"
        items={overflowSheetItems}
        onClose={() => setOverflowSheetVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 20,
    backgroundColor: "#0C0F14",
  },
  headerContainer: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#0C0F14",
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#A9B4C0",
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  badgeWrap: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  redBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTextVal: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "#131820",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  heroRow: {
    flexDirection: "row",
    gap: 16,
  },
  artworkWrapper: {
    position: "relative",
    width: 90,
    height: 90,
  },
  heroArtwork: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#1C2431",
  },
  artworkPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  editArtworkOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  heroInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  publishedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(18, 214, 197, 0.1)",
  },
  publishedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#12D6C5",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitleText: {
    color: "#A9B4C0",
    fontSize: 13,
    fontWeight: "500",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  heroMetaText: {
    color: "#A9B4C0",
    fontSize: 11,
    fontWeight: "500",
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
  },
  previewBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#12D6C5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  analyticsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  analyticsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A9B4C0",
    letterSpacing: 1,
    marginTop: 8,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  inputContainer: {
    minHeight: 50,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none" as any,
      },
    }),
  },
  charCount: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 11,
    fontWeight: "500",
  },
  multilineContainer: {
    height: 140,
    flexDirection: "column",
    alignItems: "stretch",
    paddingBottom: 12,
    paddingTop: 12,
  },
  multilineInput: {
    flex: 1,
    textAlignVertical: "top",
  },
  multilineCharCount: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 11,
    fontWeight: "500",
    alignSelf: "flex-end",
  },
  selectorCard: {
    minHeight: 50,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  selectorThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: tokens.colors.bgElevated,
  },
  selectorValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  selectorPlaceholder: {
    color: tokens.colors.textSecondary,
  },
  selectorThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#47C27A",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  actionGridCard: {
    flex: 1,
    height: 68,
    backgroundColor: "#131820",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionCardIcon: {
    alignSelf: "center",
  },
  actionCardText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  deleteActionText: {
    color: "#D95C5C",
  },
  saveChangesBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#12D6C5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#12D6C5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveChangesBtnDisabled: {
    opacity: 0.5,
  },
  saveChangesBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
