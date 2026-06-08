import { useMediaPicker, useProfileMediaUpload } from "@micboxx/media";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { ExpoProfileUploadAdapter } from "@/features/media/ExpoProfileUploadAdapter";
import { ErrorText } from "@/shared/ui/form";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

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
    <Screen
      header={<AppHeader variant="detail" title="Media" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title="Current media" description={`Avatar: ${bootstrap.profile?.avatarUrl ? "Connected" : "Missing"} · Cover: ${bootstrap.profile?.coverUrl ? "Connected" : "Missing"}`}>
        <PillButton label={isUploadingAvatar ? "Uploading avatar…" : "Replace avatar"} tone="accent" onPress={() => void pickAndUpload("avatar")} />
        <PillButton label={isUploadingCover ? "Uploading cover…" : "Replace cover"} onPress={() => void pickAndUpload("cover")} />
        {uploader.state.error ? <ErrorText>{uploader.state.error}</ErrorText> : null}
      </Panel>
    </Screen>
  );
}
