import { env, shouldUseLocalWebFixtures } from "@/config/env";
import type {
    PublicAlbumPage,
    PublicArtistPage,
    PublicArtistSummary,
    PublicPlaylistPage,
    PublicSearchResults,
    PublicTrackList,
    PublicTrackPage,
    PublicTrackSummary,
} from "@micboxx/contracts";
import { apiFetch } from "@/lib/api/client";
import {
    mockAlbumPage,
    mockArtistPage,
    mockDiscoverTracks,
    mockPlaylistPage,
    mockPopularTracks,
    mockRecentlyPlayedTracks,
    mockSearchResults,
    mockTrackPages,
} from "@/lib/mock-data";

function shouldUseFixtures(): boolean {
  return shouldUseLocalWebFixtures() || env.drupalBaseUrl.length === 0;
}

function uniqueFixtureArtists(limit: number): PublicArtistSummary[] {
  const seen = new Set<number>();
  const artists: PublicArtistSummary[] = [];

  for (const track of mockPopularTracks) {
    if (!track.artist || seen.has(track.artist.id)) continue;
    seen.add(track.artist.id);
    artists.push(track.artist);
    if (artists.length >= limit) break;
  }

  return artists;
}

export async function getDiscoverTracks(): Promise<PublicTrackList> {
  if (shouldUseFixtures()) {
    return mockDiscoverTracks;
  }

  return apiFetch<PublicTrackList>("/v1/public/tracks?page=1&pageSize=12");
}

export async function getTrackPage(slug: string): Promise<PublicTrackPage> {
  if (shouldUseFixtures()) {
    const fixture = mockTrackPages[slug];
    if (!fixture) {
      throw new Error(`Track not found for slug: ${slug}`);
    }

    return fixture;
  }

  return apiFetch<PublicTrackPage>(
    `/v1/public/tracks/${encodeURIComponent(slug)}`,
  );
}

export async function getAlbumPage(slug: string): Promise<PublicAlbumPage> {
  if (shouldUseFixtures()) {
    return mockAlbumPage;
  }

  return apiFetch<PublicAlbumPage>(
    `/v1/public/albums/${encodeURIComponent(slug)}`,
  );
}

export async function getArtistPage(
  username: string,
): Promise<PublicArtistPage> {
  if (shouldUseFixtures()) {
    return mockArtistPage;
  }

  return apiFetch<PublicArtistPage>(
    `/v1/public/users/${encodeURIComponent(username)}`,
  );
}

export const getUserPage = getArtistPage;

export async function getPlaylistPage(
  slug: string,
): Promise<PublicPlaylistPage> {
  if (shouldUseFixtures()) {
    return mockPlaylistPage;
  }

  return apiFetch<PublicPlaylistPage>(
    `/v1/public/playlists/${encodeURIComponent(slug)}`,
  );
}

export async function getPopularTracks(
  limit = 7,
): Promise<{ tracks: PublicTrackSummary[] }> {
  if (shouldUseFixtures()) {
    return { tracks: mockPopularTracks.slice(0, limit) };
  }

  return apiFetch<{ tracks: PublicTrackSummary[] }>(
    `/v1/public/discover/popular?limit=${limit}`,
  );
}

export async function getFeaturedTracks(
  limit = 8,
): Promise<{ tracks: PublicTrackSummary[] }> {
  if (shouldUseFixtures()) {
    return { tracks: mockDiscoverTracks.tracks.slice(0, limit) };
  }

  return apiFetch<{ tracks: PublicTrackSummary[] }>(
    `/v1/public/discover/featured?limit=${limit}`,
  );
}

export async function getPopularArtists(
  limit = 6,
): Promise<{ artists: PublicArtistSummary[] }> {
  if (shouldUseFixtures()) {
    return { artists: uniqueFixtureArtists(limit) };
  }

  return apiFetch<{ artists: PublicArtistSummary[] }>(
    `/v1/public/artists/popular?limit=${limit}`,
  );
}

export async function getTrendingArtists(
  limit = 3,
): Promise<{ artists: PublicArtistSummary[] }> {
  if (shouldUseFixtures()) {
    return { artists: uniqueFixtureArtists(limit) };
  }

  return apiFetch<{ artists: PublicArtistSummary[] }>(
    `/v1/public/artists/trending?limit=${limit}`,
  );
}

export async function getRecentlyPlayedTracks(
  limit = 5,
  accessToken?: string | null,
): Promise<{ tracks: PublicTrackSummary[] }> {
  if (shouldUseFixtures()) {
    return { tracks: mockRecentlyPlayedTracks.slice(0, limit) };
  }

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

  if (shouldUseFixtures()) {
    return mockSearchResults(query);
  }

  return apiFetch<PublicSearchResults>(
    `/v1/public/search?q=${encodeURIComponent(query)}&limit=8`,
    { signal: options?.signal },
  );
}
