import { env } from "@/config/env";
import type {
    PublicAlbumSummary,
    PublicPlaylist,
    PublicTrack,
    PublicTrackSummary,
} from "@micboxx/contracts";
import {
    formatCompactNumber,
    formatCurrency,
    formatDuration,
} from "@micboxx/api";
import {
    resolveTrackRoute,
    resolveAlbumRoute,
    resolvePlaylistRoute,
} from "@micboxx/utils";

import type { AccessCtaModel, RelatedLaneModel } from "./detail-models";
import {
    buildTrackAccessCtaModel as buildTrackAccessCtaModelBase,
    type TrackAccessContext,
} from "./track-access";

import { joinBaseUrl } from "@micboxx/media";

export function buildTrackAccessCtaModel(
  track: PublicTrack,
  access: boolean | Partial<TrackAccessContext>,
): AccessCtaModel {
  return buildTrackAccessCtaModelBase(track, access, {
    webBaseUrl: env.micboxxWebBaseUrl,
  });
}

export function buildAlbumAccessCtaModel(
  album: PublicAlbumSummary,
  isSignedIn: boolean,
): AccessCtaModel {
  if (!isSignedIn && album.commerce?.isPurchasable) {
    return {
      accessState: "sign_in_required",
      ctaLabel: "Sign in to purchase",
      actionType: "sign_in",
      destination: "/sign-in",
      handoffUrl: null,
      refreshPolicy: "none",
      helperText: "Sign in before starting album checkout.",
    };
  }

  if (album.commerce?.isPurchasable && album.commerce.price) {
    return {
      accessState: "purchase_available",
      ctaLabel: `Buy album ${formatCurrency(album.commerce.price, album.commerce.currency ?? "USD")}`,
      actionType: "open_checkout",
      destination: null,
      handoffUrl: joinBaseUrl(env.micboxxWebBaseUrl, album.href),
      refreshPolicy: "after_web_return",
      helperText: "Album checkout opens in the web flow and returns to mobile.",
    };
  }

  return {
    accessState: "playable",
    ctaLabel: "Play album",
    actionType: "play",
    destination: null,
    handoffUrl: null,
    refreshPolicy: "none",
    helperText: "Playback is available now.",
  };
}

export function buildTrackRelatedLane(
  tracks: PublicTrackSummary[],
): RelatedLaneModel {
  return {
    key: "related_tracks",
    title: "Related tracks",
    entityType: "track",
    items: tracks.map((track) => ({
      key: `track-${track.id}`,
      entityType: "track",
      title: track.title,
      subtitle: track.artist?.displayName ?? "Unknown artist",
      meta: formatDuration(track.duration),
      artworkUrl: track.artworkUrl,
      href: resolveTrackRoute(track),
    })),
    emptyState: {
      title: "No related tracks yet",
      body: "More listening suggestions will appear here once the catalog expands.",
    },
  };
}

export function buildAlbumRelatedLane(
  albums: PublicAlbumSummary[],
): RelatedLaneModel {
  return {
    key: "related_albums",
    title: "Related albums",
    entityType: "album",
    items: albums.map((album) => ({
      key: `album-${album.id}`,
      entityType: "album",
      title: album.title,
      subtitle: album.artist?.displayName ?? "Unknown artist",
      meta: `${formatCompactNumber(album.counts.tracks)} songs`,
      artworkUrl: album.artworkUrl,
      href: resolveAlbumRoute(album),
    })),
    emptyState: {
      title: "No related albums yet",
      body: "This release will surface companion albums here when available.",
    },
  };
}

export function buildPlaylistRelatedLane(
  playlists: PublicPlaylist[],
): RelatedLaneModel {
  return {
    key: "related_playlists",
    title: "Related playlists",
    entityType: "playlist",
    items: playlists.map((playlist) => ({
      key: `playlist-${playlist.id}`,
      entityType: "playlist",
      title: playlist.title,
      subtitle: playlist.owner?.displayName ?? "Unknown creator",
      meta: `${formatCompactNumber(playlist.counts.tracks)} songs`,
      artworkUrl: playlist.artworkUrl,
      href: resolvePlaylistRoute(playlist),
    })),
    emptyState: {
      title: "No related playlists yet",
      body: "When similar playlists are available, they will appear here.",
    },
  };
}
