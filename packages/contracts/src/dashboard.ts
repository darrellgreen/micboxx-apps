// Creator dashboard contract types.
//
// Mirrors the shapes defined in `micboxx-web/src/lib/drupal-dashboard.ts`.
// These are the payloads returned by `/v1/dashboard/*` endpoints on Drupal.
// All responses are wrapped in a `{ data: ... }` envelope at the transport
// layer; the types below describe the unwrapped payload.

export interface DashboardOption {
  id: number;
  name?: string;
  title?: string;
  slug?: string;
  published?: boolean;
}

export interface DashboardUploadPolicy {
  trackLimit: number | null;
  tracksUsed: number;
  remainingTracks: number | null;
  maxFiles: number;
  canMultiUpload: boolean;
  isUnlimited: boolean;
}

/**
 * Authoritative current-user shape returned by `/v1/dashboard/upload-options`.
 * Used to hydrate `MicboxxSessionUser` during sign-in and also standalone on
 * dashboard bootstraps.
 */
export interface DashboardCurrentUser {
  id: number;
  uuid: string;
  username: string;
  displayName: string;
  email: string;
  roles: string[];
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

export interface DashboardUploadOptions {
  currentUser: DashboardCurrentUser;
  uploadPolicy: DashboardUploadPolicy;
  genres: (DashboardOption & { name: string })[];
  albums: (DashboardOption & {
    title: string;
    slug: string;
    published: boolean;
  })[];
}

export type DashboardTrackEditorOptions = Pick<
  DashboardUploadOptions,
  "genres" | "albums"
>;

export type DashboardProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export interface DashboardTrackStatus {
  published: boolean;
  processing: DashboardProcessingStatus;
  error: string | null;
  attempts: number;
  processedAt: string | null;
  ready: boolean;
  canRetry: boolean;
  canRequeue: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  maxAttempts: number;
}

export interface DashboardTrack {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  duration: number;
  description: string | null;
  owner: {
    id: number;
    displayName: string;
  };
  genre: {
    id: number;
    name: string;
  } | null;
  album: {
    id: number;
    title: string;
  } | null;
  status: DashboardTrackStatus;
  assets: {
    artworkUrl: string | null;
    sourceAudioUrl: string | null;
    processedAudioUrl: string | null;
    demoAudioUrl: string | null;
    waveforms: {
      light: string | null;
      dark: string | null;
      day: string | null;
    };
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  commerce: {
    isPurchasable: boolean;
    price: string | null;
    currency: string | null;
    isSubscriberOnly: boolean;
  };
  permissions: {
    canEdit: boolean;
    canPublish: boolean;
    canDelete: boolean;
    canReplaceArtwork: boolean;
    canReplaceSourceAudio: boolean;
    canEditCommerce: boolean;
  };
}

export interface TrackMetadataUpdate {
  title?: string;
  description?: string;
  genreId?: number | null;
  albumId?: number | null;
  isPurchasable?: boolean;
  purchasePrice?: string | null;
  purchaseCurrency?: string | null;
  isSubscriberOnly?: boolean;
}

export interface DashboardTrackSummary {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  duration: number;
  genre: DashboardTrack["genre"];
  album: DashboardTrack["album"];
  status: DashboardTrackStatus;
  artworkUrl: string | null;
  timestamps: DashboardTrack["timestamps"];
}

export interface DashboardListMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface DashboardTrackList {
  tracks: DashboardTrackSummary[];
  meta: DashboardListMeta & {
    summary: {
      ready: number;
      failed: number;
      published: number;
    };
  };
}

export type DashboardAnalyticsPeriod = "7d" | "30d" | "90d";

export interface CreatorDashboardRevenue {
  snapshot: {
    grossRevenue: number | null;
    salesCount: number | null;
    topEarningTrack: {
      title: string | null;
      amount: number | null;
    };
    topEarningAlbum: {
      title: string | null;
      amount: number | null;
    };
  } | null;
  topEarningReleases: {
    type: "track" | "album";
    id: number;
    title: string;
    artworkUrl: string | null;
    revenue: number;
    unitsSold: number | null;
    isPurchasable: boolean;
    href: string;
  }[];
  monetizationReadiness: {
    purchasableTracks: number;
    purchasableAlbums: number;
    subscriberOnlyTracks: number;
    unmonetizedPublishedTracks: number;
    recommendedAction: {
      label: string;
      href: string;
    } | null;
  } | null;
  sellingLocked: boolean;
}

export interface CreatorAnalyticsPayload {
  overview: {
    planLabel: string | null;
    summary: string | null;
    period: DashboardAnalyticsPeriod;
    primaryCta: {
      label: string;
      href: string;
    } | null;
  };
  access: {
    planKey: string | null;
    hasAdvancedAnalytics: boolean;
    hasPremiumAnalytics: boolean;
    canSellCatalog: boolean;
  };
  basic: {
    publishedTracks: number;
    totalPlays: number;
    qualifiedPlays: number;
    uniqueListeners: number;
    completionRate: number;
    topSource: {
      sourceType: string;
      qualifiedPlays: number;
      sharePercent: number;
    } | null;
    topCountry: {
      countryCode: string;
      qualifiedPlays: number;
      sharePercent: number;
    } | null;
    topTrack: {
      trackId: number;
      title: string;
      plays: number;
      href?: string | null;
    } | null;
  };
  hero: {
    playsOverTime: {
      label: string;
      plays: number;
    }[];
  };
  catalogPerformance: {
    topTracks: {
      trackId: number;
      title: string;
      plays: number;
      momentumLabel?: string;
      href?: string | null;
      isPurchasable?: boolean;
      isSubscriberOnly?: boolean;
      artworkUrl?: string | null;
      qualifiedPlays?: number;
      uniqueListeners?: number;
      completionRate?: number;
    }[];
    rankingSummary?: {
      bestPerformerTitle: string | null;
      bestPerformerPlays: number | null;
      topTrackSharePercent: number;
      tracksWithMomentum: number;
    } | null;
  };
  advanced: {
    topPerformingTracks: {
      trackId: number;
      title: string;
      plays: number;
      rank: number;
      momentumLabel?: string;
      artworkUrl?: string | null;
      qualifiedPlays?: number;
      uniqueListeners?: number;
      completionRate?: number;
    }[];
    sourceBreakdown?: {
      sourceType: string;
      qualifiedPlays: number;
      sharePercent: number;
    }[];
    geography?: {
      countryCode: string;
      qualifiedPlays: number;
      sharePercent: number;
    }[];
  } | null;
  premium: {
    performanceWindows?: {
      label: string;
      plays: number;
    }[];
    comparativeRanking?: {
      trackId: number;
      title: string;
      plays: number;
      rank: number;
      momentumLabel?: string;
      artworkUrl?: string | null;
    }[];
    returningAudience?: {
      firstTimeListeners: number;
      returningListeners: number;
      returningSharePercent: number;
    } | null;
    repeatListeningLeaders?: {
      trackId: number;
      title: string;
      slug: string;
      qualifiedPlays: number;
      uniqueListeners: number;
      repeatRate: number;
    }[];
    crossWindowPerformance?: {
      window: string;
      qualifiedPlays: number;
      uniqueListeners: number;
    }[];
  } | null;
  revenue: CreatorDashboardRevenue | null;
  actions: {
    key: string;
    title: string;
    description: string;
    href: string;
    variant?: "primary" | "secondary" | "upgrade";
  }[];
  generatedAt: string;
}

// ── Albums ───────────────────────────────────────────────────────────────

export interface DashboardAlbumTrack {
  trackId: number;
  title: string;
  slug: string;
  duration: number;
  artist: {
    id: number;
    displayName: string;
  } | null;
  genre: {
    id: number;
    name: string;
  } | null;
  artworkUrl: string | null;
  status: {
    published: boolean;
    processing: DashboardProcessingStatus;
    ready: boolean;
    publicReady: boolean;
  };
  publicHref: string | null;
}

export interface DashboardAlbum {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  description: string | null;
  owner: {
    id: number;
    displayName: string;
  } | null;
  artworkUrl: string | null;
  commerce: {
    isPurchasable: boolean;
    price: string | null;
    currency: string | null;
  };
  status: {
    published: boolean;
    canPublish: boolean;
    canUnpublish: boolean;
  };
  counts: {
    tracks: number;
    publicReadyTracks: number;
    duration: number;
  };
  tracks: DashboardAlbumTrack[];
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  permissions: {
    canEdit: boolean;
    canPublish: boolean;
    canDelete: boolean;
    canEditCommerce: boolean;
  };
  href: string;
  publicHref: string;
}

export interface DashboardAlbumSummary {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  description: string | null;
  artworkUrl: string | null;
  status: {
    published: boolean;
  };
  counts: {
    tracks: number;
    publicReadyTracks: number;
    duration: number;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  href: string;
}

export interface DashboardAlbumList {
  albums: DashboardAlbumSummary[];
  meta: DashboardListMeta & {
    summary: {
      published: number;
    };
  };
}

export interface AlbumMetadataUpdate {
  title?: string;
  description?: string;
  trackIds?: number[];
  isPurchasable?: boolean;
  purchasePrice?: string | null;
  purchaseCurrency?: string | null;
}

// ── Playlists ────────────────────────────────────────────────────────────

export interface DashboardPlaylistTrack {
  position: number;
  trackId: number;
  title: string;
  slug: string;
  duration: number;
  artist: {
    id: number;
    displayName: string;
  } | null;
  genre: {
    id: number;
    name: string;
  } | null;
  album: {
    id: number;
    title: string;
  } | null;
  artworkUrl: string | null;
  audioUrl: string | null;
  demoAudioUrl: string | null;
  status: {
    published: boolean;
    processing: DashboardProcessingStatus;
    ready: boolean;
    publicReady: boolean;
    reason: string | null;
  };
  isPublicReady: boolean;
  publicHref: string | null;
}

export interface DashboardPlaylist {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  description: string | null;
  owner: {
    id: number;
    displayName: string;
  } | null;
  artworkUrl: string | null;
  status: {
    published: boolean;
    canPublish: boolean;
    canUnpublish: boolean;
  };
  counts: {
    tracks: number;
    publicReadyTracks: number;
    blockedTracks: number;
    duration: number;
  };
  tracks: DashboardPlaylistTrack[];
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  permissions: {
    canEdit: boolean;
    canPublish: boolean;
    canDelete: boolean;
    canAddTracks: boolean;
    canRemoveTracks: boolean;
    canReorderTracks: boolean;
  };
  href: string;
  publicHref: string;
}

export interface DashboardPlaylistSummary {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  description: string | null;
  artworkUrl: string | null;
  status: {
    published: boolean;
  };
  counts: {
    tracks: number;
    publicReadyTracks: number;
    blockedTracks: number;
    duration: number;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  href: string;
}

export interface DashboardPlaylistList {
  playlists: DashboardPlaylistSummary[];
  meta: DashboardListMeta;
}

export interface PlaylistMetadataUpdate {
  title?: string;
  description?: string;
}

export interface DashboardPlaylistTrackOption {
  id: number;
  title: string;
  slug: string;
  duration: number;
  artist: {
    id: number;
    displayName: string;
    verifiedBadge?: boolean;
  } | null;
  genre: {
    id: number;
    name: string;
  } | null;
  album: {
    id: number;
    title: string;
  } | null;
  status: {
    published: boolean;
    processing: "pending" | "processing" | "ready" | "failed";
    ready: boolean;
    publicReady: boolean;
    reason: string | null;
  };
  eligibility: {
    canAdd: boolean;
    reason: string | null;
  };
  artworkUrl: string | null;
  href: string;
}

export interface DashboardPlaylistOptions {
  currentUser: {
    id: number;
    uuid: string;
    username: string;
    displayName: string;
    email: string;
    roles: string[];
  };
  tracks: DashboardPlaylistTrackOption[];
}

