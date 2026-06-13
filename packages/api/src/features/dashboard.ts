import type {
    DashboardPlaylist,
    DashboardPlaylistList,
} from "@micboxx/contracts";
import type {
    CommerceOrderHistoryEntry,
    EntitlementState,
    PublicSubscriptionPlan,
} from "@micboxx/contracts";
import { getMicboxxApiConfig } from "../config";
import { apiFetch } from "../client";

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
  const response = await apiFetch<{ data: { plans: PublicSubscriptionPlan[] } }>(
    `/v1/public/commerce/subscription-plans`,
  );

  return response.data?.plans ?? [];
}
