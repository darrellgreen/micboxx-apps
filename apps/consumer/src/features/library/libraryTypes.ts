export interface LibraryOwnedAlbum {
  id: string;
  uuid: string;
  type: "album";
  title: string;
  artistName: string;
  artwork: string | null;
  acquiredAt: number;
  orderId: number | null;
}

export interface LibraryOwnedTrack {
  id: string;
  uuid: string;
  type: "track";
  title: string;
  artistName: string;
  albumTitle: string | null;
  artwork: string | null;
  acquiredAt: number;
  orderId: number | null;
}

export type LibraryOwnedItem = LibraryOwnedAlbum | LibraryOwnedTrack;

export interface LibrarySavedAlbum {
  id: string;
  uuid: string;
  type: "album";
  title: string;
  artistId: string;
  artistName: string;
  artwork: string | null;
  savedAt: number;
  isOwned: boolean;
}

export interface LibrarySavedTrack {
  id: string;
  uuid: string;
  type: "track";
  title: string;
  artistId: string;
  artistName: string;
  albumId: string | null;
  albumTitle: string | null;
  artwork: string | null;
  savedAt: number;
  isOwned: boolean;
}

export type LibrarySavedItem = LibrarySavedAlbum | LibrarySavedTrack;

export interface LibraryRecentlyPlayedTrack {
  id: string;
  uuid: string;
  type: "track";
  title: string;
  artistName: string;
  albumTitle: string | null;
  artwork: string | null;
  playedAt: number;
  isOwned: boolean;
}

export interface LibraryRecentlyPlayedAlbum {
  id: string;
  uuid: string;
  type: "album";
  title: string;
  artistName: string;
  artwork: string | null;
  playedAt: number;
  isOwned: boolean;
}

export type LibraryRecentlyPlayedItem = LibraryRecentlyPlayedTrack | LibraryRecentlyPlayedAlbum;

export interface LibraryFollowedArtist {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  followedAt: number;
  isVerified: boolean;
}

export interface LibraryPlaylist {
  id: string;
  uuid: string;
  title: string;
  description: string | null;
  artwork: string | null;
  trackCount: number;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  isOwned: boolean;
  slug: string;
}

export type LibraryTab = "all" | "purchased" | "saved" | "artists" | "playlists" | "recent";

export interface LibraryState {
  ownedAlbums: LibraryOwnedAlbum[];
  ownedTracks: LibraryOwnedTrack[];
  savedAlbums: LibrarySavedAlbum[];
  savedTracks: LibrarySavedTrack[];
  recentlyPlayedTracks: LibraryRecentlyPlayedTrack[];
  recentlyPlayedAlbums: LibraryRecentlyPlayedAlbum[];
  followedArtists: LibraryFollowedArtist[];
  playlists: LibraryPlaylist[];
  isLoading: boolean;
  error: string | null;
  unavailableDomains: string[];
}

export interface LibrarySummary {
  ownedAlbumCount: number;
  ownedTrackCount: number;
  savedAlbumCount: number;
  savedTrackCount: number;
  followedArtistCount: number;
  playlistCount: number;
  recentlyPlayedCount: number;
}
