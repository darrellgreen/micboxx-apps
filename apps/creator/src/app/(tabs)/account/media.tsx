import { useMediaPicker } from "@micboxx/media";
import { useState } from "react";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { replaceUserAvatar, replaceUserCover } from "@/shared/api/creator-dashboard";
import { ErrorText } from "@/shared/ui/form";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function AccountMediaScreen() {
  const bootstrap = useCreatorBootstrap();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"avatar" | "cover" | null>(null);
  const picker = useMediaPicker(ExpoMediaPickerAdapter);

  async function pickAndUpload(kind: "avatar" | "cover") {
    const file = await picker.pickImage();

    if (!file) {
      return;
    }

    setSaving(kind);
    setError(null);

    try {
      const formData = new FormData();
      formData.append(
        kind,
        {
          uri: file.uri,
          name: file.fileName ?? `${kind}.jpg`,
          type: file.mimeType ?? "image/jpeg",
        } as any,
      );

      if (kind === "avatar") {
        await replaceUserAvatar(formData);
      } else {
        await replaceUserCover(formData);
      }

      await bootstrap.refetch();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Image upload failed.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <ScreenShell title="Avatar and cover" subtitle="Action-enabled image updates for the creator profile.">
      <Panel title="Current media" description={`Avatar: ${bootstrap.profile?.avatarUrl ? "Connected" : "Missing"} · Cover: ${bootstrap.profile?.coverUrl ? "Connected" : "Missing"}`}>
        <PillButton label={saving === "avatar" ? "Uploading avatar…" : "Replace avatar"} tone="accent" onPress={() => void pickAndUpload("avatar")} />
        <PillButton label={saving === "cover" ? "Uploading cover…" : "Replace cover"} onPress={() => void pickAndUpload("cover")} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Panel>
    </ScreenShell>
  );
}
