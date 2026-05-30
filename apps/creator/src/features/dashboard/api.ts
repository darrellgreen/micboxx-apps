import type {
    DashboardPlaylist,
    DashboardPlaylistList,
} from "@micboxx/contracts";
import type {
    EntitlementState,
    PublicSubscriptionPlan,
} from "@micboxx/contracts";
import { ensureFreshSession } from "@/features/auth/api";
import { apiFetch } from "@/lib/api/client";

export async function getMyPlaylists(
  page = 1,
  pageSize = 24,
  accessToken?: string | null,
): Promise<DashboardPlaylistList> {
  const session = await ensureFreshSession();
  const liveAccessToken = session?.accessToken ?? accessToken ?? null;

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
  const session = await ensureFreshSession();
  const liveAccessToken = session?.accessToken ?? accessToken ?? null;

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
  const session = await ensureFreshSession();
  const liveAccessToken = session?.accessToken ?? accessToken ?? null;

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

export async function getPublicSubscriptionPlans(): Promise<
  PublicSubscriptionPlan[]
> {
  const response = await apiFetch<{ plans: PublicSubscriptionPlan[] }>(
    `/v1/public/commerce/subscription-plans`,
  );

  return response.plans ?? [];
}
