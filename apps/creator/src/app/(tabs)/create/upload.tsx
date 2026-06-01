import { useMediaPicker, useTrackUpload } from "@micboxx/media";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoTrackUploadAdapter } from "@/features/media/ExpoTrackUploadAdapter";
import { ErrorText, Field, TextField, formStyles } from "@/shared/ui/form";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

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

  async function pickAudio() {
    await audioPicker.pickAudio();
  }

  async function pickArtwork() {
    await artworkPicker.pickImage();
  }

  async function handleUpload() {
    setValidationError(null);

    if (!albumId) {
      setValidationError("Choose an album before uploading.");
      return;
    }

    if (!genreId) {
      setValidationError("Choose a genre before uploading.");
      return;
    }

    if (!audioPicker.asset || !artworkPicker.asset) {
      setValidationError("Audio and artwork are required.");
      return;
    }

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
    <ScreenShell
      title=""
      subtitle=""
      headerTitle="Upload track"
      headerSubtitle="Add a track to an album"
    >
      <Panel title="Track upload">
        <Field label="Title">
          <TextField value={title} onChangeText={setTitle} placeholder="Track title" />
        </Field>
        <Field label="Description">
          <TextField value={description} onChangeText={setDescription} multiline />
        </Field>
        <Field label="Album">
          <View style={formStyles.chipRow}>
            {bootstrap.uploadOptions?.albums.map((album) => (
              <PillButton key={album.id} label={album.title} tone={albumId === String(album.id) ? "accent" : "subtle"} onPress={() => setAlbumId(String(album.id))} />
            ))}
          </View>
        </Field>
        <Field label="Genre">
          <View style={formStyles.chipRow}>
            {bootstrap.uploadOptions?.genres.map((genre) => (
              <PillButton key={genre.id} label={genre.name} tone={genreId === String(genre.id) ? "accent" : "subtle"} onPress={() => setGenreId(String(genre.id))} />
            ))}
          </View>
        </Field>
        <Field label="Audio" helper={audioPicker.asset?.fileName ?? "Select an audio file"}>
          <PillButton label="Choose audio" onPress={() => void pickAudio()} />
        </Field>
        <Field label="Artwork" helper={artworkPicker.asset?.fileName ?? artworkPicker.asset?.uri ?? "Select artwork"}>
          <PillButton label="Choose artwork" onPress={() => void pickArtwork()} />
        </Field>
        {validationError || uploader.state.error ? <ErrorText>{validationError || uploader.state.error}</ErrorText> : null}
        <PillButton label={uploader.state.status === "uploading" ? "Uploading…" : "Upload track"} tone="accent" onPress={() => void handleUpload()} />
      </Panel>
    </ScreenShell>
  );
}
