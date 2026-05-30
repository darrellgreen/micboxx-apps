import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveOnboardingHref } from "@/features/bootstrap/routes";
import {
  replaceUserAvatar,
  updateUserProfile,
} from "@/shared/api/creator-dashboard";
import { Field, TextField, ErrorText } from "@/shared/ui/form";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";

export default function OnboardingProfileScreen() {
  const bootstrap = useCreatorBootstrap();
  const [displayName, setDisplayName] = useState(
    bootstrap.profile?.displayName ?? "",
  );
  const [bio, setBio] = useState(bootstrap.profile?.bio ?? "");
  const [avatarLabel, setAvatarLabel] = useState(
    bootstrap.profile?.avatarUrl ? "Current avatar connected" : "No avatar selected",
  );
  const [avatarAsset, setAvatarAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(bootstrap.profile?.displayName ?? "");
    setBio(bootstrap.profile?.bio ?? "");
  }, [bootstrap.profile?.bio, bootstrap.profile?.displayName]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled) {
      setAvatarAsset(result.assets[0] ?? null);
      setAvatarLabel(result.assets[0]?.fileName ?? result.assets[0]?.uri ?? "Selected avatar");
    }
  }

  async function handleContinue() {
    setSaving(true);
    setError(null);

    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });

      if (avatarAsset) {
        const formData = new FormData();
        formData.append(
          "avatar",
          {
            uri: avatarAsset.uri,
            name: avatarAsset.fileName ?? "avatar.jpg",
            type: avatarAsset.mimeType ?? "image/jpeg",
          } as any,
        );
        await replaceUserAvatar(formData);
      }

      await bootstrap.refetch();
      router.replace(resolveOnboardingHref("needs_album"));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Profile setup could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title="Complete profile"
      subtitle="A creator profile needs at least a public bio and avatar before the first release."
    >
      <Panel title="Profile basics">
        <Field label="Display name">
          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Artist or creator name"
          />
        </Field>
        <Field label="Bio">
          <TextField
            value={bio}
            onChangeText={setBio}
            placeholder="Tell listeners who you are."
            multiline
          />
        </Field>
        <Field label="Avatar" helper={avatarLabel}>
          <View style={styles.actions}>
            <PillButton label="Choose avatar" onPress={() => void pickAvatar()} />
          </View>
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Panel>
      <PillButton
        label={saving ? "Saving…" : "Continue"}
        tone="accent"
        onPress={() => void handleContinue()}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
  },
});
