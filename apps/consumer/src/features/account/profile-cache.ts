import type { DashboardUserProfile } from "@/features/account/api";
import type { RoomHistoryEntry } from "@micboxx/api";
import type {
  DashboardPlaylistSummary,
  PublicTrackSummary,
} from "@micboxx/contracts";

const userProfileCache = new Map<string, DashboardUserProfile>();
const recentlyPlayedCache = new Map<string, PublicTrackSummary[]>();
const userPlaylistsCache = new Map<string, DashboardPlaylistSummary[]>();
const roomHistoryCache = new Map<string, RoomHistoryEntry[]>();

export function getCachedUserProfile(userUuid: string): DashboardUserProfile | null {
  return userProfileCache.get(userUuid) ?? null;
}

export function setCachedUserProfile(
  userUuid: string,
  profile: DashboardUserProfile,
): void {
  userProfileCache.set(userUuid, profile);
}

export function getCachedRecentlyPlayed(
  userUuid: string,
): PublicTrackSummary[] | null {
  return recentlyPlayedCache.get(userUuid) ?? null;
}

export function setCachedRecentlyPlayed(
  userUuid: string,
  tracks: PublicTrackSummary[],
): void {
  recentlyPlayedCache.set(userUuid, tracks);
}

export function getCachedUserPlaylists(
  userUuid: string,
): DashboardPlaylistSummary[] | null {
  return userPlaylistsCache.get(userUuid) ?? null;
}

export function setCachedUserPlaylists(
  userUuid: string,
  playlists: DashboardPlaylistSummary[],
): void {
  userPlaylistsCache.set(userUuid, playlists);
}

export function getCachedRoomHistory(
  userUuid: string,
): RoomHistoryEntry[] | null {
  return roomHistoryCache.get(userUuid) ?? null;
}

export function setCachedRoomHistory(
  userUuid: string,
  rooms: RoomHistoryEntry[],
): void {
  roomHistoryCache.set(userUuid, rooms);
}
