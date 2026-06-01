import { useMediaPicker, useProfileMediaUpload } from "@micboxx/media";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoProfileUploadAdapter } from "@/features/media/ExpoProfileUploadAdapter";
import { ErrorText } from "@/shared/ui/form";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function AccountMediaScreen() {
  const bootstrap = useCreatorBootstrap();
  const picker = useMediaPicker(ExpoMediaPickerAdapter);
  const uploader = useProfileMediaUpload(ExpoProfileUploadAdapter);

  async function pickAndUpload(kind: "avatar" | "cover") {
    const file = await picker.pickImage();

    if (!file) {
      return;
    }

    try {
      if (kind === "avatar") {
        await uploader.uploadAvatar(file);
      } else {
        await uploader.uploadCover(file);
      }

      await bootstrap.refetch();
    } catch {
      // Errors are surfaced through uploader.state.error
    }
  }

  const isUploadingAvatar = uploader.state.status === "uploading" && uploader.state.target === "avatar";
  const isUploadingCover = uploader.state.status === "uploading" && uploader.state.target === "cover";

  return (
    <ScreenShell title="Avatar and cover" subtitle="Action-enabled image updates for the creator profile.">
      <Panel title="Current media" description={`Avatar: ${bootstrap.profile?.avatarUrl ? "Connected" : "Missing"} · Cover: ${bootstrap.profile?.coverUrl ? "Connected" : "Missing"}`}>
        <PillButton label={isUploadingAvatar ? "Uploading avatar…" : "Replace avatar"} tone="accent" onPress={() => void pickAndUpload("avatar")} />
        <PillButton label={isUploadingCover ? "Uploading cover…" : "Replace cover"} onPress={() => void pickAndUpload("cover")} />
        {uploader.state.error ? <ErrorText>{uploader.state.error}</ErrorText> : null}
      </Panel>
    </ScreenShell>
  );
}
