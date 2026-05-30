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

export function normalizeCatalogRoute(href?: string | null) {
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

export function joinMetaParts(parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join(" • ");
}
