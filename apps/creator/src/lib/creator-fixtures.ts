import { env } from "@/config/env";
import type {
  CreatorAnalyticsPayload,
  CreatorCatalogHealth,
  CreatorCatalogHealthIssue,
  DashboardAlbum,
  DashboardAlbumList,
  DashboardAlbumOptions,
  DashboardAlbumSummary,
  DashboardTrack,
  DashboardTrackList,
  DashboardTrackSummary,
  DashboardUploadOptions,
  DashboardUserProfile,
} from "@/contracts/creator";
import type { MicboxxSession, MicboxxSessionUser ,
  DirectConversation,
  DirectMessage,
  SocialNotification,
  UserConversationInboxItem,
} from "@micboxx/contracts";

export type CreatorFixtureScenario =
  | "creator_ready"
  | "needs_profile"
  | "needs_album"
  | "needs_track"
  | "non_creator"
  | "failed_processing";

type FixtureConversationState = {
  conversation: DirectConversation;
  messages: DirectMessage[];
};

type CreatorFixtureState = {
  session: MicboxxSession;
  profile: DashboardUserProfile;
  tracks: DashboardTrack[];
  albums: DashboardAlbum[];
  notifications: SocialNotification[];
  inboxItems: UserConversationInboxItem[];
  conversations: Record<string, FixtureConversationState>;
};

type CreatorFixtureListener = () => void;

const genres: DashboardUploadOptions["genres"] = [
  { id: 1, name: "Electronic" },
  { id: 2, name: "Alternative" },
  { id: 3, name: "Hip-Hop" },
];

const fixtureListeners = new Set<CreatorFixtureListener>();
const fixtureStores = new Map<CreatorFixtureScenario, CreatorFixtureState>();

let nextTrackId = 9200;
let nextAlbumId = 4200;
let nextMessageId = 100;

