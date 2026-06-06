import { useMediaPicker } from "@micboxx/media";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import type { DashboardAlbum, DashboardAlbumSummary, DashboardUploadOptions } from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoTrackUploadAdapter } from "@/features/media/ExpoTrackUploadAdapter";
import { getAlbumStatus, getMyAlbums, getUploadOptions } from "@/shared/api/creator-dashboard";
import { ErrorText, Field, TextField } from "@/shared/ui/form";
import { AnimatedPressable, AppHeader, BottomActionSheet, Button, Screen, Surface, useToast } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function UploadTrackScreen() {
  const params = useLocalSearchParams<{ albumId?: string }>();
  const bootstrap = useCreatorBootstrap();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [albumId, setAlbumId] = useState(params.albumId ?? bootstrap.uploadOptions?.albums[0]?.id?.toString() ?? "");
  const [genreId, setGenreId] = useState("");
  const [localUploadOptions, setLocalUploadOptions] = useState<DashboardUploadOptions | null>(null);
  const [resolvedAlbum, setResolvedAlbum] = useState<DashboardAlbum | null>(null);
  const [albumSummaries, setAlbumSummaries] = useState<DashboardAlbumSummary[]>([]);
  const [albumSheetVisible, setAlbumSheetVisible] = useState(false);
  const [genreSheetVisible, setGenreSheetVisible] = useState(false);
  
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
    () => uploadOptions?.genres.find((genre) => String(genre.id) === genreId) ?? null,
    [genreId, uploadOptions?.genres],
  );
  const headerSubtitle = targetReleaseTitle
    ? `Adding to ${targetReleaseTitle}`
    : "Loading release title...";
  const albumSheetItems = (uploadOptions?.albums ?? []).map((album) => ({
    key: String(album.id),
    label: album.title,
    imageUrl: albumSummaryById.get(String(album.id))?.artworkUrl ?? null,
    icon: "albums-outline" as const,
    onPress: () => setAlbumId(String(album.id)),
  }));
  const genreSheetItems = (uploadOptions?.genres ?? []).map((genre) => ({
    key: String(genre.id),
    label: genre.name,
    icon: "musical-notes-outline" as const,
    onPress: () => setGenreId(String(genre.id)),
  }));

  useEffect(() => {
    if (bootstrap.uploadOptions?.genres.length && bootstrap.uploadOptions?.albums.length) {
      return;
    }

    let active = true;
    async function loadUploadOptions() {
      try {
        const options = await getUploadOptions();
        if (active) {
          setLocalUploadOptions(options);
        }
      } catch {
        if (active) {
          setLocalUploadOptions(null);
        }
      }
    }

    void loadUploadOptions();
    return () => {
      active = false;
    };
  }, [bootstrap.uploadOptions?.albums.length, bootstrap.uploadOptions?.genres.length]);

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
    if (!albumId) {
      setResolvedAlbum(null);
      return;
    }

    let active = true;
    async function resolveAlbum() {
      try {
        const album = await getAlbumStatus(albumId);
        if (active) {
          setResolvedAlbum(album);
        }
      } catch {
        if (active) {
          setResolvedAlbum(null);
        }
      }
    }

    void resolveAlbum();
    return () => {
      active = false;
    };
  }, [albumId]);

  function handleUpload() {
    setValidationError(null);

    if (!audioPicker.asset) return setValidationError("Audio file is required.");
    if (!artworkPicker.asset) return setValidationError("Artwork is required.");
    if (!title.trim()) return setValidationError("Track title is required.");
    if (!albumId) return setValidationError("Choose an album before uploading.");
    if (!genreId) return setValidationError("Choose a genre before uploading.");

    const uploadTitle = title.trim();
    const uploadDescription = description.trim();
    const targetAlbumId = albumId;
    const targetGenreId = genreId;
    const uploadStartedAt = Date.now();

    setUploadSubmitting(true);
    showToast({
      tone: "info",
      title: "Upload started",
      message: `Adding "${uploadTitle}" to this release.`,
    });
    router.replace(
      `/catalog/albums/${targetAlbumId}?tab=tracks&uploadingTrackTitle=${encodeURIComponent(uploadTitle)}&refreshKey=${uploadStartedAt}` as never,
    );

    void ExpoTrackUploadAdapter.uploadTrack(audioPicker.asset, artworkPicker.asset, {
      title: uploadTitle,
      description: uploadDescription,
      genreId: targetGenreId,
      albumId: targetAlbumId,
    })
      .then(async ({ id }) => {
        await bootstrap.refetch();
        router.replace(
          `/catalog/albums/${targetAlbumId}?tab=tracks&highlightTrackId=${id}&refreshKey=${Date.now()}` as never,
        );
        showToast({
          tone: "success",
          title: "Track uploaded",
          message: `"${uploadTitle}" is processing now.`,
        });
      })
      .catch((nextError) => {
        showToast({
          tone: "error",
          title: "Upload failed",
          message:
            nextError instanceof Error
              ? nextError.message
              : "Unable to upload this track.",
        });
        router.replace(
          `/create/upload-push?albumId=${targetAlbumId}` as never,
        );
      });
  }

  return (
    <Screen
      contentContainerStyle={styles.screen}
      header={
        <AppHeader
          variant="detail"
          title="Upload Track"
          subtitle={headerSubtitle}
          fallbackRoute="/(tabs)/create"
        />
      }
    >

      <View style={styles.formContainer}>
        {/* 1. Audio File */}
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>1. Audio File</Text>
          <UploadZone
            icon="musical-notes"
            label="Select Audio"
            placeholder="WAV, FLAC, or MP3 (Max 100MB)"
            assetName={audioPicker.asset?.fileName ?? undefined}
            onPick={() => void audioPicker.pickAudio()}
            isComplete={!!audioPicker.asset}
          />
        </Surface>

        {/* 2. Artwork */}
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>2. Artwork</Text>
          <UploadZone
            icon="image"
            label="Select Artwork"
            placeholder="JPG or PNG (Min 1400x1400px)"
            assetName={artworkPicker.asset?.fileName ?? (artworkPicker.asset?.uri ? "Selected Image" : undefined)}
            assetUri={artworkPicker.asset?.uri ?? undefined}
            onPick={() => void artworkPicker.pickImage()}
            isComplete={!!artworkPicker.asset}
          />
        </Surface>

        {/* 3. Track Information */}
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>3. Track Information</Text>
          <Field label="Track Title">
            <TextField 
              value={title} 
              onChangeText={setTitle} 
              placeholder="e.g. Summer Breeze" 
            />
          </Field>
          <Field label="Description (Optional)">
            <TextField 
              value={description} 
              onChangeText={setDescription} 
              placeholder="Tell your fans about this track..." 
              multiline 
            />
          </Field>
        </Surface>

        {/* 4. Release Settings */}
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>4. Release Settings</Text>
          <Field label="Target Album">
            <AnimatedPressable
              style={styles.selectorCard}
              onPress={() => setAlbumSheetVisible(true)}
              haptic="selection"
            >
              <View style={styles.selectorLeft}>
                {targetReleaseArtworkUrl ? (
                  <Image
                    source={{ uri: targetReleaseArtworkUrl }}
                    style={styles.selectorThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.selectorThumb, styles.selectorThumbPlaceholder]}>
                    <Ionicons name="albums-outline" size={15} color={tokens.colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {targetReleaseTitle ?? "Loading release title..."}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
            </AnimatedPressable>
          </Field>
          
          <Field label="Primary Genre">
            <AnimatedPressable
              style={styles.selectorCard}
              onPress={() => setGenreSheetVisible(true)}
              haptic="selection"
            >
              <View style={styles.selectorLeft}>
                <View style={styles.greenDot} />
                <Text style={styles.selectorValue}>
                  {selectedGenre?.name ?? "Select genre"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
            </AnimatedPressable>
          </Field>
        </Surface>

        {/* 5. Publish */}
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>5. Review & Upload</Text>
          <Text style={styles.publishHelpText}>
            Your track will be processed and prepared for streaming. You can change visibility settings after processing is complete.
          </Text>
          
          {validationError ? (
            <Surface tone="section" borderRadius="section" padding="md" style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#ffb3b3" />
              <ErrorText>{validationError}</ErrorText>
            </Surface>
          ) : null}

          <Button
            label={uploadSubmitting ? "Starting upload..." : "Start Upload"}
            tone="primary"
            size="lg"
            onPress={handleUpload}
            disabled={uploadSubmitting}
          />
        </Surface>
      </View>

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
      
      <View style={{ height: 100 }} />
    </Screen>
  );
}

function UploadZone({ 
  icon, 
  label, 
  placeholder, 
  assetName, 
  assetUri,
  onPick, 
  isComplete 
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  assetName?: string;
  assetUri?: string;
  onPick: () => void;
  isComplete: boolean;
}) {
  return (
    <AnimatedPressable 
      style={[styles.uploadZone, isComplete && styles.uploadZoneComplete]} 
      onPress={onPick}
    >
      {assetUri ? (
        <Image source={{ uri: assetUri }} style={styles.uploadZonePreview} contentFit="cover" />
      ) : (
        <View style={[styles.uploadIconWrap, isComplete && styles.uploadIconWrapComplete]}>
          <Ionicons 
            name={isComplete ? "checkmark" : icon} 
            size={24} 
            color={isComplete ? tokens.colors.accent : tokens.colors.textSecondary} 
          />
        </View>
      )}
      <View style={styles.uploadZoneCopy}>
        <Text style={styles.uploadZoneLabel}>
          {isComplete ? assetName || "File selected" : label}
        </Text>
        {!isComplete && <Text style={styles.uploadZonePlaceholder}>{placeholder}</Text>}
      </View>
      <View style={styles.uploadZoneAction}>
        <Text style={styles.uploadZoneActionText}>{isComplete ? "Change" : "Browse"}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    gap: 12,
  },
  formContainer: {
    gap: 16,
  },
  section: {
    gap: 16,
    borderWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: tokens.colors.textPrimary,
    marginBottom: 4,
  },
  uploadZone: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: tokens.colors.bgApp,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderStyle: "dashed",
    borderRadius: tokens.radii.lg,
    gap: 14,
  },
  uploadZoneComplete: {
    borderStyle: "solid",
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.bgElevated,
  },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconWrapComplete: {
    backgroundColor: "rgba(185,255,93,0.1)",
  },
  uploadZonePreview: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  uploadZoneCopy: {
    flex: 1,
    gap: 2,
  },
  uploadZoneLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: tokens.colors.textPrimary,
  },
  uploadZonePlaceholder: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
  },
  uploadZoneAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  uploadZoneActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.textPrimary,
  },
  selectorCard: {
    height: 48,
    backgroundColor: "#131820",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.success,
  },
  publishHelpText: {
    fontSize: 14,
    color: tokens.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 100, 100, 0.1)",
    borderColor: "rgba(255, 100, 100, 0.2)",
    borderWidth: 1,
  },
});
