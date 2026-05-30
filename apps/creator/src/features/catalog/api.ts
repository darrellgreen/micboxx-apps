import type {
    PublicAlbumPage,
    PublicArtistPage,
    PublicArtistSummary,
    PublicPlaylistPage,
    PublicSearchResults,
    PublicTrackList,
    PublicTrackPage,
    PublicTrackSummary,
} from "@/contracts/micboxx";
import { apiFetch } from "@/lib/api/client";
import { mockSearchResults } from "@/lib/mock-data";

export async function getDiscoverTracks(): Promise<PublicTrackList> {
  return apiFetch<PublicTrackList>("/v1/public/tracks?page=1&pageSize=12");
}

export async function getTrackPage(slug: string): Promise<PublicTrackPage> {
  return apiFetch<PublicTrackPage>(
    `/v1/public/tracks/${encodeURIComponent(slug)}`,
  );
}

export async function getAlbumPage(slug: string): Promise<PublicAlbumPage> {
  return apiFetch<PublicAlbumPage>(
    `/v1/public/albums/${encodeURIComponent(slug)}`,
  );
}

export async function getArtistPage(
  username: string,
): Promise<PublicArtistPage> {
  return apiFetch<PublicArtistPage>(
    `/v1/public/users/${encodeURIComponent(username)}`,
  );
}

export const getUserPage = getArtistPage;

export async function getPlaylistPage(
  slug: string,
): Promise<PublicPlaylistPage> {
  return apiFetch<PublicPlaylistPage>(
    `/v1/public/playlists/${encodeURIComponent(slug)}`,
  );
}

export async function getPopularTracks(
  limit = 7,
): Promise<{ tracks: PublicTrackSummary[] }> {
  return apiFetch<{ tracks: PublicTrackSummary[] }>(
    `/v1/public/discover/popular?limit=${limit}`,
  );
}

export async function getPopularArtists(
  limit = 6,
): Promise<{ artists: PublicArtistSummary[] }> {
  return apiFetch<{ artists: PublicArtistSummary[] }>(
    `/v1/public/artists/popular?limit=${limit}`,
  );
}

export async function getTrendingArtists(
  limit = 3,
): Promise<{ artists: PublicArtistSummary[] }> {
  return apiFetch<{ artists: PublicArtistSummary[] }>(
    `/v1/public/artists/trending?limit=${limit}`,
  );
}

export async function getRecentlyPlayedTracks(
  limit = 5,
  accessToken?: string | null,
): Promise<{ tracks: PublicTrackSummary[] }> {
  return apiFetch<{ tracks: PublicTrackSummary[] }>(
    `/v1/public/discover/recently-played?limit=${limit}`,
    { accessToken },
  );
}

export async function searchCatalog(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<PublicSearchResults> {
  if (query.trim() === "") {
    return mockSearchResults("");
  }

  return apiFetch<PublicSearchResults>(
    `/v1/public/search?q=${encodeURIComponent(query)}&limit=8`,
    { signal: options?.signal },
  );
}