function isoMinutesAgo(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function scenarioFromEnv(): CreatorFixtureScenario {
  const value = env.creatorFixtureScenario;
  switch (value) {
    case "needs_profile":
    case "needs_album":
    case "needs_track":
    case "non_creator":
    case "failed_processing":
    case "creator_ready":
      return value;
    default:
      return "creator_ready";
  }
}

function notifyFixtureListeners() {
  for (const listener of fixtureListeners) {
    listener();
  }
}

export function subscribeCreatorFixture(listener: CreatorFixtureListener) {
  fixtureListeners.add(listener);
  return () => {
    fixtureListeners.delete(listener);
  };
}

function buildCurrentUser(input: {
  id: number;
  uuid: string;
  username: string;
  displayName: string;
  email: string;
  roles: string[];
  creatorCapable: boolean;
}): MicboxxSessionUser {
  return {
    id: input.id,
    uuid: input.uuid,
    username: input.username,
    displayName: input.displayName,
    email: input.email,
    roles: input.roles,
    capabilities: input.creatorCapable ? ["creator.mobile"] : [],
    permissions: {
      canUploadTracks: input.creatorCapable,
      canAdministerTracks: input.creatorCapable,
      canSellCatalog: input.creatorCapable,
      canCreatePlaylists: false,
      canAdministerPlaylists: false,
      canCreateAlbums: input.creatorCapable,
      canAdministerAlbums: input.creatorCapable,
    },
  };
}

function buildProfile(
  sessionUser: MicboxxSessionUser,
  overrides?: Partial<DashboardUserProfile>,
): DashboardUserProfile {
  return {
    id: sessionUser.id,
    uuid: sessionUser.uuid,
    username: sessionUser.username,
    displayName: sessionUser.displayName,
    email: sessionUser.email,
    bio: "Independent electronic artist building directly with listeners.",
    avatarUrl: `https://i.pravatar.cc/240?u=${sessionUser.uuid}`,
    coverUrl: `https://picsum.photos/seed/${sessionUser.uuid}/1200/480`,
    links: {
      website: "https://micboxx.com",
      instagram: "@micboxxartist",
      facebook: null,
      twitter: "@micboxxartist",
    },
    flags: {
      artistProfile: true,
      verifiedBadge: false,
      emailVerified: true,
    },
    verification: {
      status: "not_requested",
      verifiedBadge: false,
      eligible: true,
      canRequest: true,
      requestedAt: null,
      reviewedAt: null,
      reviewedByUserId: null,
      reason: null,
    },
    ...overrides,
  };
}

function buildTrack(input: {
  id: number;
  title: string;
  slug: string;
  album: { id: number; title: string } | null;
  genre: { id: number; name: string } | null;
  releaseState: "draft" | "scheduled" | "published";
  processing: "pending" | "processing" | "ready" | "failed";
  published?: boolean;
  publishAt?: string | null;
  description?: string | null;
  error?: string | null;
  isPurchasable?: boolean;
  price?: string | null;
  isSubscriberOnly?: boolean;
  createdAt?: string;
  updatedAt?: string;
  owner: { id: number; displayName: string };
}): DashboardTrack {
  const published = input.published ?? input.releaseState === "published";
  const createdAt = input.createdAt ?? isoMinutesAgo(720);
  const updatedAt = input.updatedAt ?? isoMinutesAgo(15);
  const ready = input.processing === "ready";

  return {
    id: input.id,
    uuid: `fixture-track-${input.id}`,
    publicHref: `/tracks/${input.slug}`,
    title: input.title,
    slug: input.slug,
    duration: 215,
    description: input.description ?? null,
    owner: input.owner,
    genre: input.genre,
    album: input.album,
    status: {
      published,
      processing: input.processing,
      error: input.error ?? null,
      attempts: input.processing === "failed" ? 2 : 1,
      processedAt: ready ? updatedAt : null,
      ready,
      canRetry: input.processing === "failed",
      canRequeue: input.processing === "failed",
      canPublish: ready && input.releaseState !== "published",
      canUnpublish: published,
      maxAttempts: 3,
      releaseState: input.releaseState,
      publishAt: input.publishAt ?? null,
      canSchedule: ready && input.releaseState !== "scheduled",
      canUnschedule: input.releaseState === "scheduled",
    },
    assets: {
      artworkUrl: `https://picsum.photos/seed/track-${input.id}/800/800`,
      sourceAudioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      processedAudioUrl: ready
        ? "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
        : null,
      demoAudioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      waveforms: {
        light: null,
        dark: null,
        day: null,
      },
    },
    timestamps: {
      createdAt,
      updatedAt,
    },
    commerce: {
      isPurchasable: input.isPurchasable ?? false,
      price: input.price ?? null,
      currency: input.isPurchasable ? "USD" : null,
      isSubscriberOnly: input.isSubscriberOnly ?? false,
    },
    rightsAttested: true,
    permissions: {
      canEdit: true,
      canPublish: true,
      canDelete: false,
      canReplaceArtwork: true,
      canReplaceSourceAudio: true,
      canEditCommerce: true,
    },
  };
}

function buildAlbum(input: {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  trackIds: number[];
  releaseState: "draft" | "scheduled" | "published";
  publishAt?: string | null;
  isPurchasable?: boolean;
  price?: string | null;
  owner: { id: number; displayName: string };
  tracks: DashboardTrack[];
  genre?: { id: number; name: string } | null;
  secondaryGenre?: { id: number; name: string } | null;
}): DashboardAlbum {
  const albumTracks = input.tracks.filter((track) => input.trackIds.includes(track.id));

  return {
    id: input.id,
    uuid: `fixture-album-${input.id}`,
    title: input.title,
    slug: input.slug,
    subtitle: null,
    description: input.description ?? null,
    releaseType: "single" as const,
    owner: input.owner,
    artworkUrl: `https://picsum.photos/seed/album-${input.id}/1200/1200`,
    genre: input.genre ?? null,
    secondaryGenre: input.secondaryGenre ?? null,
    commerce: {
      isPurchasable: input.isPurchasable ?? false,
      price: input.price ?? null,
      currency: input.isPurchasable ? "USD" : null,
    },
    status: {
      published: input.releaseState === "published",
      canPublish: true,
      canUnpublish: input.releaseState === "published",
      releaseState: input.releaseState,
      publishAt: input.publishAt ?? null,
      canSchedule: input.releaseState !== "scheduled",
      canUnschedule: input.releaseState === "scheduled",
    },
    counts: {
      tracks: albumTracks.length,
      publicReadyTracks: albumTracks.filter((track) => track.status.ready).length,
      duration: albumTracks.reduce((sum, track) => sum + track.duration, 0),
    },
    tracks: albumTracks.map((track) => ({
      trackId: track.id,
      title: track.title,
      slug: track.slug,
      duration: track.duration,
      artist: track.owner,
      genre: track.genre,
      artworkUrl: track.assets.artworkUrl,
      status: {
        published: track.status.published,
        processing: track.status.processing,
        ready: track.status.ready,
        publicReady: track.status.ready && track.status.published,
      },
      rightsAttested: true,
      publicHref: track.publicHref,
    })),
    timestamps: {
      createdAt: isoMinutesAgo(1_440),
      updatedAt: isoMinutesAgo(30),
    },
    permissions: {
      canEdit: true,
      canPublish: true,
      canDelete: false,
      canEditCommerce: true,
    },
    href: `/catalog/albums/${input.id}`,
    publicHref: `/albums/${input.slug}`,
  };
}

function toTrackSummary(track: DashboardTrack): DashboardTrackSummary {
  return {
    id: track.id,
    uuid: track.uuid,
    publicHref: track.publicHref,
    title: track.title,
    slug: track.slug,
    duration: track.duration,
    genre: track.genre,
    album: track.album,
    status: track.status,
    artworkUrl: track.assets.artworkUrl,
    audioUrl: track.assets.processedAudioUrl,
    demoAudioUrl: track.assets.demoAudioUrl,
    timestamps: track.timestamps,
  };
}

function toAlbumSummary(album: DashboardAlbum): DashboardAlbumSummary {
  return {
    id: album.id,
    uuid: album.uuid,
    title: album.title,
    slug: album.slug,
    subtitle: album.subtitle,
    description: album.description,
    releaseType: album.releaseType,
    artworkUrl: album.artworkUrl,
    status: {
      published: album.status.published,
      releaseState: album.status.releaseState,
      publishAt: album.status.publishAt,
    },
    counts: album.counts,
    timestamps: album.timestamps,
    href: album.href,
  };
}

function buildNotifications(userUid: string): SocialNotification[] {
  return [
    {
      id: "notif-1",
      userUid,
      type: "direct_message",
      actorUid: "fan-1",
      actorUsername: "sablewaves",
      actorDisplayName: "Sable Waves",
      trackId: "9101",
      trackTitle: "Afterimage District",
      commentId: null,
      commentPreview: null,
      conversationId: "conversation-1",
      messageId: "message-1",
      messagePreview: "Loved the new mix on this one.",
      href: "/audience/inbox/conversation-1",
      isRead: false,
      createdAt: isoMinutesAgo(20),
      readAt: null,
      seenAt: null,
    },
    {
      id: "notif-2",
      userUid,
      type: "track_like",
      actorUid: "fan-2",
      actorUsername: "moonstatic",
      actorDisplayName: "Moon Static",
      trackId: "9102",
      trackTitle: "Circuit Garden",
      commentId: null,
      commentPreview: null,
      conversationId: null,
      messageId: null,
      messagePreview: null,
      href: "/catalog/tracks/9102",
      isRead: true,
      createdAt: isoMinutesAgo(180),
      readAt: isoMinutesAgo(160),
      seenAt: isoMinutesAgo(160),
    },
  ];
}

function buildConversationState(userUid: string): Record<string, FixtureConversationState> {
  const conversationId = "conversation-1";

  return {
    [conversationId]: {
      conversation: {
        id: conversationId,
        type: "direct",
        participantUids: [userUid, "fan-1"],
        participantUsernames: ["fixturecreator", "sablewaves"],
        participantDisplayNames: ["Fixture Creator", "Sable Waves"],
        participantHrefs: ["/account", "/users/sablewaves"],
        createdAt: isoMinutesAgo(3_000),
        updatedAt: isoMinutesAgo(18),
        lastMessageAt: isoMinutesAgo(18),
        lastMessageSenderUid: "fan-1",
        lastMessagePreview: "Loved the new mix on this one.",
      },
      messages: [
        {
          id: "message-1",
          conversationId,
          senderUid: "fan-1",
          senderUsername: "sablewaves",
          senderDisplayName: "Sable Waves",
          body: "Loved the new mix on this one.",
          status: "active",
          createdAt: isoMinutesAgo(18),
          updatedAt: isoMinutesAgo(18),
        },
        {
          id: "message-2",
          conversationId,
          senderUid: userUid,
          senderUsername: "fixturecreator",
          senderDisplayName: "Fixture Creator",
          body: "Appreciate that. More coming this week.",
          status: "active",
          createdAt: isoMinutesAgo(12),
          updatedAt: isoMinutesAgo(12),
        },
      ],
    },
  };
}

function buildInboxItems(userUid: string): UserConversationInboxItem[] {
  return [
    {
      id: `${userUid}__conversation-1`,
      conversationId: "conversation-1",
      userUid,
      conversationType: "direct",
      otherParticipantUid: "fan-1",
      otherParticipantUsername: "sablewaves",
      otherParticipantDisplayName: "Sable Waves",
      otherParticipantHref: "/users/sablewaves",
      unreadCount: 2,
      lastReadAt: null,
      createdAt: isoMinutesAgo(3_000),
      updatedAt: isoMinutesAgo(18),
      lastMessageAt: isoMinutesAgo(18),
      lastMessageSenderUid: "fan-1",
      lastMessagePreview: "Loved the new mix on this one.",
    },
  ];
}

function buildScenarioState(scenario: CreatorFixtureScenario): CreatorFixtureState {
  const creatorCapable = scenario !== "non_creator";
  const sessionUser = buildCurrentUser({
    id: scenario === "non_creator" ? 730 : 620,
    uuid: `fixture-${scenario}`,
    username: scenario === "non_creator" ? "fixturelistener" : "fixturecreator",
    displayName: scenario === "non_creator" ? "Fixture Listener" : "Fixture Creator",
    email:
      scenario === "non_creator"
        ? "listener-fixture@micboxx.test"
        : `${scenario}@micboxx.test`,
    roles: creatorCapable
      ? ["authenticated", "artist"]
      : ["authenticated", "listener"],
    creatorCapable,
  });

  const session: MicboxxSession = {
    user: sessionUser,
    accessToken: `fixture-${scenario}-access-token`,
    refreshToken: `fixture-${scenario}-refresh-token`,
    accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
    entitlements: {
      hasListenerSubscription: false,
      capabilities: creatorCapable ? ["creator.mobile"] : [],
      purchasedTrackIds: [],
      purchasedAlbumIds: [],
    },
  };

  const profile = buildProfile(sessionUser, {
    bio:
      scenario === "needs_profile"
        ? ""
        : "Independent electronic artist building directly with listeners.",
    avatarUrl:
      scenario === "needs_profile"
        ? null
        : `https://i.pravatar.cc/240?u=${sessionUser.uuid}`,
  });

  const owner = {
    id: sessionUser.id,
    displayName: sessionUser.displayName,
    verifiedBadge: false,
  };

  let tracks: DashboardTrack[] = [];
  let albums: DashboardAlbum[] = [];

  if (creatorCapable && scenario !== "needs_album") {
    if (scenario === "needs_track") {
      albums = [
        buildAlbum({
          id: 4101,
          title: "First Night Sessions",
          slug: "first-night-sessions",
          description: "Album created, first track still missing.",
          trackIds: [],
          releaseState: "draft",
          owner,
          tracks,
        }),
      ];
    } else if (scenario === "failed_processing") {
      tracks = [
        buildTrack({
          id: 9107,
          title: "Broken Export",
          slug: "broken-export",
          album: { id: 4102, title: "Signal Archive" },
          genre: { id: 1, name: "Electronic" },
          releaseState: "draft",
          processing: "failed",
          error: "Artwork failed validation during processing.",
          description: "A failed upload waiting for recovery.",
          owner,
        }),
      ];
      albums = [
        buildAlbum({
          id: 4102,
          title: "Signal Archive",
          slug: "signal-archive",
          description: "Recovery scenario fixture album.",
          trackIds: [9107],
          releaseState: "draft",
          owner,
          tracks,
        }),
      ];
    } else if (scenario === "creator_ready") {
      tracks = [
        buildTrack({
          id: 9101,
          title: "Afterimage District",
          slug: "afterimage-district",
          album: { id: 4101, title: "Glass City" },
          genre: { id: 1, name: "Electronic" },
          releaseState: "published",
          processing: "ready",
          isPurchasable: true,
          price: "1.29",
          description: "Published and healthy release.",
          owner,
        }),
        buildTrack({
          id: 9102,
          title: "Circuit Garden",
          slug: "circuit-garden",
          album: { id: 4101, title: "Glass City" },
          genre: { id: 2, name: "Alternative" },
          releaseState: "draft",
          processing: "ready",
          description: "Backend draft ready to continue.",
          owner,
        }),
        buildTrack({
          id: 9103,
          title: "Sundial Delay",
          slug: "sundial-delay",
          album: { id: 4103, title: "Blue Meridian" },
          genre: { id: 1, name: "Electronic" },
          releaseState: "scheduled",
          processing: "ready",
          publishAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          description: "Scheduled release for state filter coverage.",
          owner,
        }),
      ];
      albums = [
        buildAlbum({
          id: 4101,
          title: "Glass City",
          slug: "glass-city",
          description: "Primary published release.",
          trackIds: [9101, 9102],
          releaseState: "published",
          isPurchasable: true,
          price: "5.99",
          owner,
          tracks,
          genre: { id: 1, name: "Electronic" },
          secondaryGenre: { id: 2, name: "Alternative" },
        }),
        buildAlbum({
          id: 4103,
          title: "Blue Meridian",
          slug: "blue-meridian",
          description: "Upcoming scheduled release.",
          trackIds: [9103],
          releaseState: "scheduled",
          publishAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          owner,
          tracks,
          genre: { id: 1, name: "Electronic" },
        }),
      ];
    }
  }

  return {
    session,
    profile,
    tracks,
    albums,
    notifications: buildNotifications(sessionUser.uuid),
    inboxItems: buildInboxItems(sessionUser.uuid),
    conversations: buildConversationState(sessionUser.uuid),
  };
}

function getFixtureState(): CreatorFixtureState {
  const scenario = scenarioFromEnv();
  const existing = fixtureStores.get(scenario);
  if (existing) {
    return existing;
  }

  const state = buildScenarioState(scenario);
  fixtureStores.set(scenario, state);
  return state;
}

function syncAlbumMembership(state: CreatorFixtureState) {
  state.albums = state.albums.map((album) =>
    buildAlbum({
      id: album.id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      trackIds: state.tracks
        .filter((track) => track.album?.id === album.id)
        .map((track) => track.id),
      releaseState: album.status.releaseState,
      publishAt: album.status.publishAt,
      isPurchasable: album.commerce.isPurchasable,
      price: album.commerce.price,
      owner: album.owner ?? {
        id: state.session.user.id,
        displayName: state.session.user.displayName,
      },
      tracks: state.tracks,
      genre: album.genre,
      secondaryGenre: album.secondaryGenre,
    }),
  );
}

function buildTrackList(state: CreatorFixtureState, page = 1, pageSize = 12): DashboardTrackList {
  const start = (page - 1) * pageSize;
  const items = state.tracks.slice(start, start + pageSize).map(toTrackSummary);
  return {
    tracks: items,
    meta: {
      page,
      pageSize,
      total: state.tracks.length,
      hasMore: start + pageSize < state.tracks.length,
      summary: {
        ready: state.tracks.filter((track) => track.status.ready).length,
        failed: state.tracks.filter((track) => track.status.processing === "failed").length,
        published: state.tracks.filter((track) => track.status.releaseState === "published").length,
      },
    },
  };
}

function buildAlbumList(state: CreatorFixtureState, page = 1, pageSize = 12): DashboardAlbumList {
  const start = (page - 1) * pageSize;
  const items = state.albums.slice(start, start + pageSize).map(toAlbumSummary);
  return {
    albums: items,
    meta: {
      page,
      pageSize,
      total: state.albums.length,
      hasMore: start + pageSize < state.albums.length,
      summary: {
        published: state.albums.filter((album) => album.status.releaseState === "published").length,
      },
    },
  };
}

function buildUploadOptions(state: CreatorFixtureState): DashboardUploadOptions {
  return {
    currentUser: {
      id: state.session.user.id,
      uuid: state.session.user.uuid,
      username: state.session.user.username,
      displayName: state.session.user.displayName,
      email: state.session.user.email,
      roles: state.session.user.roles,
      permissions: state.session.user.permissions,
    },
    uploadPolicy: {
      trackLimit: 50,
      tracksUsed: state.tracks.length,
      remainingTracks: Math.max(0, 50 - state.tracks.length),
      maxFiles: 1,
      canMultiUpload: false,
      isUnlimited: false,
    },
    genres,
    albums: state.albums.map((album) => ({
      id: album.id,
      title: album.title,
      slug: album.slug,
      published: album.status.published,
    })),
  };
}

function buildAlbumOptions(state: CreatorFixtureState): DashboardAlbumOptions {
  return {
    currentUser: buildUploadOptions(state).currentUser,
    genres,
    tracks: state.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      slug: track.slug,
      duration: track.duration,
      status: {
        published: track.status.published,
        processing: track.status.processing,
        ready: track.status.ready,
        publicReady: track.status.ready && track.status.published,
      },
      artworkUrl: track.assets.artworkUrl,
    })),
  };
}

