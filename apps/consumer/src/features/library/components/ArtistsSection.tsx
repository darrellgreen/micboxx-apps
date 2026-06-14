import { useRouter } from "expo-router";
import type { LibraryFollowedArtist } from "../libraryTypes";
import { EmptyLine, LibraryRow, Section } from "./library-shared";

interface ArtistsSectionProps {
  followedArtists: LibraryFollowedArtist[];
}

export function ArtistsSection({ followedArtists }: ArtistsSectionProps) {
  const router = useRouter();

  return (
    <Section title="Followed Artists">
      {followedArtists.map((artist, i) => (
        <LibraryRow
          key={`artist-${artist.id}`}
          title={artist.displayName}
          subtitle={`@${artist.username}`}
          meta="Followed artist"
          artwork={artist.avatar}
          roundArtwork
          isLast={i === followedArtists.length - 1}
          onPress={() => router.push(`/user/${encodeURIComponent(artist.username)}` as never)}
        />
      ))}
      {followedArtists.length === 0 ? <EmptyLine text="No followed artists yet." /> : null}
    </Section>
  );
}
