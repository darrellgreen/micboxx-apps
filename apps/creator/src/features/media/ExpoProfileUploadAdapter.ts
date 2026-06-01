import type { MediaAsset, ProfileMediaUploadAdapter } from "@micboxx/media";
import { replaceUserAvatar, replaceUserCover } from "@/shared/api/creator-dashboard";

export const ExpoProfileUploadAdapter: ProfileMediaUploadAdapter = {
  async uploadAvatar(asset: MediaAsset): Promise<void> {
    const formData = new FormData();
    formData.append(
      "avatar",
      {
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as any
    );
    await replaceUserAvatar(formData);
  },

  async uploadCover(asset: MediaAsset): Promise<void> {
    const formData = new FormData();
    formData.append(
      "cover",
      {
        uri: asset.uri,
        name: asset.fileName ?? "cover.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as any
    );
    await replaceUserCover(formData);
  },
};
