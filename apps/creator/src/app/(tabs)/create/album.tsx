import { useMediaPicker } from "@micboxx/media";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { createAlbum } from "@/shared/api/creator-dashboard";
import { ErrorText, Field, TextField, formStyles } from "@/shared/ui/form";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function CreateAlbumScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickArtwork() {
    await artworkPicker.pickImage();
  }

  async function handleCreate() {
    if (!artworkPicker.asset) {
      setError("Album artwork is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append(
        "artwork",
        {
          uri: artworkPicker.asset.uri,
          name: artworkPicker.asset.fileName ?? "album-artwork.jpg",
          type: artworkPicker.asset.mimeType ?? "image/jpeg",
        } as any,
      );

      const album = await createAlbum(formData);
      router.replace(`/create/upload?albumId=${album.id}` as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Album could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title=""
      subtitle=""
      headerTitle="Create album"
      headerSubtitle="Start a new release"
    >
      <Panel title="Album details">
        <Field label="Title">
          <TextField value={title} onChangeText={setTitle} placeholder="Album title" />
        </Field>
        <Field label="Description">
          <TextField value={description} onChangeText={setDescription} multiline />
        </Field>
        <Field label="Artwork" helper={artworkPicker.asset?.fileName ?? artworkPicker.asset?.uri ?? "Select album artwork"}>
          <View style={formStyles.chipRow}>
            <PillButton label="Choose artwork" onPress={() => void pickArtwork()} />
          </View>
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={saving ? "Creating…" : "Create album"} tone="accent" onPress={() => void handleCreate()} />
      </Panel>
    </ScreenShell>
  );
}
