import type {
    ForYouResponse,
    MicboxxSession,
    PublicAlbumPage,
    PublicArtistPage,
    PublicPlaylistPage,
    PublicSearchResults,
    PublicTrackList,
    PublicTrackPage,
} from "@micboxx/contracts";

const artist = {
  id: 7,
  uuid: "artist-aurora-77",
  username: "auroraflare",
  displayName: "Aurora Flare",
  href: "/users/auroraflare",
  avatarUrl: null,
  coverUrl: null,
  description:
    "Late-night electronics, soft distortion, and listener-first releases.",
};

const album = {
  id: 44,
  uuid: "album-static-bloom",
  title: "Static Bloom",
  slug: "static-bloom",
  href: "/albums/static-bloom",
  description: "A nocturnal electronic album built for long-form listening.",
  artist,
  artworkUrl: null,
  counts: {
    tracks: 3,
    duration: 706,
    purchases: 194,
  },
  commerce: {
    isPurchasable: true,
    price: "6.99",
    currency: "USD",
  },
  timestamps: {
    createdAt: "2026-03-18T18:00:00.000Z",
    updatedAt: "2026-03-24T18:00:00.000Z",
  },
};

const tracks = [
  {
    id: 101,
    uuid: "track-neon-afterglow",
    title: "Neon Afterglow",
    slug: "neon-afterglow",
    duration: 212,
    description:
      "A warm synth opener with full-length playback already unlocked.",
    artist,
    genre: {
      id: 1,
      name: "Electronic",
      slug: "electronic",
      href: "/genres/electronic",
    },
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      href: album.href,
    },
    artworkUrl: null,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    demoAudioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    locked: false,
    isSubscriberOnly: false,
    commerce: {
      isPurchasable: true,
      price: "1.29",
      currency: "USD",
      isSubscriberOnly: false,
    },
    access: {
      locked: false,
      requiredCapability: null,
      planKey: null,
    },
    href: "/tracks/neon-afterglow",
    timestamps: {
      createdAt: "2026-03-24T18:00:00.000Z",
      updatedAt: "2026-03-24T18:00:00.000Z",
    },
  },
  {
    id: 102,
    uuid: "track-signal-garden",
    title: "Signal Garden",
    slug: "signal-garden",
    duration: 265,
    description: "Dense rhythm layers and a bright top-line hook.",
    artist,
    genre: {
      id: 1,
      name: "Electronic",
      slug: "electronic",
      href: "/genres/electronic",
    },
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      href: album.href,
    },
    artworkUrl: null,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    demoAudioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    locked: true,
    isSubscriberOnly: true,
    commerce: {
      isPurchasable: false,
      price: null,
      currency: null,
      isSubscriberOnly: true,
    },
    access: {
      locked: true,
      requiredCapability: "listener.subscription",
      planKey: "listener_monthly",
    },
    href: "/tracks/signal-garden",
    timestamps: {
      createdAt: "2026-03-21T18:00:00.000Z",
      updatedAt: "2026-03-21T18:00:00.000Z",
    },
  },
  {
    id: 103,
    uuid: "track-violet-transit",
    title: "Violet Transit",
    slug: "violet-transit",
    duration: 229,
    description: "Pitched vocals over a restrained low-end pulse.",
    artist,
    genre: {
      id: 2,
      name: "Alt Pop",
      slug: "alt-pop",
      href: "/genres/alt-pop",
    },
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      href: album.href,
    },
    artworkUrl: null,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    demoAudioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    locked: false,
    isSubscriberOnly: false,
    commerce: {
      isPurchasable: true,
      price: "1.29",
      currency: "USD",
      isSubscriberOnly: false,
    },
    access: {
      locked: false,
      requiredCapability: null,
      planKey: null,
    },
    href: "/tracks/violet-transit",
    timestamps: {
      createdAt: "2026-03-18T18:00:00.000Z",
      updatedAt: "2026-03-18T18:00:00.000Z",
    },
  },
  {
    id: 104,
    uuid: "track-midnight-paywall",
    title: "Midnight Paywall",
    slug: "midnight-paywall",
    duration: 248,
    description:
      "A storefront-ready single with preview playback until the release is purchased.",
    artist,
    genre: {
      id: 1,
      name: "Electronic",
      slug: "electronic",
      href: "/genres/electronic",
    },
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      href: album.href,
    },
    artworkUrl: null,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    demoAudioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    locked: true,
    isSubscriberOnly: false,
    commerce: {
      isPurchasable: true,
      price: "1.29",
      currency: "USD",
      isSubscriberOnly: false,
    },
    access: {
      locked: true,
      requiredCapability: null,
      planKey: null,
    },
    href: "/tracks/midnight-paywall",
    timestamps: {
      createdAt: "2026-03-16T18:00:00.000Z",
      updatedAt: "2026-03-16T18:00:00.000Z",
    },
  },
  {
    id: 105,
    uuid: "track-archive-fade",
    title: "Archive Fade",
    slug: "archive-fade",
    duration: 190,
    description:
      "An archived catalog item kept visible for discovery but not currently streamable.",
    artist,
    genre: {
      id: 2,
      name: "Alt Pop",
      slug: "alt-pop",
      href: "/genres/alt-pop",
    },
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      href: album.href,
    },
    artworkUrl: null,
    audioUrl: null,
    demoAudioUrl: null,
    locked: true,
    isSubscriberOnly: false,
    commerce: {
      isPurchasable: false,
      price: null,
      currency: null,
      isSubscriberOnly: false,
    },
    access: {
      locked: true,
      requiredCapability: null,
      planKey: null,
    },
    href: "/tracks/archive-fade",
    timestamps: {
      createdAt: "2026-03-12T18:00:00.000Z",
      updatedAt: "2026-03-12T18:00:00.000Z",
    },
  },
];

