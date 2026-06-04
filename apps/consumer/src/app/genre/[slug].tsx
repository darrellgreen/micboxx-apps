import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen, EmptyState, ErrorState, Skeleton } from "@micboxx/ui";
import { SectionHeader, TrackRow } from "@/components/discover";
import { ArtistCard } from "@micboxx/media";
import type { PublicArtistSummary, PublicTrackSummary } from "@micboxx/contracts";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { resolveAlbumRoute, resolveUserRoute } from "@micboxx/utils";
import { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import { formatDuration } from "@micboxx/api";
import {
  useGetDiscoverTracksQuery,
  useSearchCatalogQuery,
} from "@micboxx/api";
import { tokens } from "@micboxx/theme";

function formatGenreLabel(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function dedupeTracks(tracks: PublicTrackSummary[]) {
  const seen = new Set<number>();
  return tracks.filter((track) => {
    if (seen.has(track.id)) {
      return false;
    }

    seen.add(track.id);
    return true;
  });
}

function trackMatchesGenre(track: PublicTrackSummary, slug: string, genreName: string) {
  const normalizedName = genreName.toLowerCase();
  return (
    track.genre?.slug === slug ||
    track.genre?.name?.toLowerCase() === normalizedName
  );
}

export default function GenreTagScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();

  const {
    data: discoverData,
    isLoading: discoverLoading,
    error: discoverError,
    refetch: refetchDiscover,
  } = useGetDiscoverTracksQuery();

  const genreLabel = useMemo(() => {
    if (!slug) {
      return "Genre";
    }

    return (
      discoverData?.genres.find((genre) => genre.slug === slug)?.name ??
      formatGenreLabel(slug)
    );
  }, [discoverData?.genres, slug]);

  const {
    data: searchData,
    isFetching: searchFetching,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchCatalogQuery(genreLabel, {
    skip: !slug,
  });

  const tracks = useMemo(() => {
    if (!slug) {
      return [] as PublicTrackSummary[];
    }

    const discoverTracks = (discoverData?.tracks ?? []).filter((track) =>
      trackMatchesGenre(track, slug, genreLabel),
    );
    const searchTracks = (searchData?.results.tracks ?? []).filter((track) =>
      trackMatchesGenre(track, slug, genreLabel),
    );

    return dedupeTracks([...searchTracks, ...discoverTracks]);
  }, [discoverData?.tracks, genreLabel, searchData?.results.tracks, slug]);

  const albums = useMemo(() => {
    const albumMap = new Map<
      string,
      {
        id: string;
        title: string;
        slug: string;
        href: string;
        artistName: string;
        trackCount: number;
        duration: number;
      }
    >();

    for (const album of searchData?.results.albums ?? []) {
      albumMap.set(String(album.id), {
        id: String(album.id),
        title: album.title,
        slug: album.slug,
        href: album.href,
        artistName: album.artist?.displayName ?? "Unknown artist",
        trackCount: album.counts.tracks,
        duration: album.counts.duration,
      });
    }

    for (const track of tracks) {
      if (!track.album) {
        continue;
      }

      const key = String(track.album.id);
      const existing = albumMap.get(key);

      if (existing) {
        albumMap.set(key, {
          ...existing,
          trackCount: Math.max(existing.trackCount, 1),
          duration: existing.duration + track.duration,
        });
        continue;
      }

      albumMap.set(key, {
        id: key,
        title: track.album.title,
        slug: track.album.slug,
        href: track.album.href,
        artistName: track.artist?.displayName ?? "Unknown artist",
        trackCount: 1,
        duration: track.duration,
      });
    }

    return [...albumMap.values()];
  }, [searchData?.results.albums, tracks]);

  const artists = useMemo(() => {
    const artistMap = new Map<number, PublicArtistSummary>();

    for (const artist of searchData?.results.artists ?? []) {
      artistMap.set(artist.id, artist);
    }

    for (const track of tracks) {
      if (track.artist) {
        artistMap.set(track.artist.id, track.artist);
      }
    }

    return [...artistMap.values()];
  }, [searchData?.results.artists, tracks]);

  const { activeId, playing, progressValue, handleAction } =
    useDiscoverPlayer();

  if (!slug) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState title="Genre unavailable" description="No genre slug was provided." />
      </Screen>
    );
  }

  if (discoverLoading && !searchData) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.scrollContent, { paddingHorizontal: 16, paddingTop: 16 }]}>
          <Skeleton width={140} height={20} borderRadius={10} />
          <View style={{ marginTop: 12, gap: 8 }}>
            <Skeleton width="100%" height={100} borderRadius={12} />
            <Skeleton width="100%" height={100} borderRadius={12} />
          </View>
        </View>
      </Screen>
    );
  }

  const hasContent = tracks.length > 0 || albums.length > 0 || artists.length > 0;
  const hasError = Boolean(discoverError || searchError) && !hasContent;

  return (
    <Screen contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <DetailRouteHeader title="Genre" fallbackRoute="/(tabs)/search" />
      </View>

        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Genre</Text>
          <Text style={styles.title}>{genreLabel}</Text>
          <Text style={styles.subtitle}>
            Tracks, albums, and artists tagged with {genreLabel}.
          </Text>
        </View>

        {hasError ? (
          <ErrorState
            title="Unable to load this genre"
            message="Genre results could not be loaded right now. Try again in a moment."
            onRetry={() => {
              void refetchDiscover();
              void refetchSearch();
            }}
          />
        ) : !hasContent && !searchFetching ? (
          <EmptyState
            title="No results in this genre yet"
            description={`Tracks, albums, and artists will appear here once more catalog items are tagged with ${genreLabel}.`}
          />
        ) : (
          <View style={styles.resultsWrap}>
            {tracks.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Tracks" light={genreLabel} />
                <View style={styles.tracksCard}>
                  {tracks.map((track, index) => {
                    const active = track.id === activeId;
                    const isLast = index === tracks.length - 1;
                    const nextActive = tracks[index + 1]?.id === activeId;

                    return (
                      <View key={track.id}>
                        <TrackRow
                          track={track}
                          active={active}
                          playing={active && playing}
                          onAction={() => handleAction(track, tracks)}
                          progressValue={progressValue}
                        />
                        {!isLast && !active && !nextActive ? (
                          <View style={styles.divider} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {albums.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Albums" light={genreLabel} />
                <View style={styles.cardList}>
                  {albums.map((album) => (
                    <CollectionResultCard
                      key={`genre-album-${album.id}`}
                      title={album.title}
                      subtitle={album.artistName}
                      meta={`${album.trackCount} songs · ${formatDuration(album.duration)}`}
                      icon="disc-outline"
                      onPress={() => router.push(resolveAlbumRoute(album) as never)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {artists.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Artists" light={genreLabel} />
                <View style={styles.artistList}>
                  {artists.map((artist) => (
                    <ArtistCard
                      key={`genre-artist-${artist.id}`}
                      artist={artist}
                      layout="row"
                      onPress={() => router.push(resolveUserRoute(artist) as never)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
    </Screen>
  );
}

function CollectionResultCard({
  title,
  subtitle,
  meta,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}
    >
      <View style={styles.resultIconWrap}>
        <Ionicons name={icon} size={18} color={tokens.colors.accent} />
      </View>
      <View style={styles.resultCopy}>
        <Text numberOfLines={1} style={styles.resultTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.resultSubtitle}>
          {subtitle}
        </Text>
        <Text numberOfLines={1} style={styles.resultMeta}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 160,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
  },
  heroCard: {
    borderRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 16,
    gap: 6,
  },
  kicker: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  resultsWrap: {
    gap: 20,
  },
  sectionWrap: {
    gap: 10,
  },
  tracksCard: {
    borderRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgSurface,
    paddingVertical: 4,
    ...tokens.shadows.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.colors.borderSubtle,
    marginLeft: 78,
    marginRight: 14,
  },
  cardList: {
    gap: 10,
  },
  resultCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 14,
  },
  resultIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  resultSubtitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
  },
  resultMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  artistList: {
    borderRadius: tokens.radii["2xl"],
    overflow: "hidden",
    backgroundColor: tokens.colors.bgSurface,
  },
  emptyCard: {
    borderRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
  },
  primaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
