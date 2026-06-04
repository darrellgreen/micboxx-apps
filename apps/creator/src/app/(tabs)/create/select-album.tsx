import { router } from "expo-router";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { EmptyState, Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function SelectAlbumScreen() {
  const bootstrap = useCreatorBootstrap();
  const albums = bootstrap.uploadOptions?.albums ?? [];

  return (
    <Screen
      header={<AppHeader variant="detail" title="Select Album" fallbackRoute="/(tabs)/create" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {albums.length === 0 ? (
        <EmptyState title="No albums yet" description="Create an album first, then return here to upload a track." />
      ) : (
        albums.map((album) => (
          <Panel key={album.id} title={album.title} description={album.published ? "Published album" : "Draft album"}>
            <PillButton label="Upload into this album" tone="accent" onPress={() => router.push(`/create/upload?albumId=${album.id}` as never)} />
          </Panel>
        ))
      )}
      <PillButton label="Create album" onPress={() => router.push("/create/album")} />
    </Screen>
  );
}