const totalTrackCount = tracks.length;
const totalTrackDuration = tracks.reduce(
  (sum, track) => sum + track.duration,
  0,
);

album.counts.tracks = totalTrackCount;
album.counts.duration = totalTrackDuration;

const playlistCounts = {
  tracks: totalTrackCount,
  duration: totalTrackDuration,
};

export const mockDiscoverTracks: PublicTrackList = {
  tracks,
  genres: [
    {
      id: 1,
      name: "Electronic",
      slug: "electronic",
      href: "/genres/electronic",
      counts: { tracks: 14 },
    },
    {
      id: 2,
      name: "Alt Pop",
      slug: "alt-pop",
      href: "/genres/alt-pop",
      counts: { tracks: 9 },
    },
  ],
};

export const mockTrackPages: Record<string, PublicTrackPage> =
  Object.fromEntries(
    tracks.map((track) => [
      track.slug,
      {
        track: {
          ...track,
          assets: {
            artworkUrl: track.artworkUrl,
            audioUrl: track.audioUrl,
            demoAudioUrl: track.demoAudioUrl,
            fullAudioUrl: track.audioUrl,
            premiumAudioUrl: track.audioUrl,
            waveforms: {
              light: null,
              dark: null,
              day: null,
            },
          },
          playback: {
            mode:
              track.audioUrl || track.demoAudioUrl
                ? track.locked
                  ? "preview"
                  : "full"
                : null,
            isDemoOnly: Boolean(track.locked && track.demoAudioUrl),
            locked: track.locked,
            hasPremiumPlayback: Boolean(!track.locked && track.audioUrl),
          },
          interactionPolicy: {
            commentsAllowed: true,
          },
          stats: {
            plays: 14820,
            likes: 943,
            comments: 112,
            favourites: 611,
            purchases: 194,
          },
        },
        relatedTracks: tracks.filter(
          (candidate) => candidate.slug !== track.slug,
        ),
      },
    ]),
  );

export const mockAlbumPage: PublicAlbumPage = {
  album,
  tracks,
  relatedAlbums: [album],
};

export const mockArtistPage: PublicArtistPage = {
  artist: {
    ...artist,
    counts: {
      tracks: totalTrackCount,
      albums: 1,
      playlists: 1,
      followers: 2304,
      following: 183,
    },
  },
  tracks,
  albums: [album],
  playlists: [
    {
      id: 91,
      uuid: "playlist-midnight-drive",
      title: "Midnight Drive",
      slug: "midnight-drive",
      href: "/playlists/midnight-drive",
      description: "Listener-curated electronic slow-burners.",
      owner: {
        id: 7,
        username: "auroraflare",
        displayName: "Aurora Flare",
        href: "/users/auroraflare",
      },
      artworkUrl: null,
      counts: playlistCounts,
      timestamps: {
        createdAt: "2026-02-01T12:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
      },
    },
  ],
  meta: {
    hasPublicContent: true,
    totals: {
      tracks: totalTrackCount,
      albums: 1,
      playlists: 1,
    },
  },
};

