import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { createAlbum } from "@/shared/api/creator-dashboard";
import { ErrorText, Field, TextField, formStyles } from "@/shared/ui/form";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function CreateAlbumScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artwork, setArtwork] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickArtwork() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled) {
      setArtwork(result.assets[0] ?? null);
    }
  }

  async function handleCreate() {
    if (!artwork) {
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
          uri: artwork.uri,
          name: artwork.fileName ?? "album-artwork.jpg",
          type: artwork.mimeType ?? "image/jpeg",
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
    <ScreenShell title="Create album" subtitle="Album creation comes first in the current creator release model.">
      <Panel title="Album details">
        <Field label="Title">
          <TextField value={title} onChangeText={setTitle} placeholder="Album title" />
        </Field>
        <Field label="Description">
          <TextField value={description} onChangeText={setDescription} multiline />
        </Field>
        <Field label="Artwork" helper={artwork?.fileName ?? artwork?.uri ?? "Select album artwork"}>
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
