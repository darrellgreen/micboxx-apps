import type { PlayerItem } from "@micboxx/contracts";

export interface DownloadPlaybackCandidate {
  item: PlayerItem;
  localFileUrl: string | null;
}

export interface DownloadPlaybackResolver {
  resolveLocalCandidate(item: PlayerItem): Promise<DownloadPlaybackCandidate>;
}

export const noopDownloadPlaybackResolver: DownloadPlaybackResolver = {
  async resolveLocalCandidate(item) {
    return {
      item,
      localFileUrl: null,
    };
  },
};
