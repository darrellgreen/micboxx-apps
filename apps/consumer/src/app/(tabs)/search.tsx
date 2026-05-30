import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionHeader, TrackRow } from "@/components/discover";
import { ArtistCard } from "@/components/media/artist-card";
import { GenreCard } from "@/components/media/genre-card";
import { AnimatedPressable } from "@micboxx/ui";
import { ShimmerPlaceholder } from "@micboxx/ui";
import type { PublicPlaylist } from "@micboxx/contracts";
import {
  getGenreRoute,
  resolveAlbumRoute,
  resolvePlaylistRoute,
  resolveUserRoute,
} from "@micboxx/utils";
import { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import { formatDuration } from "@micboxx/api";
import {
  useGetDiscoverTracksQuery,
  useSearchCatalogQuery,
} from "@/store/micboxx-api";
import { tokens } from "@micboxx/theme";

const AUTOCOMPLETE_DELAY_MS = 350;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, AUTOCOMPLETE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: discoverData } = useGetDiscoverTracksQuery();

  const { data, isFetching, error, refetch } = useSearchCatalogQuery(
    debouncedQuery,
    {
      skip: debouncedQuery.length === 0,
    },
  );

  const results = data?.results;
  const browseGenres = discoverData?.genres ?? [];
  const totalResults = useMemo(() => {
    if (!data) {
      return 0;
    }

    return Object.values(data.meta.totals).reduce(
      (sum, count) => sum + count,
      0,
    );
  }, [data]);

  const { activeId, playing, progressValue, handleAction } =
    useDiscoverPlayer();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader bold="Search" light="Catalog" />

        <View
          style={[
            styles.inputRow,
            inputFocused && styles.inputRowFocused,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={tokens.colors.textSecondary}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tracks, albums, playlists, users, or genres"
            placeholderTextColor={tokens.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          {query.length ? (
            <AnimatedPressable onPress={() => setQuery("")} hitSlop={8} haptic="none">
              <Ionicons
                name="close-circle"
                size={18}
                color={tokens.colors.textSecondary}
              />
            </AnimatedPressable>
          ) : null}
        </View>

        {debouncedQuery.length ? (
          <Animated.View entering={FadeIn.duration(150)} style={styles.statusRow}>
            <Text style={styles.statusText}>
              {isFetching
                ? `Searching “${debouncedQuery}”…`
                : `${totalResults} result${totalResults === 1 ? "" : "s"} for “${debouncedQuery}”`}
            </Text>
          </Animated.View>
        ) : null}

        {debouncedQuery.length === 0 ? (
          browseGenres.length ? (
            <View style={styles.sectionWrap}>
              <SectionHeader bold="Browse" light="Genres" />
              <View style={styles.genreGrid}>
                {browseGenres.map((genre) => (
                  <View
                    key={`browse-genre-${genre.id}`}
                    style={styles.genreItem}
                  >
                    <GenreCard
                      genre={genre}
                      onPress={() =>
                        router.push(getGenreRoute(genre.slug) as never)
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null
        ) : error ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Unable to search right now</Text>
            <Text style={styles.emptyBody}>
              Drupal search could not respond just now. Try again in a moment.
            </Text>
            <AnimatedPressable
              onPress={() => void refetch()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonLabel}>Retry</Text>
            </AnimatedPressable>
          </Animated.View>
        ) : isFetching && !results ? (
          <Animated.View entering={FadeIn.duration(150)} style={styles.loadingWrap}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.searchSkeletonRow}>
                <ShimmerPlaceholder width={42} height={42} borderRadius={21} />
                <View style={styles.searchSkeletonCopy}>
                  <ShimmerPlaceholder width="58%" height={12} borderRadius={6} />
                  <ShimmerPlaceholder width="38%" height={10} borderRadius={6} />
                </View>
              </View>
            ))}
          </Animated.View>
        ) : results && totalResults === 0 ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyBody}>
              Try a track title, album name, playlist name, artist username, or
              genre.
            </Text>
          </Animated.View>
        ) : results ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.resultsWrap}>
            {results.tracks.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Track" light="Results" />
                <View style={styles.tracksCard}>
                  {results.tracks.map((track, index) => {
                    const active = track.id === activeId;
                    const isLast = index === results.tracks.length - 1;
                    const nextActive =
                      results.tracks[index + 1]?.id === activeId;

                    return (
                      <View key={track.id}>
                        <TrackRow
                          track={track}
                          laneTracks={results.tracks}
                          active={active}
                          playing={active && playing}
                          onAction={handleAction}
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

            {results.albums.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Album" light="Results" />
                <View style={styles.cardList}>
                  {results.albums.map((album) => (
                    <CollectionResultCard
                      key={`album-${album.id}`}
                      title={album.title}
                      subtitle={album.artist?.displayName ?? "Unknown artist"}
                      meta={`${album.counts.tracks} songs · ${formatDuration(album.counts.duration)}`}
                      icon="disc-outline"
                      onPress={() => router.push(resolveAlbumRoute(album) as never)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {results.playlists.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Playlist" light="Results" />
                <View style={styles.cardList}>
                  {results.playlists.map((playlist) => (
                    <PlaylistResultCard
                      key={`playlist-${playlist.id}`}
                      playlist={playlist}
                      onPress={() => router.push(resolvePlaylistRoute(playlist) as never)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {results.artists.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="User" light="Results" />
                <View style={styles.artistList}>
                  {results.artists.map((artist) => (
                    <ArtistCard
                      key={`artist-${artist.id}`}
                      artist={artist}
                      layout="row"
                      onPress={() => router.push(resolveUserRoute(artist) as never)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {results.genres.length ? (
              <View style={styles.sectionWrap}>
                <SectionHeader bold="Genre" light="Matches" />
                <View style={styles.genreGrid}>
                  {results.genres.map((genre) => (
                    <View key={`genre-${genre.id}`} style={styles.genreItem}>
                      <GenreCard
                        genre={genre}
                        onPress={() =>
                          router.push(getGenreRoute(genre.slug) as never)
                        }
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
    <AnimatedPressable
      onPress={onPress}
      style={styles.resultCard}
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
    </AnimatedPressable>
  );
}

function PlaylistResultCard({
  playlist,
  onPress,
}: {
  playlist: PublicPlaylist;
  onPress: () => void;
}) {
  return (
    <CollectionResultCard
      title={playlist.title}
      subtitle={playlist.owner?.displayName ?? "Unknown creator"}
      meta={`${playlist.counts.tracks} songs · ${formatDuration(playlist.counts.duration)}`}
      icon="list-outline"
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 160,
    gap: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 14,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  inputRowFocused: {
    borderColor: "rgba(0,179,166,0.28)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 15,
    paddingVertical: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  loadingWrap: {
    gap: 12,
    paddingVertical: 8,
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
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  genreItem: {
    width: "48%",
    minHeight: 120,
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
  searchSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: tokens.radii.xl,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 14,
  },
  searchSkeletonCopy: {
    flex: 1,
    gap: 8,
  },
});
