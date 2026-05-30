import type { PlayerItem } from "@/features/player/types/player";

export function toNowPlayingMetadata(item: PlayerItem) {
  return {
    title: item.title,
    artist: item.artistName,
    album: item.albumTitle ?? undefined,
    artwork: item.artworkUrl ?? undefined,
    duration: item.durationSec ?? undefined,
  };
}
