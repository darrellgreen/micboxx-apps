import type { LibraryOwnedAlbum, LibraryOwnedTrack } from "../libraryTypes";
import { EmptyLine, LibraryRow, Section } from "./library-shared";

interface PurchasedSectionProps {
  ownedAlbums: LibraryOwnedAlbum[];
  ownedTracks: LibraryOwnedTrack[];
}

export function PurchasedSection({ ownedAlbums, ownedTracks }: PurchasedSectionProps) {
  return (
    <Section title="Purchased">
      {ownedAlbums.map((album, i) => (
        <LibraryRow
          key={`owned-album-${album.uuid}`}
          title={album.title}
          subtitle={album.artistName || "Purchased album"}
          meta="Purchased album"
          artwork={album.artwork}
          isLast={ownedTracks.length === 0 && i === ownedAlbums.length - 1}
        />
      ))}
      {ownedTracks.map((track, i) => (
        <LibraryRow
          key={`owned-track-${track.uuid}`}
          title={track.title}
          subtitle={track.artistName || "Purchased track"}
          meta="Purchased track"
          artwork={track.artwork}
          isLast={i === ownedTracks.length - 1}
        />
      ))}
      {ownedAlbums.length + ownedTracks.length === 0 ? (
        <EmptyLine text="No purchased music yet." />
      ) : null}
    </Section>
  );
}
