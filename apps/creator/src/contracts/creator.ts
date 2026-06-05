export type CreatorAccessState =
  | "loading"
  | "creator_ready"
  | "creator_setup_required"
  | "non_creator_blocked"
  | "error";

export type CreatorEligibilityState =
  | "pending"
  | "eligible"
  | "blocked"
  | "error";

export type CreatorEligibilityReasonCode =
  | "bootstrap_pending"
  | "auth_missing"
  | "missing_creator_permissions"
  | "bootstrap_fetch_failed"
  | "eligible";

export interface CreatorEligibilityGate {
  state: CreatorEligibilityState;
  reasonCode: CreatorEligibilityReasonCode;
  eligible: boolean;
  reason: string | null;
  source: "session" | "upload_options" | "system";
}

export type CreatorOnboardingState =
  | "needs_intro"
  | "needs_profile"
  | "needs_album"
  | "needs_first_track"
  | "complete";

export type CreateEntryTarget =
  | "create_album"
  | "upload_track"
  | "continue_backend_draft"
  | "recover_failed_item";

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
  albums: (
    DashboardOption & {
      title: string;
      slug: string;
      published: boolean;
    }
  )[];
}

export type DashboardAnalyticsPeriod = "7d" | "30d" | "90d";

export type DashboardVerificationStatus =
  | "not_requested"
  | "pending"
  | "verified"
  | "rejected"
  | "revoked";

export interface DashboardVerificationState {
  status: DashboardVerificationStatus;
  verifiedBadge: boolean;
  eligible: boolean;
  canRequest: boolean;
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  reason: string | null;
}

export interface DashboardUserProfile {
  id: number;
  uuid: string;
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  links: {
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
  };
  flags: {
    artistProfile: boolean;
    verifiedBadge: boolean;
    emailVerified: boolean;
  };
  verification: DashboardVerificationState;
}

export interface UserProfileUpdate {
  displayName?: string | null;
  bio?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
}

export type DashboardProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type DashboardReleaseState = "draft" | "scheduled" | "published";

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
  releaseState: DashboardReleaseState;
  publishAt: string | null;
  canSchedule: boolean;
  canUnschedule: boolean;
}

