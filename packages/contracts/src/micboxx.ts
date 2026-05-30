export interface MicboxxSessionUser {
  id: number;
  uuid: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  email: string;
  roles: string[];
  capabilities?: string[];
  permissions: {
    canUploadTracks: boolean;
    canAdministerTracks: boolean;
    canSellCatalog: boolean;
    canCreatePlaylists: boolean;
    canAdministerPlaylists: boolean;
    canCreateAlbums: boolean;
    canAdministerAlbums: boolean;
  };
}

export interface MicboxxSessionEntitlements {
  hasListenerSubscription?: boolean;
  capabilities?: string[];
  purchasedTrackIds?: string[];
  purchasedAlbumIds?: string[];
}

export interface MicboxxSession {
  user: MicboxxSessionUser;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: number;
  entitlements?: MicboxxSessionEntitlements | null;
}

export interface PublicGenre {
  id: number;
  name: string;
  slug: string;
  href: string;
  counts?: { tracks: number };
}

export interface PublicTrackAccess {
  locked: boolean;
  requiredCapability: string | null;
  planKey: string | null;
}

export interface PublicTrackCommerce {
  isPurchasable: boolean;
  price: string | null;
  currency: string | null;
  isSubscriberOnly: boolean;
}

export interface PublicArtistSummary {
  id: number;
  uuid: string;
  username: string;
  displayName: string;
  href: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  counts?: {
    tracks?: number;
    albums?: number;
    playlists?: number;
    followers?: number;
    following?: number;
  };
}

export interface PublicAlbumSummary {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  href: string;
  description: string | null;
  artist: PublicArtistSummary | null;
  artworkUrl: string | null;
  counts: {
    tracks: number;
    duration: number;
    purchases: number;
  };
  commerce: {
    isPurchasable: boolean;
    price: string | null;
    currency: string | null;
  } | null;
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface PublicTrackSummary {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  duration: number;
  description: string | null;
  artist: PublicArtistSummary | null;
  genre: {
    id: number;
    name: string;
    slug: string;
    href: string;
  } | null;
  album: {
    id: number;
    title: string;
    slug: string;
    href: string;
  } | null;
  artworkUrl: string | null;
  audioUrl: string | null;
  demoAudioUrl: string | null;
  locked: boolean;
  isSubscriberOnly: boolean;
  commerce?: PublicTrackCommerce | null;
  access?: PublicTrackAccess;
  href: string;
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface PublicTrack extends PublicTrackSummary {
  assets: {
    artworkUrl: string | null;
    audioUrl: string | null;
    fullAudioUrl?: string | null;
    premiumAudioUrl?: string | null;
    demoAudioUrl: string | null;
    waveforms: {
      light: string | null;
      dark: string | null;
      day: string | null;
    };
  };
  playback?: {
    mode: string | null;
    isDemoOnly: boolean;
    locked: boolean;
    hasPremiumPlayback: boolean;
  };
  interactionPolicy: {
    commentsAllowed: boolean;
  };
  stats: {
    plays: number;
    likes: number;
    comments: number;
    favourites: number;
    purchases: number;
  };
}

export interface PublicPlaylist {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  href: string;
  description: string | null;
  owner: {
    id: number;
    username: string;
    displayName: string;
    href: string;
  } | null;
  artworkUrl: string | null;
  counts: {
    tracks: number;
    duration: number;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface PublicTrackPage {
  track: PublicTrack;
  relatedTracks: PublicTrackSummary[];
}

export interface PublicAlbumPage {
  album: PublicAlbumSummary;
  tracks: PublicTrackSummary[];
  relatedAlbums: PublicAlbumSummary[];
}

export interface PublicArtistPage {
  artist: PublicArtistSummary & {
    counts: {
      tracks: number;
      albums: number;
      playlists: number;
      followers: number;
      following: number;
    };
  };
  tracks: PublicTrackSummary[];
  albums: PublicAlbumSummary[];
  playlists: PublicPlaylist[];
  meta: {
    hasPublicContent: boolean;
    totals: {
      tracks: number;
      albums: number;
      playlists: number;
    };
  };
}

export interface PublicPlaylistPage {
  playlist: PublicPlaylist;
  tracks: (PublicTrackSummary & { position: number })[];
  relatedPlaylists: PublicPlaylist[];
}

export interface PublicTrackList {
  tracks: PublicTrackSummary[];
  genres: {
    id: number;
    name: string;
    slug: string;
    href: string;
    counts: { tracks: number };
  }[];
}

export interface PublicSearchResults {
  query: string;
  results: {
    tracks: PublicTrackSummary[];
    albums: PublicAlbumSummary[];
    playlists: PublicPlaylist[];
    artists: PublicArtistSummary[];
    genres: {
      id: number;
      name: string;
      slug: string;
      href: string;
    }[];
  };
  meta: {
    hasResults: boolean;
    totals: {
      tracks: number;
      albums: number;
      playlists: number;
      artists: number;
      genres: number;
    };
  };
}

export interface ForYouResponse {
  items: {
    trackId: string;
    rank: number;
    score: number;
    reasons: string[];
    candidateSource: string;
    personalized: boolean;
    track: PublicTrackSummary;
  }[];
  nextCursor: string | null;
  surface: string;
  meta: {
    algorithmVersion: string;
    totalItems: number;
    personalized: boolean;
    servedBatchId: string | null;
  };
}

export interface DiscoverPersonalizedForYouItem {
  trackId: string;
  reasons: string[];
  track: PublicTrackSummary;
}

export interface DiscoverPersonalizedResponse {
  forYou: {
    items: DiscoverPersonalizedForYouItem[];
  } | null;
  followedArtistFeed: {
    followeeUuids: string[];
    tracks: PublicTrackSummary[];
  } | null;
}

export interface PlayerTrack {
  id: number;
  title: string;
  slug: string;
  artistName: string;
  artworkUrl: string | null;
  audioUrl: string | null;
  demoAudioUrl: string | null;
  duration: number;
  albumTitle: string | null;
  genreName: string | null;
  locked: boolean;
  isSubscriberOnly: boolean;
  requiredCapability: string | null;
  planKey: string | null;
}
