import { useAlbumUpload, useMediaPicker } from "@micboxx/media";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ExpoAlbumUploadAdapter } from "@/features/media/ExpoAlbumUploadAdapter";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ErrorText, Field, TextField, formStyles } from "@/shared/ui/form";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function CreateAlbumScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const uploader = useAlbumUpload(ExpoAlbumUploadAdapter);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function pickArtwork() {
    await artworkPicker.pickImage();
  }

  async function handleCreate() {
    setValidationError(null);

    if (!artworkPicker.asset) {
      setValidationError("Album artwork is required.");
      return;
    }

    try {
      const albumId = await uploader.uploadAlbum(artworkPicker.asset, {
        title: title.trim(),
        description: description.trim(),
      });

      router.replace(`/create/upload-push?albumId=${albumId}` as never);
    } catch {
      // Handled by uploader state
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Create Album" fallbackRoute="/(tabs)/create" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
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
        {validationError || uploader.state.error ? <ErrorText>{validationError || uploader.state.error}</ErrorText> : null}
        <PillButton label={uploader.state.status === "uploading" ? "Creating…" : "Create album"} tone="accent" onPress={() => void handleCreate()} />
      </Panel>
    </Screen>
  );
}
