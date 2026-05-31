import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import type { CommerceOrderHistoryEntry, CommerceOrderLinePayload } from "@micboxx/contracts";
import type { PublicArtistPage, PublicTrackPage, PublicTrackSummary } from "@micboxx/contracts";
import { env } from "@/config/env";
import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import {
  getArtistPage,
  getMyPlaylists,
  getOrderHistory,
  getRecentlyPlayedTracks,
  getTrackPage,
} from "@micboxx/api";
import { normalizeMediaUrl } from "@micboxx/media";
import type { LibraryFollowedArtist, LibraryPlaylist, LibraryRecentlyPlayedTrack, LibrarySavedTrack, LibraryState, LibrarySummary } from "@/features/library/libraryTypes";

function timestampMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const fn = (value as { toMillis?: unknown }).toMillis;
    if (typeof fn === "function") return fn.call(value) || 0;
  }
  return typeof value === "number" ? value : 0;
}

function seconds(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}

function lineKind(line: CommerceOrderLinePayload): "album" | "track" | null {
  const key = `${line.sellableType}:${line.fulfillmentAdapter}:${line.sellableKey}`.toLowerCase();
  if (key.includes("album")) return "album";
  if (key.includes("track")) return "track";
  return null;
}

// normalizeArtworkUrl removed in favor of normalizeMediaUrl

function parseSnapshotTitle(snapshotTitle: string): {
  title: string;
  artistName: string | null;
} {
  const normalized = snapshotTitle.trim();
  if (!normalized) {
    return { title: "", artistName: null };
  }

  const separatorIndex = normalized.indexOf(" - ");
  if (separatorIndex <= 0) {
    return { title: normalized, artistName: null };
  }

  const artistName = normalized.slice(0, separatorIndex).trim();
  const title = normalized.slice(separatorIndex + 3).trim();

  return {
    title: title || normalized,
    artistName: artistName || null,
  };
}

function lineSnapshot(line: CommerceOrderLinePayload) {
  const extended = line as CommerceOrderLinePayload & {
    snapshotArtistName?: string | null;
    snapshotAlbumTitle?: string | null;
    snapshotArtworkUrl?: string | null;
  };

  return {
    artistName: extended.snapshotArtistName ?? null,
    albumTitle: extended.snapshotAlbumTitle ?? null,
    artwork: normalizeMediaUrl(env.drupalBaseUrl, extended.snapshotArtworkUrl),
  };
}

function deriveOwned(orders: CommerceOrderHistoryEntry[]) {
  const albums = new Map<string, LibraryState["ownedAlbums"][number]>();
  const tracks = new Map<string, LibraryState["ownedTracks"][number]>();

  const completedOrders = orders.filter((order) => {
    const status = order.status?.toLowerCase() ?? "";
    return status === "paid" || status === "fulfilled" || status === "completed";
  });

  completedOrders.forEach((order) => {
    const acquiredAt = order.timestamps.fulfilledAt || order.timestamps.paidAt || order.timestamps.createdAt;
    order.lines.forEach((line) => {
      const kind = lineKind(line);
      const parsedSnapshot = parseSnapshotTitle(line.snapshotTitle || "");
      const snapshot = lineSnapshot(line);

      if (kind === "album") {
        albums.set(line.sellableUuid || line.sellableId, {
          id: String(line.sellableId),
          uuid: line.sellableUuid,
          type: "album",
          title: parsedSnapshot.title || "Untitled Album",
          artistName: snapshot.artistName ?? parsedSnapshot.artistName ?? "Unknown Artist",
          artwork: snapshot.artwork,
          acquiredAt,
          orderId: order.id,
        });
      }
      if (kind === "track") {
        tracks.set(line.sellableUuid || line.sellableId, {
          id: String(line.sellableId),
          uuid: line.sellableUuid,
          type: "track",
          title: parsedSnapshot.title || "Untitled Track",
          artistName: snapshot.artistName ?? parsedSnapshot.artistName ?? "Unknown Artist",
          albumTitle: snapshot.albumTitle,
          artwork: snapshot.artwork,
          acquiredAt,
          orderId: order.id,
        });
      }
    });
  });

  return {
    ownedAlbums: Array.from(albums.values()).sort((a, b) => b.acquiredAt - a.acquiredAt),
    ownedTracks: Array.from(tracks.values()).sort((a, b) => b.acquiredAt - a.acquiredAt),
  };
}

function trackToRecent(track: PublicTrackSummary): LibraryRecentlyPlayedTrack {
  return {
    id: String(track.id),
    uuid: track.uuid,
    type: "track",
    title: track.title,
    artistName: track.artist?.displayName ?? "Unknown artist",
    albumTitle: track.album?.title ?? null,
    artwork: track.artworkUrl,
    playedAt: 0,
    isOwned: false,
  };
}

function trackPageToSaved(page: PublicTrackPage, savedAt: number): LibrarySavedTrack {
  return {
    id: String(page.track.id),
    uuid: page.track.uuid,
    type: "track",
    title: page.track.title,
    artistId: page.track.artist ? String(page.track.artist.id) : "",
    artistName: page.track.artist?.displayName ?? "Unknown artist",
    albumId: page.track.album ? String(page.track.album.id) : null,
    albumTitle: page.track.album?.title ?? null,
    artwork: page.track.artworkUrl,
    savedAt,
    isOwned: false,
  };
}

function artistPageToFollowed(page: PublicArtistPage, followedAt: number): LibraryFollowedArtist {
  return {
    id: page.artist.uuid,
    username: page.artist.username,
    displayName: page.artist.displayName,
    avatar: page.artist.avatarUrl ?? null,
    followedAt,
    isVerified: false,
  };
}