function buildAnalytics(state: CreatorFixtureState): CreatorAnalyticsPayload {
  const publishedTracks = state.tracks.filter(
    (track) => track.status.releaseState === "published",
  );
  const rankedSource = (publishedTracks.length > 0 ? publishedTracks : state.tracks)
    .slice(0, 8);
  const rankedTracks = rankedSource.map((track, index) => {
    const plays = Math.max(48, 1264 - index * 168);
    const qualifiedPlays = Math.max(24, Math.round(plays * 0.82));
    const uniqueListeners = Math.max(12, Math.round(qualifiedPlays * 0.37));
    const completionRate = Math.max(52, 74 - index * 3);

    return {
      trackId: track.id,
      slug: track.slug,
      title: track.title,
      plays,
      qualifiedPlays,
      uniqueListeners,
      completionRate,
      rank: index + 1,
      momentumLabel: index === 0 ? "Up 18% this week" : index < 3 ? "Growing" : "Stable",
      href: `/catalog/tracks/${track.id}`,
      artworkUrl: track.assets.artworkUrl,
      isPurchasable: track.commerce.isPurchasable,
      isSubscriberOnly: track.commerce.isSubscriberOnly,
    };
  });

  const totalPlays = rankedTracks.reduce((sum, track) => sum + track.plays, 0);
  const qualifiedPlays = rankedTracks.reduce(
    (sum, track) => sum + track.qualifiedPlays,
    0,
  );
  const uniqueListeners = rankedTracks.reduce(
    (sum, track) => sum + track.uniqueListeners,
    0,
  );
  const averageCompletion = rankedTracks.length
    ? Math.round(
        rankedTracks.reduce((sum, track) => sum + track.completionRate, 0) /
          rankedTracks.length,
      )
    : 0;
  const topTrack = rankedTracks[0] ?? null;
  const sellingLocked = !state.session.user.permissions.canSellCatalog;
  const topTrackSharePercent = totalPlays > 0 && topTrack
    ? Math.round((topTrack.plays / totalPlays) * 100)
    : 0;
  const heroSeries = [
    { label: "W1", plays: Math.max(0, Math.round(totalPlays * 0.14)) },
    { label: "W2", plays: Math.max(0, Math.round(totalPlays * 0.12)) },
    { label: "W3", plays: Math.max(0, Math.round(totalPlays * 0.11)) },
    { label: "W4", plays: Math.max(0, Math.round(totalPlays * 0.1)) },
    { label: "W5", plays: Math.max(0, Math.round(totalPlays * 0.13)) },
    { label: "W6", plays: Math.max(0, Math.round(totalPlays * 0.12)) },
    { label: "W7", plays: Math.max(0, Math.round(totalPlays * 0.15)) },
    { label: "W8", plays: Math.max(0, Math.round(totalPlays * 0.13)) },
  ];

  const actionCards = [];

  if (!state.profile.bio || !state.profile.avatarUrl) {
    actionCards.push({
      key: "complete-profile",
      title: "Complete profile",
      description: "Add a bio and avatar before releasing new work.",
      href: "/account/profile",
      variant: "primary" as const,
    });
  }

  if (state.albums.length === 0) {
    actionCards.push({
      key: "create-album",
      title: "Create album",
      description: "Album setup is required before track upload.",
      href: "/create/album",
      variant: "primary" as const,
    });
  }

  if (state.albums.length > 0 && state.tracks.length === 0) {
    actionCards.push({
      key: "upload-track",
      title: "Upload first track",
      description: "Your first track will unlock the full creator shell.",
      href: "/create/upload",
      variant: "primary" as const,
    });
  }

  if (state.tracks.some((track) => track.status.processing === "failed")) {
    actionCards.push({
      key: "failed-processing",
      title: "Fix failed processing",
      description: "At least one upload needs recovery before it can publish.",
      href: "/dashboard/release-health",
      variant: "secondary" as const,
    });
  }

  const readyTracksCount = state.tracks.filter(
    (track) => track.status.processing === "ready",
  ).length;
  const draftTracksCount = state.tracks.filter(
    (track) => track.status.releaseState === "draft",
  ).length;
  const failedProcessingTracksCount = state.tracks.filter(
    (track) => track.status.processing === "failed",
  ).length;
  const missingMetadataTracksCount = state.tracks.filter((track) => {
    const description = (track.description ?? "").trim();
    return description === "" || track.genre === null || !track.assets.artworkUrl;
  }).length;
  const missingAlbumTracksCount = state.tracks.filter(
    (track) => track.album === null,
  ).length;

  const catalogHealthIssues: CreatorCatalogHealthIssue[] = [];
  const pushCatalogIssue = (
    issue: CreatorCatalogHealthIssue,
  ) => catalogHealthIssues.push(issue);

  if (state.tracks.length === 0) {
    pushCatalogIssue({
      code: "no_tracks_uploaded",
      severity: "blocker",
      title: "Upload your first track",
      description:
        "Your catalog is empty. Add a track to start release readiness checks.",
      affectedCount: 1,
      action: state.albums.length > 0
        ? {
            key: "upload_track",
            label: "Upload track",
            href: "/create/upload",
          }
        : {
            key: "create_album",
            label: "Create album",
            href: "/create/album",
          },
    });
  }

  if (failedProcessingTracksCount > 0) {
    pushCatalogIssue({
      code: "processing_failures_present",
      severity: "blocker",
      title: "Fix failed processing",
      description:
        "One or more uploads failed processing and need recovery before publish.",
      affectedCount: failedProcessingTracksCount,
      action: {
        key: "recover_failed_item",
        label: "Recover failed upload",
        href: "/create",
      },
    });
  }

  if (missingAlbumTracksCount > 0) {
    pushCatalogIssue({
      code: "tracks_missing_album_assignment",
      severity: "blocker",
      title: "Assign tracks to an album",
      description:
        "Album assignment is required for the current creator release workflow.",
      affectedCount: missingAlbumTracksCount,
      action: {
        key: "review_catalog_metadata",
        label: "Open track library",
        href: "/catalog/tracks",
      },
    });
  }

  if (draftTracksCount > 0) {
    pushCatalogIssue({
      code: "draft_tracks_pending_publish",
      severity: "warning",
      title: "Review draft releases",
      description: "Draft tracks are waiting for final review and publish.",
      affectedCount: draftTracksCount,
      action: {
        key: "continue_backend_draft",
        label: "Review drafts",
        href: "/create",
      },
    });
  }

  if (missingMetadataTracksCount > 0) {
    pushCatalogIssue({
      code: "tracks_missing_metadata",
      severity: "warning",
      title: "Complete metadata quality checks",
      description:
        "Some tracks are missing required metadata (description, genre, or artwork).",
      affectedCount: missingMetadataTracksCount,
      action: {
        key: "review_catalog_metadata",
        label: "Complete metadata",
        href: "/catalog/tracks",
      },
    });
  }

  if (readyTracksCount > 0 && publishedTracks.length === 0) {
    pushCatalogIssue({
      code: "ready_tracks_unpublished",
      severity: "warning",
      title: "Publish a ready release",
      description: "Ready tracks exist but none are currently published.",
      affectedCount: readyTracksCount,
      action: {
        key: "publish_ready_tracks",
        label: "Publish ready tracks",
        href: "/catalog/tracks",
      },
    });
  }

  const blockerCount = catalogHealthIssues.filter(
    (issue) => issue.severity === "blocker",
  ).length;
  const warningCount = catalogHealthIssues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const catalogHealthState: CreatorCatalogHealth["state"] = blockerCount > 0
    ? "blocked"
    : warningCount > 0
      ? "needs_attention"
      : "ready";
  const nextReadinessAction = catalogHealthIssues.find(
    (issue) => issue.action !== null,
  )?.action ?? null;
  const catalogHealth: CreatorCatalogHealth = {
    state: catalogHealthState,
    summary: {
      totalTracks: state.tracks.length,
      totalAlbums: state.albums.length,
      publishedTracks: publishedTracks.length,
      readyTracks: readyTracksCount,
      draftTracks: draftTracksCount,
      failedProcessingTracks: failedProcessingTracksCount,
      missingMetadataTracks: missingMetadataTracksCount,
      missingAlbumTracks: missingAlbumTracksCount,
      blockerCount,
      warningCount,
    },
    issues: catalogHealthIssues,
    nextAction: nextReadinessAction,
  };
  const readiness = {
    state: catalogHealth.state,
    reasonCodes: catalogHealth.issues.map((issue) => issue.code),
    blockerCount: catalogHealth.summary.blockerCount,
    warningCount: catalogHealth.summary.warningCount,
    nextAction: catalogHealth.nextAction,
  };

  return {
    overview: {
      planLabel: "Creator Starter",
      summary:
        publishedTracks.length > 0
          ? "Recent creator activity and release health."
          : "Complete setup and publish your first release.",
      period: "30d",
      primaryCta: {
        label: state.albums.length === 0 ? "Create album" : "Upload track",
        href: state.albums.length === 0 ? "/create/album" : "/create/upload",
      },
    },
    access: {
      planKey: "creator_starter",
      hasAdvancedAnalytics: true,
      hasPremiumAnalytics: false,
      canSellCatalog: state.session.user.permissions.canSellCatalog,
    },
    basic: {
      publishedTracks: publishedTracks.length,
      totalPlays,
      qualifiedPlays,
      uniqueListeners,
      completionRate: averageCompletion,
      topSource:
        rankedTracks.length > 0
          ? {
              sourceType: "search",
              qualifiedPlays: Math.round(qualifiedPlays * 0.44),
              sharePercent: 44,
            }
          : null,
      topCountry:
        rankedTracks.length > 0
          ? {
              countryCode: "US",
              qualifiedPlays: Math.round(qualifiedPlays * 0.34),
              sharePercent: 34,
            }
          : null,
      topTrack: topTrack
        ? {
            trackId: topTrack.trackId,
            title: topTrack.title,
            plays: topTrack.plays,
            href: topTrack.href,
          }
        : null,
    },
    hero: {
      playsOverTime: heroSeries,
    },
    catalogPerformance: {
      topTracks: rankedTracks.slice(0, 6).map((track) => ({
        trackId: track.trackId,
        title: track.title,
        plays: track.plays,
        momentumLabel: track.momentumLabel,
        href: track.href,
        artworkUrl: track.artworkUrl,
        isPurchasable: track.isPurchasable,
        isSubscriberOnly: track.isSubscriberOnly,
        qualifiedPlays: track.qualifiedPlays,
        uniqueListeners: track.uniqueListeners,
        completionRate: track.completionRate,
      })),
      rankingSummary: topTrack
        ? {
            bestPerformerTitle: topTrack.title,
            bestPerformerPlays: topTrack.plays,
            topTrackSharePercent,
            tracksWithMomentum: rankedTracks.length,
          }
        : null,
    },
    catalogHealth,
    readiness,
    advanced: {
      topPerformingTracks: rankedTracks.slice(0, 5).map((track) => ({
        trackId: track.trackId,
        title: track.title,
        plays: track.plays,
        rank: track.rank,
        momentumLabel: track.momentumLabel,
        artworkUrl: track.artworkUrl,
        qualifiedPlays: track.qualifiedPlays,
        uniqueListeners: track.uniqueListeners,
        completionRate: track.completionRate,
      })),
      sourceBreakdown: rankedTracks.length > 0
        ? [
            {
              sourceType: "search",
              qualifiedPlays: Math.round(qualifiedPlays * 0.44),
              sharePercent: 44,
            },
            {
              sourceType: "discover",
              qualifiedPlays: Math.round(qualifiedPlays * 0.31),
              sharePercent: 31,
            },
            {
              sourceType: "artist_profile",
              qualifiedPlays: Math.round(qualifiedPlays * 0.17),
              sharePercent: 17,
            },
            {
              sourceType: "external",
              qualifiedPlays: Math.round(qualifiedPlays * 0.08),
              sharePercent: 8,
            },
          ]
        : [],
      geography: rankedTracks.length > 0
        ? [
            {
              countryCode: "US",
              qualifiedPlays: Math.round(qualifiedPlays * 0.34),
              sharePercent: 34,
            },
            {
              countryCode: "GB",
              qualifiedPlays: Math.round(qualifiedPlays * 0.18),
              sharePercent: 18,
            },
            {
              countryCode: "CA",
              qualifiedPlays: Math.round(qualifiedPlays * 0.15),
              sharePercent: 15,
            },
            {
              countryCode: "NG",
              qualifiedPlays: Math.round(qualifiedPlays * 0.12),
              sharePercent: 12,
            },
            {
              countryCode: "DE",
              qualifiedPlays: Math.round(qualifiedPlays * 0.09),
              sharePercent: 9,
            },
          ]
        : [],
    },
    premium: {
      performanceWindows: [
        { label: "7 days", plays: Math.round(totalPlays * 0.26) },
        { label: "30 days", plays: totalPlays },
        { label: "90 days", plays: Math.round(totalPlays * 1.92) },
      ],
      comparativeRanking: rankedTracks.slice(0, 8).map((track) => ({
        trackId: track.trackId,
        title: track.title,
        plays: Math.round(track.plays * 1.38),
        rank: track.rank,
        momentumLabel: track.momentumLabel,
        artworkUrl: track.artworkUrl,
      })),
      returningAudience: rankedTracks.length > 0
        ? {
            firstTimeListeners: Math.round(uniqueListeners * 0.58),
            returningListeners: Math.round(uniqueListeners * 0.42),
            returningSharePercent: 42,
          }
        : null,
      repeatListeningLeaders: rankedTracks.slice(0, 3).map((track, index) => ({
        trackId: track.trackId,
        title: track.title,
        slug: track.slug,
        qualifiedPlays: track.qualifiedPlays,
        uniqueListeners: track.uniqueListeners,
        repeatRate: 34 - index * 5,
      })),
      crossWindowPerformance: [
        {
          window: "7d",
          qualifiedPlays: Math.round(qualifiedPlays * 0.24),
          uniqueListeners: Math.round(uniqueListeners * 0.28),
        },
        {
          window: "30d",
          qualifiedPlays,
          uniqueListeners,
        },
        {
          window: "90d",
          qualifiedPlays: Math.round(qualifiedPlays * 1.87),
          uniqueListeners: Math.round(uniqueListeners * 1.76),
        },
      ],
    },
    revenue: {
      snapshot:
        rankedTracks.length > 0
          ? {
              grossRevenue: 248,
              salesCount: 36,
              topEarningTrack: {
                title: rankedTracks[0]?.title ?? null,
                amount: 84,
              },
              topEarningAlbum: {
                title: state.albums[0]?.title ?? null,
                amount: 164,
              },
            }
          : null,
      topEarningReleases: rankedTracks.slice(0, 3).map((track, index) => ({
        type: "track" as const,
        id: track.trackId,
        title: track.title,
        artworkUrl: track.artworkUrl ?? null,
        revenue: 84 - index * 14,
        unitsSold: 12 - index * 2,
        isPurchasable: Boolean(track.isPurchasable),
        href: `/catalog/tracks/${track.trackId}`,
      })),
      monetizationReadiness: {
        purchasableTracks: state.tracks.filter((track) => track.commerce.isPurchasable).length,
        purchasableAlbums: state.albums.filter((album) => album.commerce.isPurchasable).length,
        subscriberOnlyTracks: state.tracks.filter((track) => track.commerce.isSubscriberOnly).length,
        unmonetizedPublishedTracks: publishedTracks.filter((track) => !track.commerce.isPurchasable).length,
        recommendedAction: sellingLocked
          ? {
              label: "Upgrade plan",
              href: "/account/plan",
            }
          : null,
      },
      sellingLocked,
    },
    actions: actionCards,
    generatedAt: new Date().toISOString(),
  };
}

