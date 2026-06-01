import { useMediaPicker, useProfileMediaUpload } from "@micboxx/media";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveOnboardingHref } from "@/features/bootstrap/routes";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoProfileUploadAdapter } from "@/features/media/ExpoProfileUploadAdapter";
import { updateUserProfile } from "@/shared/api/creator-dashboard";
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
  const avatarPicker = useMediaPicker(ExpoMediaPickerAdapter);
  const uploader = useProfileMediaUpload(ExpoProfileUploadAdapter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(bootstrap.profile?.displayName ?? "");
    setBio(bootstrap.profile?.bio ?? "");
  }, [bootstrap.profile?.bio, bootstrap.profile?.displayName]);

  async function pickAvatar() {
    const file = await avatarPicker.pickImage();

    if (file) {
      setAvatarLabel(file.fileName ?? file.uri ?? "Selected avatar");
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

      if (avatarPicker.asset) {
        await uploader.uploadAvatar(avatarPicker.asset);
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
