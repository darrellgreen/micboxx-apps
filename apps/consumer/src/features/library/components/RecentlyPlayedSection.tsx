import { useRouter } from "expo-router";
import type { LibraryRecentlyPlayedTrack } from "../libraryTypes";
import { EmptyLine, LibraryRow, Section } from "./library-shared";

interface RecentlyPlayedSectionProps {
  tracks: LibraryRecentlyPlayedTrack[];
}

export function RecentlyPlayedSection({ tracks }: RecentlyPlayedSectionProps) {
  const router = useRouter();

  return (
    <Section title="Recently Played">
      {tracks.map((track, i) => (
        <LibraryRow
          key={`recent-${track.uuid}`}
          title={track.title}
          subtitle={track.artistName}
          meta="Recent play"
          artwork={track.artwork}
          isLast={i === tracks.length - 1}
          onPress={() => router.push(`/track/${encodeURIComponent(track.slug)}` as never)}
        />
      ))}
      {tracks.length === 0 ? <EmptyLine text="No recent plays yet." /> : null}
    </Section>
  );
}