export function getCreatorFixtureScenario(): CreatorFixtureScenario {
  return scenarioFromEnv();
}

export function getCreatorFixtureSession(): MicboxxSession {
  return structuredClone(getFixtureState().session);
}

export function getCreatorFixtureProfile(): DashboardUserProfile {
  return structuredClone(getFixtureState().profile);
}

export function updateCreatorFixtureProfile(update: Partial<DashboardUserProfile>) {
  const state = getFixtureState();
  state.profile = {
    ...state.profile,
    ...update,
    links: {
      ...state.profile.links,
      ...(update.links ?? {}),
    },
    flags: {
      ...state.profile.flags,
      ...(update.flags ?? {}),
    },
    verification: {
      ...state.profile.verification,
      ...(update.verification ?? {}),
    },
  };
  state.session.user.displayName = state.profile.displayName;
  notifyFixtureListeners();
  return structuredClone(state.profile);
}

export function requestCreatorFixtureVerification() {
  return updateCreatorFixtureProfile({
    verification: {
      ...getFixtureState().profile.verification,
      status: "pending",
      canRequest: false,
      requestedAt: new Date().toISOString(),
    },
  });
}

export function getCreatorFixtureUploadOptions(): DashboardUploadOptions {
  return structuredClone(buildUploadOptions(getFixtureState()));
}

