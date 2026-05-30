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

import type { AccessCtaModel, RelatedLaneModel } from "./detail-models";
import {
    buildTrackAccessCtaModel as buildTrackAccessCtaModelBase,
    type TrackAccessContext,
} from "./track-access";

export function getTrackRoute(slug: string) {
  return `/track/${encodeURIComponent(slug)}`;
}

export function getAlbumRoute(slug: string) {
  return `/album/${encodeURIComponent(slug)}`;
}

export function getPlaylistRoute(slug: string) {
  return `/playlist/${encodeURIComponent(slug)}`;
}

export function getGenreRoute(slug: string) {
  return `/genre/${encodeURIComponent(slug)}`;
}

export function getUserRoute(username: string) {
  return `/user/${encodeURIComponent(username)}`;
}

function normalizeCatalogRoute(href?: string | null) {
  if (!href) {
    return null;
  }

  const [pathname] = href.split(/[?#]/, 1);
  const trimmedPath = pathname.replace(/\/+$/, "");

  if (!trimmedPath.startsWith("/")) {
    return null;
  }

  return trimmedPath
    .replace(/^\/tracks\//, "/track/")
    .replace(/^\/albums\//, "/album/")
    .replace(/^\/playlists\//, "/playlist/")
    .replace(/^\/genres\//, "/genre/")
    .replace(/^\/users\//, "/user/")
    .replace(/^\/artist\//, "/user/");
}

export function resolveTrackRoute(track: {
  slug: string;
  href?: string | null;
}) {
  return normalizeCatalogRoute(track.href) ?? getTrackRoute(track.slug);
}

export function resolveAlbumRoute(album: {
  slug: string;
  href?: string | null;
}) {
  return normalizeCatalogRoute(album.href) ?? getAlbumRoute(album.slug);
}

export function resolvePlaylistRoute(playlist: {
  slug: string;
  href?: string | null;
}) {
  return normalizeCatalogRoute(playlist.href) ?? getPlaylistRoute(playlist.slug);
}

export function resolveUserRoute(artist: {
  username: string;
  href?: string | null;
}) {
  return normalizeCatalogRoute(artist.href) ?? getUserRoute(artist.username);
}

function joinBaseUrl(path: string) {
  if (!env.micboxxWebBaseUrl) {
    return null;
  }

  const baseUrl = env.micboxxWebBaseUrl.replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

export function joinMetaParts(parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join(" • ");
}

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
      handoffUrl: joinBaseUrl(album.href),
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
