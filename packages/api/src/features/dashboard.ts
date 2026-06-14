import type {
    DashboardPlaylist,
    DashboardPlaylistList,
    DashboardPlaylistOptions,
    DashboardPlaylistTrackOption,
} from "@micboxx/contracts";
import type {
    CommerceOrderHistoryEntry,
    EntitlementState,
    PublicSubscriptionPlan,
} from "@micboxx/contracts";
import { getMicboxxApiConfig } from "../config";
import { apiFetch } from "../client";
import { mockDiscoverTracks, mockSession } from "../mock-data";


export async function getMyPlaylists(
  page = 1,
  pageSize = 24,
  accessToken?: string | null,
): Promise<DashboardPlaylistList> {
  const sessionToken = await getMicboxxApiConfig().getToken();
  const liveAccessToken = sessionToken ?? accessToken ?? null;

  if (!liveAccessToken) {
    throw new Error("Sign in again to load your playlists.");
  }

  return apiFetch<DashboardPlaylistList>(
    `/v1/dashboard/playlists?page=${page}&pageSize=${pageSize}`,
    { accessToken: liveAccessToken },
  );
}

export async function getDashboardPlaylist(
  playlistId: string | number,
  accessToken?: string | null,
): Promise<DashboardPlaylist> {
  const sessionToken = await getMicboxxApiConfig().getToken();
  const liveAccessToken = sessionToken ?? accessToken ?? null;

  if (!liveAccessToken) {
    throw new Error("Sign in again to load your playlist.");
  }

  const response = await apiFetch<{ playlist: DashboardPlaylist }>(
    `/v1/dashboard/playlists/${playlistId}`,
    { accessToken: liveAccessToken },
  );

  return response.playlist;
}

export async function getCurrentEntitlements(
  accessToken?: string | null,
): Promise<EntitlementState | null> {
  const sessionToken = await getMicboxxApiConfig().getToken();
  const liveAccessToken = sessionToken ?? accessToken ?? null;

  if (!liveAccessToken) {
    return null;
  }

  const response = await apiFetch<{
    entitlementState: EntitlementState | null;
  }>(`/v1/dashboard/commerce/entitlements/current`, {
    accessToken: liveAccessToken,
  });

  return response.entitlementState;
}

export async function getOrderHistory(
  limit = 100,
  accessToken?: string | null,
): Promise<CommerceOrderHistoryEntry[]> {
  const sessionToken = await getMicboxxApiConfig().getToken();
  const liveAccessToken = sessionToken ?? accessToken ?? null;

  if (!liveAccessToken) {
    throw new Error("Sign in again to load your purchases.");
  }

  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(100, Math.trunc(limit)))
    : 100;
  const response = await apiFetch<{ orders: CommerceOrderHistoryEntry[] }>(
    `/v1/dashboard/commerce/orders?limit=${encodeURIComponent(String(normalizedLimit))}`,
    { accessToken: liveAccessToken },
  );

  return response.orders ?? [];
}

export async function getPublicSubscriptionPlans(): Promise<
  PublicSubscriptionPlan[]
> {
  const response = await apiFetch<{ plans: PublicSubscriptionPlan[] }>(
    `/v1/public/commerce/subscription-plans`,
  );

  return response.plans ?? [];
}

function mapPublicTrackToOption(track: any): DashboardPlaylistTrackOption {
  return {
    id: track.id,
    title: track.title,
    slug: track.slug,
    duration: track.duration,
    artist: track.artist ? {
      id: track.artist.id,
      displayName: track.artist.displayName,
      verifiedBadge: track.artist.verifiedBadge,
    } : null,
    genre: track.genre ? {
      id: track.genre.id,
      name: track.genre.name,
    } : null,
    album: track.album ? {
      id: track.album.id,
      title: track.album.title,
    } : null,
    status: {
      published: true,
      processing: "ready",
      ready: true,
      publicReady: true,
      reason: null,
    },
    eligibility: {
      canAdd: true,
      reason: null,
    },
    artworkUrl: track.artworkUrl,
    href: track.href,
  };
}