export function getCreatorFixtureAnalytics(): CreatorAnalyticsPayload {
  return structuredClone(buildAnalytics(getFixtureState()));
}

export function getCreatorFixtureTracks(page = 1, pageSize = 12): DashboardTrackList {
  return structuredClone(buildTrackList(getFixtureState(), page, pageSize));
}

export function getCreatorFixtureTrack(trackId: string | number): DashboardTrack {
  const track = getFixtureState().tracks.find((item) => item.id === Number(trackId));
  if (!track) {
    throw new Error("Fixture track not found.");
  }
  return structuredClone(track);
}

export function createCreatorFixtureTrack(input: {
  title: string;
  albumId: number;
  genreId: number;
  description?: string;
}): DashboardTrack {
  const state = getFixtureState();
  const album = state.albums.find((item) => item.id === input.albumId) ?? null;
  const genre = genres.find((item) => item.id === input.genreId) ?? null;
  const id = nextTrackId++;

  const track = buildTrack({
    id,
    title: input.title || `Untitled Track ${id}`,
    slug: `untitled-track-${id}`,
    album: album ? { id: album.id, title: album.title } : null,
    genre: genre ? { id: genre.id, name: genre.name } : null,
    releaseState: "draft",
    processing: "ready",
    description: input.description ?? "",
    owner: {
      id: state.session.user.id,
      displayName: state.session.user.displayName,
    },
  });

  state.tracks = [track, ...state.tracks];
  syncAlbumMembership(state);
  notifyFixtureListeners();
  return structuredClone(track);
}

