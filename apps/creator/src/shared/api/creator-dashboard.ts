import type { MicboxxSession, MicboxxSessionUser } from "@/contracts/micboxx";
import type {
  AlbumMetadataUpdate,
  CreatorAnalyticsPayload,
  DashboardAlbum,
  DashboardAlbumList,
  DashboardAlbumOptions,
  DashboardRoomList,
  DashboardTrack,
  DashboardTrackList,
  DashboardUploadOptions,
  DashboardUserProfile,
  TrackMetadataUpdate,
  UserProfileUpdate,
} from "@/contracts/creator";
import { env } from "@/config/env";
import { ensureFreshSession } from "@/features/auth/api";

type CreatorEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

export class CreatorApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = "CreatorApiError";
  }
}

function buildFallbackProfile(user: MicboxxSessionUser): DashboardUserProfile {
  const canRequestVerification = user.permissions.canUploadTracks;

  return {
    id: user.id,
    uuid: user.uuid,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: null,
    links: {
      website: null,
      instagram: null,
      facebook: null,
      twitter: null,
    },
    flags: {
      artistProfile: user.permissions.canUploadTracks,
      verifiedBadge: false,
      emailVerified: true,
    },
    verification: {
      status: "not_requested",
      verifiedBadge: false,
      eligible: canRequestVerification,
      canRequest: canRequestVerification,
      requestedAt: null,
      reviewedAt: null,
      reviewedByUserId: null,
      reason: canRequestVerification
        ? null
        : "Only artist profiles can request verification.",
    },
  };
}

async function getAccessToken(
  accessToken?: string | null,
): Promise<string | null> {
  const session = await ensureFreshSession();
  return session?.accessToken ?? accessToken ?? null;
}

async function creatorFetch<T>(
  path: string,
  init?: RequestInit & {
    accessToken?: string | null;
  },
): Promise<T> {
  const liveAccessToken = await getAccessToken(init?.accessToken);
  if (!liveAccessToken) {
    throw new CreatorApiError("Sign in again to continue.", 401);
  }

  if (!env.drupalBaseUrl) {
    throw new CreatorApiError("Missing EXPO_PUBLIC_DRUPAL_BASE_URL.", 500);
  }

  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  headers.set("authorization", `Bearer ${liveAccessToken}`);

  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${env.drupalBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as CreatorEnvelope<T>;
  if (!response.ok) {
    throw new CreatorApiError(
      payload.error?.message ?? `Creator API request failed with ${response.status}.`,
      response.status,
    );
  }

  if (payload.data !== undefined) {
    return payload.data;
  }

  return payload as T;
}

export async function getUploadOptions(): Promise<DashboardUploadOptions> {
  return creatorFetch<DashboardUploadOptions>("/v1/dashboard/upload-options");
}

export async function getUserProfile(
  sessionUser?: MicboxxSession["user"],
): Promise<DashboardUserProfile> {
  try {
    const response = await creatorFetch<{ profile: DashboardUserProfile }>(
      "/v1/dashboard/user/profile",
    );
    return response.profile;
  } catch (error) {
    if (
      error instanceof CreatorApiError &&
      error.status === 401
    ) {
      throw error;
    }

    if (sessionUser) {
      return buildFallbackProfile(sessionUser);
    }

    throw error;
  }
}

export async function updateUserProfile(
  payload: UserProfileUpdate,
): Promise<DashboardUserProfile> {
  const response = await creatorFetch<{ profile: DashboardUserProfile }>(
    "/v1/dashboard/user/profile",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.profile;
}

export async function replaceUserAvatar(
  formData: FormData,
): Promise<DashboardUserProfile> {
  const response = await creatorFetch<{ profile: DashboardUserProfile }>(
    "/v1/dashboard/user/avatar",
    {
      method: "POST",
      body: formData,
    },
  );

  return response.profile;
}

export async function replaceUserCover(
  formData: FormData,
): Promise<DashboardUserProfile> {
  const response = await creatorFetch<{ profile: DashboardUserProfile }>(
    "/v1/dashboard/user/cover",
    {
      method: "POST",
      body: formData,
    },
  );

  return response.profile;
}

export async function requestArtistVerification(): Promise<DashboardUserProfile> {
  const response = await creatorFetch<{ profile: DashboardUserProfile }>(
    "/v1/dashboard/user/verification-request",
    { method: "POST" },
  );

  return response.profile;
}

export async function getCreatorAnalytics(
  period: "7d" | "30d" | "90d" = "30d",
): Promise<CreatorAnalyticsPayload> {
  return creatorFetch<CreatorAnalyticsPayload>(
    `/v1/dashboard/analytics/summary?period=${period}`,
  );
}

export async function getMyTracks(
  page = 1,
  pageSize = 12,
): Promise<DashboardTrackList> {
  return creatorFetch<DashboardTrackList>(
    `/v1/dashboard/tracks?page=${page}&pageSize=${pageSize}`,
  );
}

export async function getTrackStatus(
  trackId: string | number,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}/status`,
  );

  return response.track;
}

export async function createTrackUpload(
  formData: FormData,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    "/v1/dashboard/tracks",
    {
      method: "POST",
      body: formData,
    },
  );

  return response.track;
}

export async function updateTrackMetadata(
  trackId: string | number,
  payload: TrackMetadataUpdate,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.track;
}

export async function publishTrack(
  trackId: string | number,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}/publish`,
    { method: "POST" },
  );

  return response.track;
}

