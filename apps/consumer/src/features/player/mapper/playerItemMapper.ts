import type { PublicTrack, PublicTrackSummary } from "@/contracts/micboxx";
import { resolvePlaybackAuthorization } from "@/features/player/mapper/playbackSourceResolver";
import type { PlayerItem } from "@/features/player/types/player";

type MappableTrack = PublicTrackSummary | PublicTrack;

function getBaseItem(track: MappableTrack): Omit<PlayerItem, "authorization"> {
  const fullAudioUrl =
    "assets" in track
      ? (track.assets.fullAudioUrl ??
        track.assets.premiumAudioUrl ??
        track.assets.audioUrl)
      : track.audioUrl;
  const demoAudioUrl =
    "assets" in track ? track.assets.demoAudioUrl : track.demoAudioUrl;

  return {
    id: String(track.id),
    slug: track.slug,
    title: track.title,
    artistName: track.artist?.displayName ?? "Unknown artist",
    artistUsername: track.artist?.username ?? null,
    albumTitle: track.album?.title ?? null,
    albumId: track.album ? String(track.album.id) : null,
    artworkUrl: "assets" in track ? track.assets.artworkUrl : track.artworkUrl,
    waveformDarkUrl: "assets" in track ? track.assets.waveforms.dark : null,
    waveformLightUrl: "assets" in track ? track.assets.waveforms.light : null,
    waveformFallbackUrl: "assets" in track ? track.assets.waveforms.day : null,
    durationSec: track.duration ?? null,
    locked: track.locked ?? track.access?.locked ?? false,
    isSubscriberOnly:
      track.isSubscriberOnly ?? track.commerce?.isSubscriberOnly ?? false,
    isPurchasable: Boolean(
      track.commerce?.isPurchasable || track.commerce?.price,
    ),
    requiredCapability: track.access?.requiredCapability ?? null,
    planKey: track.access?.planKey ?? null,
    fullAudioUrl: fullAudioUrl ?? null,
    demoAudioUrl: demoAudioUrl ?? null,
  };
}

export function mapTrackToPlayerItem(
  track: MappableTrack,
  options?: Parameters<typeof resolvePlaybackAuthorization>[1],
): PlayerItem {
  const baseItem = getBaseItem(track);
  return {
    ...baseItem,
    authorization: resolvePlaybackAuthorization(baseItem, options),
  };
}

export function mapTrackListToPlayerItems(
  tracks: MappableTrack[],
  options?: Parameters<typeof resolvePlaybackAuthorization>[1],
): PlayerItem[] {
  return tracks.map((track) => mapTrackToPlayerItem(track, options));
}
