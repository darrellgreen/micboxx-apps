import type { PlayerProviderState } from "@/features/player/store";
import type { PlayerItem } from "@micboxx/contracts";

export function selectActiveItem(state: PlayerProviderState): PlayerItem | null {
  return state.nowPlaying.currentItem;
}

export function selectIsPlayable(item: PlayerItem | null): boolean {
  return Boolean(item?.authorization.allowed && item.authorization.url);
}

export function selectHasNext(state: PlayerProviderState): boolean {
  return state.queue.currentIndex < state.queue.items.length - 1;
}

export function selectHasPrevious(state: PlayerProviderState): boolean {
  return state.queue.currentIndex > 0;
}

export function selectDisplayArtwork(item: PlayerItem | null): string | null {
  return item?.artworkUrl ?? null;
}

export function selectDisplaySubtitle(item: PlayerItem | null): string {
  if (!item) {
    return "";
  }

  return item.albumTitle
    ? `${item.artistName} • ${item.albumTitle}`
    : item.artistName;
}

export function selectProgressPercent(state: PlayerProviderState): number {
  const duration = state.nowPlaying.position.durationSec;
  if (duration <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, state.nowPlaying.position.positionSec / duration),
  );
}