export async function unpublishTrack(
  trackId: string | number,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}/unpublish`,
    { method: "POST" },
  );

  return response.track;
}

export async function scheduleTrack(
  trackId: string | number,
  publishAt: number,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}/schedule`,
    {
      method: "POST",
      body: JSON.stringify({ publish_at: publishAt }),
    },
  );

  return response.track;
}

export async function unscheduleTrack(
  trackId: string | number,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}/unschedule`,
    { method: "POST" },
  );

  return response.track;
}

export async function requeueTrack(
  trackId: string | number,
): Promise<DashboardTrack> {
  const response = await creatorFetch<{ track: DashboardTrack }>(
    `/v1/dashboard/tracks/${trackId}/requeue`,
    { method: "POST" },
  );

  return response.track;
}

export async function getAlbumOptions(): Promise<DashboardAlbumOptions> {
  return creatorFetch<DashboardAlbumOptions>("/v1/dashboard/albums/options");
}

export async function getMyAlbums(
  page = 1,
  pageSize = 12,
): Promise<DashboardAlbumList> {
  return creatorFetch<DashboardAlbumList>(
    `/v1/dashboard/albums?page=${page}&pageSize=${pageSize}`,
  );
}

export async function getMyRooms(
  page = 1,
  pageSize = 50,
): Promise<DashboardRoomList> {
  return creatorFetch<DashboardRoomList>(
    `/v1/dashboard/rooms?page=${page}&pageSize=${pageSize}`,
  );
}

export async function getAlbumStatus(
  albumId: string | number,
): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    `/v1/dashboard/albums/${albumId}`,
  );

  return response.album;
}

export async function createAlbum(formData: FormData): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    "/v1/dashboard/albums",
    {
      method: "POST",
      body: formData,
    },
  );

  return response.album;
}

export async function updateAlbumMetadata(
  albumId: string | number,
  payload: AlbumMetadataUpdate,
): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    `/v1/dashboard/albums/${albumId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.album;
}

export async function publishAlbum(
  albumId: string | number,
): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    `/v1/dashboard/albums/${albumId}/publish`,
    { method: "POST" },
  );

  return response.album;
}

export async function unpublishAlbum(
  albumId: string | number,
): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    `/v1/dashboard/albums/${albumId}/unpublish`,
    { method: "POST" },
  );

  return response.album;
}

export async function scheduleAlbum(
  albumId: string | number,
  publishAt: number,
): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    `/v1/dashboard/albums/${albumId}/schedule`,
    {
      method: "POST",
      body: JSON.stringify({ publish_at: publishAt }),
    },
  );

  return response.album;
}

export async function unscheduleAlbum(
  albumId: string | number,
): Promise<DashboardAlbum> {
  const response = await creatorFetch<{ album: DashboardAlbum }>(
    `/v1/dashboard/albums/${albumId}/unschedule`,
    { method: "POST" },
  );

  return response.album;
}
