import { useMediaPicker } from "@micboxx/media";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { createTrackUpload } from "@/shared/api/creator-dashboard";
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!albumId) {
      setError("Choose an album before uploading.");
      return;
    }

    if (!genreId) {
      setError("Choose a genre before uploading.");
      return;
    }

    if (!audioPicker.asset || !artworkPicker.asset) {
      setError("Audio and artwork are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("genreId", genreId);
      formData.append("albumId", albumId);
      formData.append(
        "audio",
        {
          uri: audioPicker.asset.uri,
          name: audioPicker.asset.fileName ?? "track.mp3",
          type: audioPicker.asset.mimeType ?? "audio/mpeg",
        } as any,
      );
      formData.append(
        "artwork",
        {
          uri: artworkPicker.asset.uri,
          name: artworkPicker.asset.fileName ?? "track-artwork.jpg",
          type: artworkPicker.asset.mimeType ?? "image/jpeg",
        } as any,
      );

      const track = await createTrackUpload(formData);
      await bootstrap.refetch();
      router.replace(`/create/progress/${track.id}` as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setSaving(false);
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
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={saving ? "Uploading…" : "Upload track"} tone="accent" onPress={() => void handleUpload()} />
      </Panel>
    </ScreenShell>
  );
}