export function updateCreatorFixtureTrack(
  trackId: string | number,
  updater: (track: DashboardTrack) => DashboardTrack,
) {
  const state = getFixtureState();
  const index = state.tracks.findIndex((item) => item.id === Number(trackId));
  if (index < 0) {
    throw new Error("Fixture track not found.");
  }
  state.tracks[index] = updater(state.tracks[index]);
  syncAlbumMembership(state);
  notifyFixtureListeners();
  return structuredClone(state.tracks[index]);
}

export function getCreatorFixtureAlbumOptions(): DashboardAlbumOptions {
  return structuredClone(buildAlbumOptions(getFixtureState()));
}

export function getCreatorFixtureAlbums(page = 1, pageSize = 12): DashboardAlbumList {
  return structuredClone(buildAlbumList(getFixtureState(), page, pageSize));
}

export function getCreatorFixtureAlbum(albumId: string | number): DashboardAlbum {
  const album = getFixtureState().albums.find((item) => item.id === Number(albumId));
  if (!album) {
    throw new Error("Fixture album not found.");
  }
  return structuredClone(album);
}

export function createCreatorFixtureAlbum(input: {
  title: string;
  description?: string;
}): DashboardAlbum {
  const state = getFixtureState();
  const id = nextAlbumId++;
  const album = buildAlbum({
    id,
    title: input.title || `Untitled Album ${id}`,
    slug: `untitled-album-${id}`,
    description: input.description ?? "",
    trackIds: [],
    releaseState: "draft",
    owner: {
      id: state.session.user.id,
      displayName: state.session.user.displayName,
    },
    tracks: state.tracks,
  });
  state.albums = [album, ...state.albums];
  notifyFixtureListeners();
  return structuredClone(album);
}

