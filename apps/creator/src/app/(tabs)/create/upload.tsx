import { useMediaPicker, useTrackUpload } from "@micboxx/media";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoTrackUploadAdapter } from "@/features/media/ExpoTrackUploadAdapter";
import { ErrorText, Field, TextField } from "@/shared/ui/form";
import { AnimatedPressable, AppHeader, Button, Screen, Surface } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function UploadTrackScreen() {
  const params = useLocalSearchParams<{ albumId?: string }>();
  const bootstrap = useCreatorBootstrap();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [albumId, setAlbumId] = useState(params.albumId ?? bootstrap.uploadOptions?.albums[0]?.id?.toString() ?? "");
  const [genreId, setGenreId] = useState(bootstrap.uploadOptions?.genres[0]?.id?.toString() ?? "");
  
  const audioPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const uploader = useTrackUpload(ExpoTrackUploadAdapter);

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!albumId && bootstrap.uploadOptions?.albums[0]?.id) {
      setAlbumId(String(bootstrap.uploadOptions.albums[0].id));
    }
    if (!genreId && bootstrap.uploadOptions?.genres[0]?.id) {
      setGenreId(String(bootstrap.uploadOptions.genres[0].id));
    }
  }, [albumId, bootstrap.uploadOptions, genreId]);

  async function handleUpload() {
    setValidationError(null);

    if (!audioPicker.asset) return setValidationError("Audio file is required.");
    if (!artworkPicker.asset) return setValidationError("Artwork is required.");
    if (!title.trim()) return setValidationError("Track title is required.");
    if (!albumId) return setValidationError("Choose an album before uploading.");
    if (!genreId) return setValidationError("Choose a genre before uploading.");

    try {
      const trackId = await uploader.uploadTrack(audioPicker.asset, artworkPicker.asset, {
        title: title.trim(),
        description: description.trim(),
        genreId,
        albumId,
      });

      await bootstrap.refetch();
      router.replace(`/create/progress/${trackId}` as never);
    } catch {
      // Errors handled by uploader.state.error
    }
  }

  return (
    <Screen style={styles.screen} header={<AppHeader variant="flow" title="Upload Track" fallbackRoute="/(tabs)/create" />}>

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
            <View style={styles.chipRow}>
              {bootstrap.uploadOptions?.albums.map((album) => {
                const active = albumId === String(album.id);
                return (
                  <AnimatedPressable
                    key={album.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setAlbumId(String(album.id))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {album.title}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Field>
          
          <Field label="Primary Genre">
            <View style={styles.chipRow}>
              {bootstrap.uploadOptions?.genres.map((genre) => {
                const active = genreId === String(genre.id);
                return (
                  <AnimatedPressable
                    key={genre.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setGenreId(String(genre.id))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {genre.name}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Field>
        </Surface>

        {/* 5. Publish */}
        <Surface tone="section" borderRadius="section" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>5. Review & Upload</Text>
          <Text style={styles.publishHelpText}>
            Your track will be processed and prepared for streaming. You can change visibility settings after processing is complete.
          </Text>
          
          {(validationError || uploader.state.error) ? (
            <Surface tone="section" borderRadius="section" padding="md" style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#ffb3b3" />
              <ErrorText>{validationError || uploader.state.error}</ErrorText>
            </Surface>
          ) : null}

          <Button
            label={uploader.state.status === "uploading" ? "Uploading..." : "Start Upload"}
            tone="primary"
            size="lg"
            onPress={() => void handleUpload()}
            disabled={uploader.state.status === "uploading"}
          />
        </Surface>
      </View>
      
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
    paddingTop: 0,
  },
  formContainer: {
    gap: 16,
  },
  section: {
    gap: 16,
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
  },
  chipTextActive: {
    color: tokens.colors.bgApp,
    fontWeight: "700",
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
