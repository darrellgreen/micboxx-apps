import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { addTrackToPlaylist, getMyPlaylists } from "@micboxx/api";
import { BottomActionSheet, type BottomActionSheetItem } from "@micboxx/ui";
import type { DashboardPlaylistSummary } from "@micboxx/contracts";

interface AddToPlaylistSheetProps {
  visible: boolean;
  trackId: number;
  accessToken: string | null | undefined;
  onClose: () => void;
}

export function AddToPlaylistSheet({ visible, trackId, accessToken, onClose }: AddToPlaylistSheetProps) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<DashboardPlaylistSummary[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!visible || !accessToken) return;
    getMyPlaylists(1, 50, accessToken)
      .then((res) => setPlaylists(res.playlists))
      .catch(() => setPlaylists([]));
  }, [visible, accessToken]);

  async function handleAdd(playlist: DashboardPlaylistSummary) {
    if (adding) return;
    setAdding(true);
    try {
      await addTrackToPlaylist(playlist.id, trackId, accessToken);
      Alert.alert("Added", `Added to "${playlist.title}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Error", msg);
    } finally {
      setAdding(false);
    }
  }

  const items: BottomActionSheetItem[] = [
    {
      key: "create-new",
      label: "Create new playlist",
      icon: "add-circle-outline",
      onPress: () => {
        onClose();
        router.push("/playlist/create" as never);
      },
    },
    ...playlists.map((p) => ({
      key: `playlist-${p.id}`,
      label: p.title,
      imageUrl: p.artworkUrl,
      onPress: () => {
        onClose();
        void handleAdd(p);
      },
    })),
  ];

  return (
    <BottomActionSheet
      visible={visible}
      title="Add to playlist"
      items={items}
      onClose={onClose}
    />
  );
}