export const mockPlaylistPage: PublicPlaylistPage = {
  playlist: {
    id: 91,
    uuid: "playlist-midnight-drive",
    title: "Midnight Drive",
    slug: "midnight-drive",
    href: "/playlists/midnight-drive",
    description: "Listener-curated electronic slow-burners.",
    owner: {
      id: 7,
      username: "auroraflare",
      displayName: "Aurora Flare",
      href: "/users/auroraflare",
    },
    artworkUrl: null,
    counts: playlistCounts,
    timestamps: {
      createdAt: "2026-02-01T12:00:00.000Z",
      updatedAt: "2026-03-22T12:00:00.000Z",
    },
  },
  tracks: tracks.map((track, index) => ({ ...track, position: index + 1 })),
  relatedPlaylists: [],
};

export const mockSearchResults = (query: string): PublicSearchResults => ({
  query,
  results: {
    tracks: tracks.filter((track) =>
      track.title.toLowerCase().includes(query.toLowerCase()),
    ),
    albums: album.title.toLowerCase().includes(query.toLowerCase())
      ? [album]
      : [],
    playlists: mockArtistPage.playlists.filter((playlist) =>
      playlist.title.toLowerCase().includes(query.toLowerCase()),
    ),
    artists: artist.displayName.toLowerCase().includes(query.toLowerCase())
      ? [artist]
      : [],
    genres: mockDiscoverTracks.genres.filter((genre) =>
      genre.name.toLowerCase().includes(query.toLowerCase()),
    ),
  },
  meta: {
    hasResults: true,
    totals: {
      tracks: 1,
      albums: 1,
      playlists: 1,
      artists: 1,
      genres: 2,
    },
  },
});

export const mockForYou: ForYouResponse = {
  items: tracks.map((track, index) => ({
    trackId: String(track.id),
    rank: index + 1,
    score: 100 - index * 7,
    reasons:
      index === 0 ? ["trending", "recent_like_overlap"] : ["new_release"],
    candidateSource: index === 0 ? "personalized" : "trending",
    personalized: index === 0,
    track,
  })),
  nextCursor: null,
  surface: "discover_for_you",
  meta: {
    algorithmVersion: "phase2-v1",
    totalItems: tracks.length,
    personalized: true,
    servedBatchId: "fixture-batch",
  },
};

// Popular tracks — same pool, reversed order to give fixture variety across lanes
export const mockPopularTracks = [...tracks].reverse();

// Recently played — last two tracks only (simulates sparse auth-only history)
export const mockRecentlyPlayedTracks = tracks.slice(1);

export const mockSession: MicboxxSession = {
  user: {
    id: 51,
    uuid: "listener-51",
    username: "darrell",
    displayName: "Darrell Green",
    avatarUrl: "https://i.pravatar.cc/120?u=darrell",
    email: "listener@example.com",
    roles: ["authenticated", "listener"],
    capabilities: [],
    permissions: {
      canUploadTracks: false,
      canAdministerTracks: false,
      canSellCatalog: false,
      canCreatePlaylists: true,
      canAdministerPlaylists: true,
      canCreateAlbums: false,
      canAdministerAlbums: false,
    },
  },
  accessToken: "fixture-access-token",
  refreshToken: "fixture-refresh-token",
  accessTokenExpiresAt: Date.now() + 1000 * 60 * 60,
  entitlements: {
    hasListenerSubscription: false,
    capabilities: [],
    purchasedTrackIds: [],
    purchasedAlbumIds: [],
  },
};

export const mockSubscriberSession: MicboxxSession = {
  ...mockSession,
  user: {
    ...mockSession.user,
    roles: [...mockSession.user.roles, "subscriber"],
    capabilities: ["listener.subscription"],
  },
  entitlements: {
    hasListenerSubscription: true,
    capabilities: ["listener.subscription"],
    purchasedTrackIds: [],
    purchasedAlbumIds: [],
  },
};

export const mockPurchasedTrackSession: MicboxxSession = {
  ...mockSession,
  entitlements: {
    hasListenerSubscription: false,
    capabilities: [],
    purchasedTrackIds: ["104"],
    purchasedAlbumIds: [],
  },
};
