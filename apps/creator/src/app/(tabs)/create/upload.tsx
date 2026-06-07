import { useMediaPicker } from "@micboxx/media";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import type { DashboardAlbum, DashboardAlbumSummary, DashboardUploadOptions } from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoTrackUploadAdapter } from "@/features/media/ExpoTrackUploadAdapter";
import { getAlbumStatus, getMyAlbums, getUploadOptions } from "@/shared/api/creator-dashboard";
import { ErrorText, TextField } from "@/shared/ui/form";
import {
  FORM_SELECTOR_BACKGROUND,
  FORM_SELECTOR_BORDER_COLOR,
  FormSelectorRow,
} from "@/shared/ui/selector-row";
import { AnimatedPressable, AppHeader, BottomActionSheet, Button, Screen, Surface, useToast } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";


export default function UploadTrackScreen() {
  const params = useLocalSearchParams<{ albumId?: string; origin?: string }>();
  const bootstrap = useCreatorBootstrap();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [albumId, setAlbumId] = useState(params.albumId ?? bootstrap.uploadOptions?.albums[0]?.id?.toString() ?? "");
  const [genreId, setGenreId] = useState<number | null>(null);
  const [localUploadOptions, setLocalUploadOptions] = useState<DashboardUploadOptions | null>(null);
  const [resolvedAlbum, setResolvedAlbum] = useState<DashboardAlbum | null>(null);
  const [albumSummaries, setAlbumSummaries] = useState<DashboardAlbumSummary[]>([]);
  const [albumSheetVisible, setAlbumSheetVisible] = useState(false);
  const [primaryGenreSheetVisible, setPrimaryGenreSheetVisible] = useState(false);
  const audioPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const { showToast } = useToast();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const uploadOptions = bootstrap.uploadOptions ?? localUploadOptions;
  const selectedAlbum = useMemo(
    () => uploadOptions?.albums.find((album) => String(album.id) === albumId) ?? null,
    [albumId, uploadOptions?.albums],
  );
  const targetReleaseTitle = resolvedAlbum?.title ?? selectedAlbum?.title ?? null;
  const selectedAlbumSummary = useMemo(
    () => albumSummaries.find((album) => String(album.id) === albumId) ?? null,
    [albumId, albumSummaries],
  );
  const albumSummaryById = useMemo(
    () => new Map(albumSummaries.map((album) => [String(album.id), album])),
    [albumSummaries],
  );
  const targetReleaseArtworkUrl = resolvedAlbum?.artworkUrl ?? selectedAlbumSummary?.artworkUrl ?? null;
  const selectedGenre = useMemo(
    () => uploadOptions?.genres.find((genre) => genre.id === genreId) ?? null,
    [genreId, uploadOptions?.genres],
  );
  const albumSheetItems = (uploadOptions?.albums ?? []).map((album) => ({
    key: String(album.id),
    label: album.title,
    imageUrl: albumSummaryById.get(String(album.id))?.artworkUrl ?? null,
    icon: "albums-outline" as const,
    onPress: () => setAlbumId(String(album.id)),
  }));
  const primaryGenreSheetItems = (uploadOptions?.genres ?? []).map((genre) => ({
    key: String(genre.id),
    label: genre.name,
    icon: "musical-notes-outline" as const,
    onPress: () => {
      setGenreId(genre.id);
      setPrimaryGenreSheetVisible(false);
    },
  }));

  const readinessItems = [
    { key: "audio", label: "Audio", done: !!audioPicker.asset },
    { key: "title", label: "Title", done: !!title.trim() },
    { key: "genre", label: "Genre", done: !!genreId },
    { key: "artwork", label: "Artwork", done: !!artworkPicker.asset, optional: true },
  ];
  const requiredDone = readinessItems.filter((r) => !r.optional).every((r) => r.done);

  useEffect(() => {
    if (bootstrap.uploadOptions?.genres.length && bootstrap.uploadOptions?.albums.length) {
      return;
    }
    let active = true;
    async function loadUploadOptions() {
      try {
        const options = await getUploadOptions();
        if (active) setLocalUploadOptions(options);
      } catch {
        if (active) setLocalUploadOptions(null);
      }
    }
    void loadUploadOptions();
    return () => { active = false; };
  }, [bootstrap.uploadOptions?.albums.length, bootstrap.uploadOptions?.genres.length]);

  useEffect(() => {
    let active = true;
    async function loadAlbumSummaries() {
      try {
        const response = await getMyAlbums(1, 50);
        if (active) setAlbumSummaries(response.albums);
      } catch {
        if (active) setAlbumSummaries([]);
      }
    }
    void loadAlbumSummaries();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (params.albumId && albumId !== params.albumId) {
      setAlbumId(params.albumId);
      return;
    }
    if (!albumId && uploadOptions?.albums[0]?.id) {
      setAlbumId(String(uploadOptions.albums[0].id));
    }
  }, [albumId, params.albumId, uploadOptions]);

  useEffect(() => {
    if (!albumId) { setResolvedAlbum(null); return; }
    let active = true;
    async function resolveAlbum() {
      try {
        const album = await getAlbumStatus(albumId);
        if (active) setResolvedAlbum(album);
      } catch {
        if (active) setResolvedAlbum(null);
      }
    }
    void resolveAlbum();
    return () => { active = false; };
  }, [albumId]);

  function handleUpload() {
    setValidationError(null);
    if (!audioPicker.asset) return setValidationError("Audio file is required.");
    if (!title.trim()) return setValidationError("Track title is required.");
    if (!albumId) return setValidationError("Choose an album before uploading.");
    if (!genreId) return setValidationError("Choose a genre before uploading.");

    const uploadTitle = title.trim();
    const uploadDescription = description.trim();
    const targetAlbumId = albumId;
    const targetGenreId = String(genreId);
    const uploadStartedAt = Date.now();

    setUploadSubmitting(true);
    showToast({ tone: "info", title: "Upload started", message: `Adding "${uploadTitle}" to this release.` });

    if (params.origin === "create-release") {
      router.replace(`/create/release?draftAlbumId=${targetAlbumId}&step=2&uploadingTrackTitle=${encodeURIComponent(uploadTitle)}&refreshKey=${uploadStartedAt}` as never);
    } else {
      router.replace(`/catalog/albums/${targetAlbumId}?tab=tracks&uploadingTrackTitle=${encodeURIComponent(uploadTitle)}&refreshKey=${uploadStartedAt}` as never);
    }

    void ExpoTrackUploadAdapter.uploadTrack(audioPicker.asset, artworkPicker.asset ?? null, {
      title: uploadTitle,
      description: uploadDescription,
      genreId: targetGenreId,
      albumId: targetAlbumId,
    })
      .then(async ({ id }) => {
        await bootstrap.refetch();
        showToast({ tone: "success", title: "Track uploaded", message: `"${uploadTitle}" is processing now.` });
        if (params.origin === "create-release") {
          router.replace(`/create/release?draftAlbumId=${targetAlbumId}&step=2&highlightTrackId=${id}&refreshKey=${Date.now()}` as never);
        } else {
          router.replace(`/catalog/albums/${targetAlbumId}?tab=tracks&highlightTrackId=${id}&refreshKey=${Date.now()}` as never);
        }
      })
      .catch((nextError) => {
        setUploadSubmitting(false);
        const errorMessage = nextError instanceof Error ? nextError.message : "Unable to upload this track.";
        setValidationError(errorMessage);
        showToast({ tone: "error", title: "Upload failed", message: errorMessage });
      });
  }

  const fallbackRoute = params.origin === "create-release"
    ? `/create/release?draftAlbumId=${albumId}&step=2`
    : "/(tabs)/create";

  const heroArtworkUri = artworkPicker.asset?.uri ?? targetReleaseArtworkUrl ?? null;

  return (
    <Screen
      contentContainerStyle={styles.screen}
      header={
        <AppHeader
          variant="detail"
          title="Upload Track"
          fallbackRoute={fallbackRoute}
        />
      }
    >
      {/* Track Hero */}
      <View style={styles.hero}>
        <Pressable onPress={() => void artworkPicker.pickImage()} style={styles.heroArtworkWrap}>
          {heroArtworkUri ? (
            <Image source={{ uri: heroArtworkUri }} style={styles.heroArtwork} contentFit="cover" />
          ) : (
            <View style={styles.heroArtworkPlaceholder}>
              <Ionicons name="image-outline" size={32} color={tokens.colors.textSecondary} />
            </View>
          )}
          <View style={styles.heroArtworkBadge}>
            <Ionicons name="camera-outline" size={12} color={tokens.colors.textPrimary} />
          </View>
        </Pressable>

        <View style={styles.heroMeta}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {title.trim() || "Untitled"}
          </Text>
          <Text style={styles.heroArtist} numberOfLines={1}>{targetReleaseTitle ?? "Loading release..."}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroDraftBadge}>
              <Text style={styles.heroDraftBadgeText}>Draft</Text>
            </View>
            {targetReleaseTitle ? (
              <View style={styles.heroAlbumBadge}>
                <Ionicons name="albums-outline" size={11} color={tokens.colors.textSecondary} />
                <Text style={styles.heroAlbumBadgeText} numberOfLines={1}>{targetReleaseTitle}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Track Assets */}
      <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>Track Assets</Text>

        <AudioAssetCard
          asset={audioPicker.asset}
          onPick={() => void audioPicker.pickAudio()}
        />

      </Surface>

      {/* Track Details */}
      <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>Track Details</Text>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Track Title</Text>
          <TextField
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Summer Escape"
            style={styles.titleInput}
          />
        </View>
        <FormSelectorRow
          icon="musical-notes-outline"
          label="Genre"
          value={selectedGenre?.name ?? "Select a genre"}
          onPress={() => setPrimaryGenreSheetVisible(true)}
          placeholder={!selectedGenre}
        />
        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          multiline
        />
      </Surface>

      {/* Album selector — only shown when not pre-set by the release builder */}
      {!params.albumId && (
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>Release</Text>
          <AnimatedPressable
            style={styles.selectorCard}
            onPress={() => setAlbumSheetVisible(true)}
            haptic="selection"
          >
            <View style={styles.selectorLeft}>
              {targetReleaseArtworkUrl ? (
                <Image source={{ uri: targetReleaseArtworkUrl }} style={styles.selectorThumb} contentFit="cover" />
              ) : (
                <View style={[styles.selectorThumb, styles.selectorThumbPlaceholder]}>
                  <Ionicons name="albums-outline" size={15} color={tokens.colors.textSecondary} />
                </View>
              )}
              <Text style={styles.selectorValue} numberOfLines={1}>
                {targetReleaseTitle ?? "Select album"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
          </AnimatedPressable>
        </Surface>
      )}

      {/* Readiness progress */}
      <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {requiredDone ? "Ready to upload" : `${readinessItems.filter((r) => !r.optional && r.done).length} of ${readinessItems.filter((r) => !r.optional).length} required`}
          </Text>
          {requiredDone && (
            <Ionicons name="checkmark-circle" size={14} color={tokens.colors.accent} />
          )}
        </View>
        <View style={styles.progressBarTrack}>
          {readinessItems.filter((r) => !r.optional).map((item, i, arr) => (
            <View
              key={item.key}
              style={[
                styles.progressBarSegment,
                item.done && styles.progressBarSegmentDone,
                i < arr.length - 1 && styles.progressBarSegmentGap,
              ]}
            />
          ))}
        </View>
        <View style={styles.progressItems}>
          {readinessItems.map((item) => (
            <View key={item.key} style={styles.progressItem}>
              <Ionicons
                name={item.done ? "checkmark-circle" : "ellipse-outline"}
                size={13}
                color={item.done ? tokens.colors.accent : tokens.colors.textSecondary}
              />
              <Text style={[styles.progressItemLabel, item.done && styles.progressItemLabelDone]}>
                {item.label}{item.optional ? "*" : ""}
              </Text>
            </View>
          ))}
        </View>
      </Surface>

      {/* Upload button */}
      <View style={styles.uploadButtonWrap}>
        {validationError ? (
          <Surface tone="section" borderRadius="section" padding="md" style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#ffb3b3" />
            <ErrorText>{validationError}</ErrorText>
          </Surface>
        ) : null}
        <Button
          label={uploadSubmitting ? "Starting upload..." : "Upload Track"}
          tone="primary"
          size="lg"
          onPress={handleUpload}
          disabled={uploadSubmitting}
        />
      </View>

      <BottomActionSheet
        visible={albumSheetVisible}
        title="Select Target Album"
        items={albumSheetItems}
        onClose={() => setAlbumSheetVisible(false)}
      />

      <BottomActionSheet
        visible={primaryGenreSheetVisible}
        title="Select Genre"
        items={primaryGenreSheetItems}
        onClose={() => setPrimaryGenreSheetVisible(false)}
      />

      <View style={{ height: 100 }} />
    </Screen>
  );
}

function AudioAssetCard({ asset, onPick }: { asset: ReturnType<typeof useMediaPicker>["asset"]; onPick: () => void }) {
  if (!asset) {
    return (
      <AnimatedPressable style={styles.assetZone} onPress={onPick}>
        <View style={styles.assetIconWrap}>
          <Ionicons name="musical-notes" size={22} color={tokens.colors.textSecondary} />
        </View>
        <View style={styles.assetCopy}>
          <Text style={styles.assetLabel}>Select Audio</Text>
          <Text style={styles.assetHint}>WAV, FLAC, or MP3 · Max 100 MB</Text>
        </View>
        <Text style={styles.assetAction}>Browse</Text>
      </AnimatedPressable>
    );
  }

  const ext = asset.fileName?.split(".").pop()?.toUpperCase() ?? (asset.mimeType?.split("/")[1]?.toUpperCase() ?? "Audio");
  const sizeMb = asset.fileSize ? (asset.fileSize / 1024 / 1024).toFixed(1) : null;

  return (
    <AnimatedPressable style={styles.assetZoneComplete} onPress={onPick}>
      <View style={styles.assetIconWrapComplete}>
        <Ionicons name="checkmark" size={18} color={tokens.colors.accent} />
      </View>
      <View style={styles.assetCopy}>
        <Text style={styles.assetLabelComplete} numberOfLines={1}>{asset.fileName ?? "Audio selected"}</Text>
        <Text style={styles.assetMeta}>{[ext, sizeMb ? `${sizeMb} MB` : null].filter(Boolean).join(" · ")}</Text>
      </View>
      <Text style={styles.assetAction}>Change</Text>
    </AnimatedPressable>
  );
}

function ArtworkAssetCard({ asset, onPick }: { asset: ReturnType<typeof useMediaPicker>["asset"]; onPick: () => void }) {
  if (!asset) {
    return (
      <AnimatedPressable style={styles.assetZone} onPress={onPick}>
        <View style={styles.assetIconWrap}>
          <Ionicons name="image" size={22} color={tokens.colors.textSecondary} />
        </View>
        <View style={styles.assetCopy}>
          <Text style={styles.assetLabel}>Select Artwork</Text>
          <Text style={styles.assetHint}>JPG or PNG · Min 1400×1400 px</Text>
        </View>
        <Text style={styles.assetAction}>Browse</Text>
      </AnimatedPressable>
    );
  }

  const dims = asset.width && asset.height ? `${asset.width}×${asset.height}` : null;
  const ext = asset.mimeType?.split("/")[1]?.toUpperCase() ?? "Image";

  return (
    <AnimatedPressable style={styles.assetZoneComplete} onPress={onPick}>
      <Image source={{ uri: asset.uri }} style={styles.assetThumb} contentFit="cover" />
      <View style={styles.assetCopy}>
        <Text style={styles.assetLabelComplete} numberOfLines={1}>Artwork selected</Text>
        <Text style={styles.assetMeta}>{[dims, ext].filter(Boolean).join(" · ")}</Text>
      </View>
      <Text style={styles.assetAction}>Change</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    gap: 12,
  },
  section: {
    gap: 12,
    borderWidth: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: tokens.colors.textPrimary,
  },

  // Hero
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  heroArtworkWrap: {
    position: "relative",
  },
  heroArtwork: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  heroArtworkPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArtworkBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: tokens.colors.textPrimary,
    lineHeight: 22,
  },
  heroArtist: {
    fontSize: 14,
    color: tokens.colors.textSecondary,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  heroDraftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  heroDraftBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroAlbumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    maxWidth: 160,
  },
  heroAlbumBadgeText: {
    fontSize: 11,
    color: tokens.colors.textSecondary,
    flexShrink: 1,
  },

  // Asset zones
  assetZone: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: tokens.colors.bgApp,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderStyle: "dashed",
    borderRadius: tokens.radii.lg,
    gap: 12,
  },
  assetZoneComplete: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radii.lg,
    gap: 12,
  },
  assetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  assetIconWrapComplete: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(185,255,93,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  assetThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  assetCopy: {
    flex: 1,
    gap: 2,
  },
  assetLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.textPrimary,
  },
  assetLabelComplete: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.textPrimary,
  },
  assetHint: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
  },
  assetMeta: {
    fontSize: 12,
    color: tokens.colors.accent,
  },
  assetAction: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: tokens.colors.bgApp,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    overflow: "hidden",
  },

  // Title input
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textSecondary,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Collapsible metadata
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapseBody: {
    gap: 10,
  },
  metaSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgApp,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  metaPillDone: {
    borderColor: "rgba(185,255,93,0.3)",
    backgroundColor: "rgba(185,255,93,0.06)",
  },
  metaPillText: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
  },
  metaPillTextDone: {
    color: tokens.colors.textPrimary,
  },

  // Album selector
  selectorCard: {
    height: 48,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  selectorValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  selectorThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: tokens.colors.bgElevated,
  },
  selectorThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Progress
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
  },
  progressBarTrack: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    gap: 3,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.bgElevated,
  },
  progressBarSegmentDone: {
    backgroundColor: tokens.colors.accent,
  },
  progressBarSegmentGap: {},
  progressItems: {
    flexDirection: "row",
    gap: 14,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressItemLabel: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
  },
  progressItemLabelDone: {
    color: tokens.colors.textPrimary,
  },
  uploadButtonWrap: {
    gap: 10,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 100, 100, 0.1)",
    borderColor: "rgba(255, 100, 100, 0.2)",
    borderWidth: 1,
  },
});