export async function getPlaylistOptions(
  accessToken?: string | null,
): Promise<DashboardPlaylistOptions> {
  if (getMicboxxApiConfig().useFixtures) {
    return {
      currentUser: {
        id: mockSession.user.id,
        uuid: mockSession.user.uuid,
        username: mockSession.user.username,
        displayName: mockSession.user.displayName,
        email: mockSession.user.email,
        roles: mockSession.user.roles,
      },
      tracks: mockDiscoverTracks.tracks.map(mapPublicTrackToOption),
    };
  }

  const sessionToken = await getMicboxxApiConfig().getToken();
  const liveAccessToken = sessionToken ?? accessToken ?? null;

  if (!liveAccessToken) {
    throw new Error("Sign in again to load playlist options.");
  }

  return apiFetch<DashboardPlaylistOptions>(
    "/v1/dashboard/playlists/options",
    { accessToken: liveAccessToken },
  );
}

export async function createPlaylist(
  formData: FormData,
  accessToken?: string | null,
): Promise<DashboardPlaylist> {
  if (getMicboxxApiConfig().useFixtures) {
    const title = (formData.get("title") as string) || "Mock Playlist";
    const description = (formData.get("description") as string) || "";
    const trackIds = formData.getAll("trackIds[]").map(Number);
    const mockId = Math.floor(Math.random() * 1000) + 200;

    const mockCreatedPlaylist: DashboardPlaylist = {
      id: mockId,
      uuid: `mock-playlist-${mockId}`,
      slug: `mock-playlist-${mockId}`,
      title,
      description,
      artworkUrl: "https://i.pravatar.cc/120?u=mockplaylist",
      publicHref: `/playlist/mock-playlist-${mockId}`,
      counts: {
        tracks: trackIds.length,
        publicReadyTracks: trackIds.length,
        blockedTracks: 0,
        duration: trackIds.length * 240,
      },
      owner: {
        id: mockSession.user.id,
        displayName: mockSession.user.displayName,
      },
      status: {
        published: false,
        canPublish: true,
        canUnpublish: false,
      },
      tracks: trackIds.map((id, index) => {
        const found = mockDiscoverTracks.tracks.find((t) => t.id === id);
        return {
          trackId: id,
          title: found?.title ?? `Mock Track ${id}`,
          slug: found?.slug ?? `mock-track-${id}`,
          duration: found?.duration ?? 240,
          artist: found?.artist ? {
            id: found.artist.id,
            displayName: found.artist.displayName,
          } : null,
          genre: found?.genre ? {
            id: found.genre.id,
            name: found.genre.name,
          } : null,
          album: found?.album ? {
            id: found.album.id,
            title: found.album.title,
          } : null,
          artworkUrl: found?.artworkUrl ?? null,
          status: {
            published: true,
            processing: "ready" as any,
            ready: true,
            publicReady: true,
            reason: null,
          },
          isPublicReady: true,
          publicHref: found?.href ?? null,
          position: index + 1,
        };
      }),
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      permissions: {
        canEdit: true,
        canPublish: true,
        canDelete: true,
        canAddTracks: true,
        canRemoveTracks: true,
        canReorderTracks: true,
      },
      href: `/v1/dashboard/playlists/${mockId}`,
    };

    return mockCreatedPlaylist;
  }

  const sessionToken = await getMicboxxApiConfig().getToken();
  const liveAccessToken = sessionToken ?? accessToken ?? null;

  if (!liveAccessToken) {
    throw new Error("Sign in again to create a playlist.");
  }

  const response = await apiFetch<{ playlist: DashboardPlaylist }>(
    `/v1/dashboard/playlists`,
    {
      method: "POST",
      body: formData,
      accessToken: liveAccessToken,
    },
  );

  return response.playlist;
}

