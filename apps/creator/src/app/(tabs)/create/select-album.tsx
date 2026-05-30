import { router } from "expo-router";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { EmptyState, Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function SelectAlbumScreen() {
  const bootstrap = useCreatorBootstrap();
  const albums = bootstrap.uploadOptions?.albums ?? [];

  return (
    <ScreenShell title="Choose album" subtitle="Track uploads must be attached to an existing album in the current MicBoxx backend.">
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
    </ScreenShell>
  );
}
