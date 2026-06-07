import type { MediaAsset, TrackMetadata, TrackUploadAdapter } from "@micboxx/media";
import { createTrackUpload } from "@/shared/api/creator-dashboard";

export const ExpoTrackUploadAdapter: TrackUploadAdapter = {
  async uploadTrack(
    audio: MediaAsset,
    artwork: MediaAsset | null,
    metadata: TrackMetadata
  ): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append("title", metadata.title);
    formData.append("description", metadata.description);
    formData.append("genreId", metadata.genreId);
    formData.append("albumId", metadata.albumId);

    formData.append("audio", {
      uri: audio.uri,
      name: audio.fileName ?? "track.mp3",
      type: audio.mimeType ?? "audio/mpeg",
    } as any);

    if (artwork) {
      formData.append("artwork", {
        uri: artwork.uri,
        name: artwork.fileName ?? "track-artwork.jpg",
        type: artwork.mimeType ?? "image/jpeg",
      } as any);
    }

    const track = await createTrackUpload(formData);
    return { id: String(track.id) };
  },
};
