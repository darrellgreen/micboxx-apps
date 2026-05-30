import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PublicTrackSummary } from "@micboxx/contracts";
import { resolveAlbumRoute } from "@/features/catalog/detail-utils";
import { tokens } from "@micboxx/theme";

interface AlbumItem {
  id: number;
  title: string;
  slug: string;
  href: string;
  artworkUrl: string | null;
  artistName: string | null;
  trackCount: number;
  firstTrackSlug: string;
}

function extractAlbums(tracks: PublicTrackSummary[], limit = 3): AlbumItem[] {
  const seen = new Map<number, AlbumItem>();
  for (const t of tracks) {
    if (!t.album) continue;
    const existing = seen.get(t.album.id);
    if (existing) {
      existing.trackCount += 1;
    } else {
      seen.set(t.album.id, {
        id: t.album.id,
        title: t.album.title,
        slug: t.album.slug,
        href: t.album.href,
        artworkUrl: t.artworkUrl,
        artistName: t.artist?.displayName ?? null,
        trackCount: 1,
        firstTrackSlug: t.slug,
      });
    }
    if (seen.size >= limit) break;
  }
  return Array.from(seen.values());
}

export function NewMusicAlbums({
  tracks,
  limit = 3,
  onAlbumPress,
}: {
  tracks: PublicTrackSummary[];
  limit?: number;
  onAlbumPress?: (albumSlug: string) => void;
}) {
  const router = useRouter();
  const albums = extractAlbums(tracks, limit);

  if (!albums.length) return null;

  return (
    <View style={s.row}>
      {albums.map((album) => (
        <Pressable
          key={album.id}
          style={s.card}
          onPress={() => {
            if (onAlbumPress) {
              onAlbumPress(album.slug);
              return;
            }

            router.push(resolveAlbumRoute(album) as never);
          }}
        >
          <View style={s.artworkWrap}>
            <Image
              source={
                album.artworkUrl
                  ? { uri: album.artworkUrl }
                  : require("../../../assets/images/icon.png")
              }
              style={s.artwork}
              contentFit="cover"
            />
          </View>
          <Text numberOfLines={1} style={s.title}>
            {album.title}
          </Text>
          {album.artistName ? (
            <Text numberOfLines={1} style={s.artist}>
              {album.artistName}
            </Text>
          ) : null}
          <Text style={s.meta}>
            {album.trackCount} {album.trackCount === 1 ? "song" : "songs"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  card: { flex: 1, alignItems: "center" },
  artworkWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: tokens.radii["2xl"],
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  artwork: { width: "100%", height: "100%" },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  artist: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  meta: {
    color: tokens.colors.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
