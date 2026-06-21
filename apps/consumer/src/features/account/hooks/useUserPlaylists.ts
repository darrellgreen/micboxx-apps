import { useEffect } from "react";
import { useGetMyPlaylistsQuery } from "@micboxx/api";
import {
  getCachedUserPlaylists,
  setCachedUserPlaylists,
} from "@/features/account/profile-cache";

export function useUserPlaylists(accessToken: string, userUuid: string) {
  const cachedPlaylists = getCachedUserPlaylists(userUuid);
  const { data, isLoading } = useGetMyPlaylistsQuery({ accessToken });

  useEffect(() => {
    if (data?.playlists) {
      setCachedUserPlaylists(userUuid, data.playlists);
    }
  }, [data?.playlists, userUuid]);

  return {
    playlists: data?.playlists ?? cachedPlaylists ?? [],
    loading: isLoading && cachedPlaylists === null,
  };
}
