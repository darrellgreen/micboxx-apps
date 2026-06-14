import { useGetMyPlaylistsQuery } from "@micboxx/api";

export function useUserPlaylists(accessToken: string) {
  const { data, isLoading } = useGetMyPlaylistsQuery({ accessToken });
  return { playlists: data?.playlists ?? [], loading: isLoading };
}