export interface DashboardTrack {
  id: number;
  uuid: string;
  publicHref: string | null;
  title: string;
  slug: string;
  duration: number;
  description: string | null;
  owner: {
    id: number;
    displayName: string;
    verifiedBadge?: boolean;
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

export interface DashboardTrackSummary {
  id: number;
  uuid: string;
  publicHref: string | null;
  title: string;
  slug: string;
  duration: number;
  genre: DashboardTrack["genre"];
  album: DashboardTrack["album"];
  status: DashboardTrackStatus;
  artworkUrl: string | null;
  audioUrl?: string | null;
  demoAudioUrl?: string | null;
  timestamps: DashboardTrack["timestamps"];
}

export interface DashboardTrackList {
  tracks: DashboardTrackSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
    summary: {
      ready: number;
      failed: number;
      published: number;
    };
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

export interface DashboardAlbumTrackOption {
  id: number;
  title: string;
  slug: string;
  duration: number;
  status: {
    published: boolean;
    processing: DashboardProcessingStatus;
    ready: boolean;
    publicReady: boolean;
  };
  artworkUrl: string | null;
}

export interface DashboardAlbumOptions {
  currentUser: DashboardCurrentUser;
  tracks: DashboardAlbumTrackOption[];
}

export interface DashboardAlbumTrack {
  trackId: number;
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
  artworkUrl: string | null;
  status: DashboardAlbumTrackOption["status"];
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
    verifiedBadge?: boolean;
  } | null;
  artworkUrl: string | null;
  upc?: string;
  labelImprint?: string;
  explicitContent?: boolean | null;
  commerce: {
    isPurchasable: boolean;
    price: string | null;
    currency: string | null;
  };
  status: {
    published: boolean;
    canPublish: boolean;
    canUnpublish: boolean;
    releaseState: DashboardReleaseState;
    publishAt: string | null;
    canSchedule: boolean;
    canUnschedule: boolean;
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
    releaseState: DashboardReleaseState;
    publishAt: string | null;
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
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
    summary: {
      published: number;
    };
  };
}

export interface DashboardRoomSummary {
  room_id: number;
  room_route: string;
  release_ref_type: "album";
  release_ref_id: number;
  release_identifier: string;
  release_title: string;
  artist_name: string;
  artist_username: string | null;
  artwork_url: string | null;
  room_status: "awakened" | "unvisited" | "dormant" | string;
  claim_state: string;
  visibility: string;
  moderation_state: string;
  has_room: boolean;
  has_visits: boolean;
  awakened_at: number | null;
  last_activity_at: number | null;
  artist_presence_state: "active" | "none" | string;
  state_line: string;
  room_summary_text: string;
  entry_cta_label: string;
  capabilities: {
    can_enter_room: boolean;
    can_show_support: boolean;
    can_view_support_goal: boolean;
  };
  management_capabilities: {
    can_manage_room: boolean;
    can_manage_moments: boolean;
    can_artist_drop_in: boolean;
    can_start_drop_in: boolean;
    can_end_drop_in: boolean;
    can_start_live_video: boolean;
  };
  release_status: "published";
}

export interface DashboardRoomList {
  rooms: DashboardRoomSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
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

export type CreatorReadinessState = "ready" | "needs_attention" | "blocked";

export type CreatorReadinessSeverity = "warning" | "blocker";

export type CreatorReadinessReasonCode =
  | "no_tracks_uploaded"
  | "processing_failures_present"
  | "tracks_missing_album_assignment"
  | "draft_tracks_pending_publish"
  | "tracks_missing_metadata"
  | "ready_tracks_unpublished";

export type CreatorReadinessActionKey =
  | "create_album"
  | "upload_track"
  | "recover_failed_item"
  | "continue_backend_draft"
  | "review_catalog_metadata"
  | "publish_ready_tracks";

export interface CreatorReadinessAction {
  key: CreatorReadinessActionKey;
  label: string;
  href: string;
}

export interface CreatorCatalogHealthIssue {
  code: CreatorReadinessReasonCode;
  severity: CreatorReadinessSeverity;
  title: string;
  description: string;
  affectedCount: number;
  action: CreatorReadinessAction | null;
}

export interface CreatorCatalogHealth {
  state: CreatorReadinessState;
  summary: {
    totalTracks: number;
    totalAlbums: number;
    publishedTracks: number;
    readyTracks: number;
    draftTracks: number;
    failedProcessingTracks: number;
    missingMetadataTracks: number;
    missingAlbumTracks: number;
    blockerCount: number;
    warningCount: number;
  };
  issues: CreatorCatalogHealthIssue[];
  nextAction: CreatorReadinessAction | null;
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
  hero?: {
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
      artworkUrl?: string | null;
      isPurchasable?: boolean;
      isSubscriberOnly?: boolean;
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
  catalogHealth?: CreatorCatalogHealth;
  readiness?: {
    state: CreatorReadinessState;
    reasonCodes: CreatorReadinessReasonCode[];
    blockerCount: number;
    warningCount: number;
    nextAction: CreatorReadinessAction | null;
  };
  advanced?: {
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
  premium?: {
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

export interface CreatorMetricCard {
  key: string;
  title: string;
  value: string;
  subtitle?: string;
  href?: string;
}

export interface CreatorActionCard {
  key: string;
  title: string;
  description: string;
  href: string;
  tone?: "default" | "warning" | "success";
}

export interface CreatorActivityCard {
  key: string;
  title: string;
  description: string;
  href: string;
  count?: number;
}

export interface CreatorCatalogReadiness {
  hasAlbums: boolean;
  hasTracks: boolean;
  hasBackendDraftTracks: boolean;
  hasScheduledReleases: boolean;
  hasFailedProcessing: boolean;
  hasPublishedReleases: boolean;
}

export interface CreatorAudienceSummary<TConversation, TNotification> {
  unreadMessageCount: number;
  unreadNotificationCount: number;
  recentConversations: TConversation[];
  recentNotifications: TNotification[];
}

export interface CreatorBootstrapSummary<
  TConversation = unknown,
  TNotification = unknown,
> {
  eligibility: CreatorEligibilityGate;
  accessState: CreatorAccessState;
  onboardingState: CreatorOnboardingState;
  createEntryTarget: CreateEntryTarget;
  dashboardBuckets: {
    performance: CreatorMetricCard[];
    actionNeeded: CreatorActionCard[];
    activity: CreatorActivityCard[];
  };
  catalogReadiness: CreatorCatalogReadiness;
  audienceSummary: CreatorAudienceSummary<TConversation, TNotification>;
}
