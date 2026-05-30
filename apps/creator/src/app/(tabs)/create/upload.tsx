import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
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
  const [audioAsset, setAudioAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [artworkAsset, setArtworkAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
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
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      setAudioAsset(result.assets[0] ?? null);
    }
  }

  async function pickArtwork() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled) {
      setArtworkAsset(result.assets[0] ?? null);
    }
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

    if (!audioAsset || !artworkAsset) {
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
          uri: audioAsset.uri,
          name: audioAsset.name,
          type: audioAsset.mimeType ?? "audio/mpeg",
        } as any,
      );
      formData.append(
        "artwork",
        {
          uri: artworkAsset.uri,
          name: artworkAsset.fileName ?? "track-artwork.jpg",
          type: artworkAsset.mimeType ?? "image/jpeg",
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
    <ScreenShell title="Upload track" subtitle="Album-first upload flow using the live creator dashboard endpoint.">
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
        <Field label="Audio" helper={audioAsset?.name ?? "Select an audio file"}>
          <PillButton label="Choose audio" onPress={() => void pickAudio()} />
        </Field>
        <Field label="Artwork" helper={artworkAsset?.fileName ?? artworkAsset?.uri ?? "Select artwork"}>
          <PillButton label="Choose artwork" onPress={() => void pickArtwork()} />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={saving ? "Uploading…" : "Upload track"} tone="accent" onPress={() => void handleUpload()} />
      </Panel>
    </ScreenShell>
  );
}
