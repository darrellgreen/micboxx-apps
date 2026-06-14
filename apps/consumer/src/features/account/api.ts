import { env } from "@/config/env";

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

export async function fetchUserProfile(accessToken: string): Promise<DashboardUserProfile> {
  const response = await fetch(`${env.drupalBaseUrl}/v1/dashboard/user/profile`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
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
): Promise<DashboardUserProfile> {
  const response = await fetch(`${env.drupalBaseUrl}/v1/dashboard/user/profile`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  return safeParseProfileResponse(response, "Unable to update profile.");
}

export async function uploadUserAvatar(
  accessToken: string,
  fileUri: string,
  filename: string,
): Promise<DashboardUserProfile> {
  const formData = new FormData();
  const extension = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const type = extension === "png" ? "image/png" : "image/jpeg";

  // @ts-ignore
  formData.append("avatar", {
    uri: fileUri,
    name: filename,
    type,
  });

  const response = await fetch(`${env.drupalBaseUrl}/v1/dashboard/user/avatar`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  return safeParseProfileResponse(response, "Unable to upload avatar image.");
}

export async function uploadUserCover(
  accessToken: string,
  fileUri: string,
  filename: string,
): Promise<DashboardUserProfile> {
  const formData = new FormData();
  const extension = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const type = extension === "png" ? "image/png" : "image/jpeg";

  // @ts-ignore
  formData.append("cover", {
    uri: fileUri,
    name: filename,
    type,
  });

  const response = await fetch(`${env.drupalBaseUrl}/v1/dashboard/user/cover`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  return safeParseProfileResponse(response, "Unable to upload cover image.");
}
