import { useRouter } from "expo-router";
import type { LibrarySavedTrack } from "../libraryTypes";
import { EmptyLine, LibraryRow, Section } from "./library-shared";

interface SavedSectionProps {
  savedTracks: LibrarySavedTrack[];
  unavailableDomains: string[];
}

export function SavedSection({ savedTracks, unavailableDomains }: SavedSectionProps) {
  const router = useRouter();

  return (
    <Section title="Saved">
      {savedTracks.map((track, i) => (
        <LibraryRow
          key={`saved-track-${track.uuid}`}
          title={track.title}
          subtitle={track.artistName}
          meta="Saved track"
          artwork={track.artwork}
          isLast={i === savedTracks.length - 1}
          onPress={() => router.push(`/track/${encodeURIComponent(track.uuid)}` as never)}
        />
      ))}
      {savedTracks.length === 0 ? (
        <EmptyLine
          text={
            unavailableDomains.includes("Saved albums")
              ? "No saved tracks yet. Saved albums are not available from a verified backend route."
              : "No saved items yet."
          }
        />
      ) : null}
    </Section>
  );
}
