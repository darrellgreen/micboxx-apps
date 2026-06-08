import { useEffect, useState } from "react";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { updateUserProfile } from "@/shared/api/creator-dashboard";
import { ErrorText, Field, TextField } from "@/shared/ui/form";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function ProfileEditScreen() {
  const bootstrap = useCreatorBootstrap();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(bootstrap.profile?.displayName ?? "");
    setBio(bootstrap.profile?.bio ?? "");
    setWebsite(bootstrap.profile?.links.website ?? "");
    setInstagram(bootstrap.profile?.links.instagram ?? "");
    setTwitter(bootstrap.profile?.links.twitter ?? "");
  }, [bootstrap.profile]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        instagram: instagram.trim(),
        twitter: twitter.trim(),
      });
      await bootstrap.refreshProfile();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Profile update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Edit Profile" fallbackRoute="/account/profile" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title="Profile fields">
        <Field label="Display name">
          <TextField value={displayName} onChangeText={setDisplayName} />
        </Field>
        <Field label="Bio">
          <TextField value={bio} onChangeText={setBio} multiline />
        </Field>
        <Field label="Website">
          <TextField value={website} onChangeText={setWebsite} keyboardType="url" />
        </Field>
        <Field label="Instagram">
          <TextField value={instagram} onChangeText={setInstagram} />
        </Field>
        <Field label="Twitter / X">
          <TextField value={twitter} onChangeText={setTwitter} />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={saving ? "Saving…" : "Save profile"} tone="accent" onPress={() => void handleSave()} />
      </Panel>
    </Screen>
  );
}
