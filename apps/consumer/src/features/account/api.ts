import { env } from "@/config/env";
import { getRecentlyPlayedTracks } from "@micboxx/api";
import { ensureFreshSession } from "@/features/auth/api";
import type { MicboxxSession, PublicTrackSummary } from "@micboxx/contracts";

async function authedFetch(
  accessToken: string,
  session: MicboxxSession | null | undefined,
  input: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${accessToken}` },
  });

  if (response.status !== 401 || !session) {
    return response;
  }

  const fresh = await ensureFreshSession(session);
  const freshToken = fresh?.accessToken ?? accessToken;
  return fetch(input, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${freshToken}` },
  });
}

export async function fetchRecentlyPlayed(
  limit: number,
  accessToken: string,
  session?: MicboxxSession | null,
): Promise<PublicTrackSummary[]> {
  try {
    const { tracks } = await getRecentlyPlayedTracks(limit, accessToken);
    return tracks;
  } catch {
    const fresh = await ensureFreshSession(session);
    const { tracks } = await getRecentlyPlayedTracks(limit, fresh?.accessToken ?? accessToken);
    return tracks;
  }
}

export interface DashboardVerificationState {
  status: "not_requested" | "pending" | "verified" | "rejected" | "revoked";
  verifiedBadge: boolean;
  eligible: boolean;
  canRequest: boolean;
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  reviewNote: string | null;
  reason: string | null;
}

export interface DashboardUserProfile {
  id: number;
  uuid: string;
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  links: {
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
  };
  flags: {
    artistProfile: boolean;
    verifiedBadge: boolean;
    emailVerified: boolean;
  };
  verification: DashboardVerificationState;
}

async function safeParseProfileResponse(response: Response, defaultError: string): Promise<DashboardUserProfile> {
  if (response.status === 401) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const text = await response.text();
  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response (status ${response.status}).`);
  }

  if (!response.ok || !payload?.data?.profile) {
    throw new Error(payload?.error?.message ?? `${defaultError} (status ${response.status})`);
  }

  return payload.data.profile;
}

export async function fetchUserProfile(
  accessToken: string,
  session?: MicboxxSession | null,
): Promise<DashboardUserProfile> {
  const response = await authedFetch(accessToken, session, `${env.drupalBaseUrl}/v1/dashboard/user/profile`, {
    headers: { accept: "application/json" },
  });

  return safeParseProfileResponse(response, "Unable to fetch user profile.");
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export async function updateUserProfile(
  accessToken: string,
  data: UpdateProfilePayload,
  session?: MicboxxSession | null,
): Promise<DashboardUserProfile> {
  const response = await authedFetch(accessToken, session, `${env.drupalBaseUrl}/v1/dashboard/user/profile`, {
    method: "PATCH",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(data),
  });

  return safeParseProfileResponse(response, "Unable to update profile.");
}

export async function uploadUserAvatar(
  accessToken: string,
  fileUri: string,
  filename: string,
  session?: MicboxxSession | null,
): Promise<DashboardUserProfile> {
  const formData = new FormData();
  const extension = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const type = extension === "png" ? "image/png" : "image/jpeg";

  // @ts-ignore
  formData.append("avatar", { uri: fileUri, name: filename, type });

  const response = await authedFetch(accessToken, session, `${env.drupalBaseUrl}/v1/dashboard/user/avatar`, {
    method: "POST",
    headers: { accept: "application/json" },
    body: formData,
  });

  return safeParseProfileResponse(response, "Unable to upload avatar image.");
}

export async function uploadUserCover(
  accessToken: string,
  fileUri: string,
  filename: string,
  session?: MicboxxSession | null,
): Promise<DashboardUserProfile> {
  const formData = new FormData();
  const extension = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const type = extension === "png" ? "image/png" : "image/jpeg";

  // @ts-ignore
  formData.append("cover", { uri: fileUri, name: filename, type });

  const response = await authedFetch(accessToken, session, `${env.drupalBaseUrl}/v1/dashboard/user/cover`, {
    method: "POST",
    headers: { accept: "application/json" },
    body: formData,
  });

  return safeParseProfileResponse(response, "Unable to upload cover image.");
}