export function updateCreatorFixtureAlbum(
  albumId: string | number,
  updater: (album: DashboardAlbum) => DashboardAlbum,
) {
  const state = getFixtureState();
  const index = state.albums.findIndex((item) => item.id === Number(albumId));
  if (index < 0) {
    throw new Error("Fixture album not found.");
  }
  state.albums[index] = updater(state.albums[index]);
  notifyFixtureListeners();
  return structuredClone(state.albums[index]);
}

export function getCreatorFixtureInboxItems() {
  return structuredClone(getFixtureState().inboxItems);
}

export function getCreatorFixtureNotifications() {
  return structuredClone(getFixtureState().notifications);
}

export function getCreatorFixtureConversation(conversationId: string) {
  const entry = getFixtureState().conversations[conversationId];
  if (!entry) {
    throw new Error("Fixture conversation not found.");
  }
  return structuredClone(entry);
}

export function sendCreatorFixtureMessage(input: {
  conversationId: string;
  sender: Pick<MicboxxSessionUser, "uuid" | "username" | "displayName">;
  body: string;
}) {
  const state = getFixtureState();
  const entry = state.conversations[input.conversationId];
  if (!entry) {
    throw new Error("Fixture conversation not found.");
  }

  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new Error("Message body cannot be empty.");
  }

  const message: DirectMessage = {
    id: `message-${nextMessageId++}`,
    conversationId: input.conversationId,
    senderUid: input.sender.uuid,
    senderUsername: input.sender.username,
    senderDisplayName: input.sender.displayName,
    body: trimmedBody,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  entry.messages = [...entry.messages, message];
  entry.conversation.lastMessageAt = message.createdAt;
  entry.conversation.lastMessagePreview = message.body;
  entry.conversation.lastMessageSenderUid = message.senderUid;
  entry.conversation.updatedAt = message.updatedAt;

  state.inboxItems = state.inboxItems.map((item) =>
    item.conversationId === input.conversationId
      ? {
          ...item,
          unreadCount: 0,
          lastReadAt: message.createdAt,
          lastMessageAt: message.createdAt,
          lastMessagePreview: message.body,
          lastMessageSenderUid: message.senderUid,
          updatedAt: message.updatedAt,
        }
      : item,
  );

  notifyFixtureListeners();
  return message;
}

export function markCreatorFixtureConversationRead(userUid: string, conversationId: string) {
  const state = getFixtureState();
  state.inboxItems = state.inboxItems.map((item) =>
    item.userUid === userUid && item.conversationId === conversationId
      ? {
          ...item,
          unreadCount: 0,
          lastReadAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  notifyFixtureListeners();
}
