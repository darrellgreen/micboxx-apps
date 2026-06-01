import type { AlbumMetadata, AlbumUploadAdapter, MediaAsset } from "@micboxx/media";
import { createAlbum } from "@/shared/api/creator-dashboard";

export const ExpoAlbumUploadAdapter: AlbumUploadAdapter = {
  async uploadAlbum(artwork: MediaAsset, metadata: AlbumMetadata): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append("title", metadata.title);
    formData.append("description", metadata.description);

    formData.append("artwork", {
      uri: artwork.uri,
      name: artwork.fileName ?? "album-artwork.jpg",
      type: artwork.mimeType ?? "image/jpeg",
    } as any);

    const album = await createAlbum(formData);
    return { id: String(album.id) };
  },
};