export function useLibraryDomains(accessToken: string | null, userUuid: string | null) {
  const [state, setState] = useState<LibraryState>({
    ownedAlbums: [],
    ownedTracks: [],
    savedAlbums: [],
    savedTracks: [],
    recentlyPlayedTracks: [],
    recentlyPlayedAlbums: [],
    followedArtists: [],
    playlists: [],
    isLoading: Boolean(accessToken),
    error: null,
    // UNVERIFIED_ROUTE: no backend/Firestore saved-albums source is verified for mobile.
    unavailableDomains: ["Saved albums"],
  });

  useEffect(() => {
    if (!accessToken) {
      setState((current) => ({ ...current, isLoading: false }));
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, isLoading: true, error: null }));

    Promise.all([
      getOrderHistory(100, accessToken).then(deriveOwned),
      getMyPlaylists(1, 50, accessToken).then((result): LibraryPlaylist[] =>
        result.playlists.map((playlist) => ({
          id: String(playlist.id),
          uuid: playlist.uuid,
          title: playlist.title,
          description: playlist.description,
          artwork: playlist.artworkUrl,
          trackCount: playlist.counts.tracks,
          createdAt: seconds(playlist.timestamps.createdAt),
          updatedAt: seconds(playlist.timestamps.updatedAt),
          isPublic: playlist.status.published,
          isOwned: true,
          slug: playlist.slug,
        })),
      ),
      getRecentlyPlayedTracks(12, accessToken).then((result) => result.tracks.map(trackToRecent)),
    ])
      .then(([owned, playlists, recentlyPlayedTracks]) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          ...owned,
          playlists,
          recentlyPlayedTracks,
          isLoading: false,
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unable to load your library.",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !isFirebaseConfigured()) {
      return;
    }

    const db = getFirebaseClientDb();
    const unsubs: Unsubscribe[] = [];

    let savedDocs: { trackId: string; trackHref: string | null; createdAt: number }[] = [];
    let likedDocs: { trackId: string; trackHref: string | null; createdAt: number }[] = [];
    let followDocs: { followeeUid: string; createdAt: number }[] = [];

    const applySaved = () => {
      const deduped = new Map<string, { trackId: string; trackHref: string | null; createdAt: number }>();
      [...savedDocs, ...likedDocs].forEach((docValue) => {
        if (!deduped.has(docValue.trackId)) deduped.set(docValue.trackId, docValue);
      });

      void Promise.all(Array.from(deduped.values()).map(async (docValue) => {
        const identifier = docValue.trackHref?.match(/^\/track\/([^/?#]+)/)?.[1] ?? docValue.trackId;
        try {
          const page = await getTrackPage(decodeURIComponent(identifier));
          return trackPageToSaved(page, docValue.createdAt);
        } catch {
          return null;
        }
      })).then((tracks) => {
        setState((current) => ({
          ...current,
          savedTracks: tracks
            .filter((track): track is LibrarySavedTrack => track !== null)
            .sort((a, b) => b.savedAt - a.savedAt),
        }));
      });
    };

    const applyFollows = () => {
      void Promise.all(followDocs.map(async (docValue) => {
        try {
          const page = await getArtistPage(docValue.followeeUid);
          return artistPageToFollowed(page, docValue.createdAt);
        } catch {
          return null;
        }
      })).then((artists) => {
        setState((current) => ({
          ...current,
          followedArtists: artists
            .filter((artist): artist is LibraryFollowedArtist => artist !== null)
            .sort((a, b) => b.followedAt - a.followedAt),
        }));
      });
    };

    if (!userUuid) return;

    const favoritesQuery = query(collection(db, "trackFavorites"), where("ownerUid", "==", userUuid));
    const likesQuery = query(collection(db, "trackLikes"), where("ownerUid", "==", userUuid));
    const followsQuery = query(collection(db, "follows"), where("followerUid", "==", userUuid));

    unsubs.push(onSnapshot(favoritesQuery, (snapshot) => {
      savedDocs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          trackId: typeof data.trackId === "string" ? data.trackId : "",
          trackHref: typeof data.trackHref === "string" ? data.trackHref : null,
          createdAt: timestampMs(data.createdAt),
        };
      }).filter((item) => item.trackId.length > 0);
      applySaved();
    }, () => undefined));

    unsubs.push(onSnapshot(likesQuery, (snapshot) => {
      likedDocs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          trackId: typeof data.trackId === "string" ? data.trackId : "",
          trackHref: typeof data.trackHref === "string" ? data.trackHref : null,
          createdAt: timestampMs(data.createdAt),
        };
      }).filter((item) => item.trackId.length > 0);
      applySaved();
    }, () => undefined));

    unsubs.push(onSnapshot(followsQuery, (snapshot) => {
      followDocs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          followeeUid: typeof data.followeeUid === "string" ? data.followeeUid : "",
          createdAt: timestampMs(data.createdAt),
        };
      }).filter((item) => item.followeeUid.length > 0);
      applyFollows();
    }, () => undefined));

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [accessToken, userUuid]);

  const summary: LibrarySummary = useMemo(() => ({
    ownedAlbumCount: state.ownedAlbums.length,
    ownedTrackCount: state.ownedTracks.length,
    savedAlbumCount: state.savedAlbums.length,
    savedTrackCount: state.savedTracks.length,
    followedArtistCount: state.followedArtists.length,
    playlistCount: state.playlists.length,
    recentlyPlayedCount: state.recentlyPlayedTracks.length + state.recentlyPlayedAlbums.length,
  }), [state]);

  return { state, summary };
}
