import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { formatRelativeTime } from "@micboxx/api";
import { tokens } from "@micboxx/theme";
import type { LibraryPlaylist } from "../libraryTypes";
import { EmptyLine, LibraryRow, Section, s } from "./library-shared";

interface PlaylistsSectionProps {
  playlists: LibraryPlaylist[];
}

export function PlaylistsSection({ playlists }: PlaylistsSectionProps) {
  const router = useRouter();

  return (
    <Section
      title="Playlists"
      action={
        <Pressable
          onPress={() => router.push("/playlist/create")}
          style={({ pressed }) => [s.headerAction, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add-circle-outline" size={16} color={tokens.colors.accent} />
          <Text style={s.headerActionText}>Create</Text>
        </Pressable>
      }
    >
      {playlists.map((playlist, i) => (
        <LibraryRow
          key={`playlist-${playlist.uuid}`}
          title={playlist.title}
          subtitle={playlist.isPublic ? "Public playlist" : "Private playlist"}
          meta={`${playlist.trackCount} tracks · Updated ${formatRelativeTime(new Date(playlist.updatedAt * 1000).toISOString())}`}
          artwork={playlist.artwork}
          isLast={i === playlists.length - 1}
          onPress={() =>
            router.push({
              pathname: "/playlist/[slug]",
              params: { slug: playlist.slug, playlistId: playlist.id },
            } as never)
          }
        />
      ))}
      {playlists.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>No playlists yet.</Text>
          <Pressable
            onPress={() => router.push("/playlist/create")}
            style={({ pressed }) => [s.emptyAction, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="add" size={14} color={tokens.colors.accent} />
            <Text style={s.emptyActionText}>Create Playlist</Text>
          </Pressable>
        </View>
      ) : null}
    </Section>
  );
}
