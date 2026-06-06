import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type {
  CreatorAccessState,
  CreatorActionCard,
  CreatorActivityCard,
  CreatorAnalyticsPayload,
  CreatorBootstrapSummary,
  CreatorCatalogHealthIssue,
  CreatorEligibilityGate,
  CreatorMetricCard,
  CreatorOnboardingState,
  CreateEntryTarget,
  DashboardAlbumList,
  DashboardTrackList,
  DashboardUploadOptions,
  DashboardUserProfile,
} from "@/contracts/creator";
import type {
  SocialNotification,
  UserConversationInboxItem,
} from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import {
  readCreatorIntroSeen,
  readCreatorOnboardingComplete,
  writeCreatorIntroSeen,
  writeCreatorOnboardingComplete,
} from "@/features/bootstrap/storage";
import {
  resolveCreateEntryHref,
  resolveReadinessActionHref,
  resolveVerificationTaskHref,
} from "@/features/bootstrap/routes";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { useInbox } from "@/features/social/hooks/useInbox";
import { useNotifications } from "@/features/social/hooks/useNotifications";
import type { NotificationItem } from "@micboxx/notifications";
import {
  CreatorApiError,
  getCreatorAnalytics,
  getMyAlbums,
  getMyTracks,
  getUploadOptions,
  getUserProfile,
} from "@/shared/api/creator-dashboard";

function isCreatorCapable(
  permissions?: DashboardUploadOptions["currentUser"]["permissions"],
) {
  if (!permissions) {
    return false;
  }

  return Boolean(
    permissions.canUploadTracks ||
      permissions.canAdministerTracks ||
      permissions.canCreateAlbums ||
      permissions.canAdministerAlbums,
  );
}

function normalizeBootstrapError(reason: unknown) {
  if (reason instanceof CreatorApiError) {
    return reason.message;
  }

  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }

  return "Some creator data could not be loaded. You can still continue.";
}

function resolveEligibilityGate(input: {
  isHydrating: boolean;
  isBootstrapLoading: boolean;
  hasAccessToken: boolean;
  sessionPermissions?: DashboardUploadOptions["currentUser"]["permissions"];
  uploadPermissions?: DashboardUploadOptions["currentUser"]["permissions"];
  hasBootstrapData: boolean;
  error: string | null;
}): CreatorEligibilityGate {
  if (input.isHydrating || (input.isBootstrapLoading && input.hasAccessToken)) {
    return {
      state: "pending",
      reasonCode: "bootstrap_pending",
      eligible: false,
      reason: "Checking creator eligibility.",
      source: "system",
    };
  }

  if (!input.hasAccessToken) {
    return {
      state: "blocked",
      reasonCode: "auth_missing",
      eligible: false,
      reason: "Sign in to continue.",
      source: "system",
    };
  }

  if (input.error && !input.hasBootstrapData) {
    return {
      state: "error",
      reasonCode: "bootstrap_fetch_failed",
      eligible: false,
      reason: input.error,
      source: "system",
    };
  }

  const permissions = input.uploadPermissions ?? input.sessionPermissions;
  if (!isCreatorCapable(permissions)) {
    return {
      state: "blocked",
      reasonCode: "missing_creator_permissions",
      eligible: false,
      reason: "This account does not have creator-capable access.",
      source: input.uploadPermissions ? "upload_options" : "session",
    };
  }

  return {
    state: "eligible",
    reasonCode: "eligible",
    eligible: true,
    reason: null,
    source: input.uploadPermissions ? "upload_options" : "session",
  };
}

function formatCompactNumber(value: number | null | undefined) {
  const normalized = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: normalized >= 1000 ? 1 : 0,
  }).format(normalized);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function buildPerformanceCards(
  analytics: CreatorAnalyticsPayload | null,
): CreatorMetricCard[] {
  return [
    {
      key: "plays",
      title: "Plays",
      value: formatCompactNumber(analytics?.basic.totalPlays ?? 0),
      subtitle: "Current analytics window",
      href: "/dashboard/analytics",
    },
    {
      key: "revenue",
      title: "Revenue snapshot",
      value: formatCurrency(analytics?.revenue?.snapshot?.grossRevenue ?? 0),
      subtitle: analytics?.revenue?.sellingLocked
        ? "Monetization locked on current plan"
        : "Gross earnings snapshot",
      href: "/account/revenue",
    },
    {
      key: "release-performance",
      title: "Top release",
      value:
        analytics?.basic.topTrack?.title ??
        analytics?.revenue?.snapshot?.topEarningTrack.title ??
        "No release data yet",
      subtitle:
        analytics?.basic.topTrack?.plays != null
          ? `${formatCompactNumber(analytics.basic.topTrack.plays)} plays`
          : "Release performance will surface here",
      href: "/dashboard/release-health",
    },
  ];
}

function buildActionCards(input: {
  needsProfile: boolean;
  hasTracks: boolean;
  createEntryTarget: CreateEntryTarget;
  createEntryHref: string;
  verificationCards: CreatorActionCard[];
  readinessCards: CreatorActionCard[];
  monetizationLocked: boolean;
}): CreatorActionCard[] {
  const cards: CreatorActionCard[] = [];

  if (input.needsProfile) {
    cards.push({
      key: "complete-profile",
      title: "Complete profile",
      description: "Add your artist bio and imagery before releasing music.",
      href: "/account/profile",
      tone: "default",
    });
  }

  cards.push(...input.readinessCards);
  cards.push(...input.verificationCards);

  if (input.readinessCards.length === 0 && input.verificationCards.length === 0) {
    if (input.createEntryTarget === "create_album") {
      cards.push({
        key: "create-album",
        title: "Create your first album",
        description:
          "MicBoxx uploads are album-first, so album setup comes before track upload.",
        href: input.createEntryHref,
        tone: "warning",
      });
    } else if (input.createEntryTarget === "recover_failed_item") {
      cards.push({
        key: "failed-processing",
        title: "Fix failed processing",
        description:
          "One or more uploads need attention before they can be published.",
        href: input.createEntryHref,
        tone: "warning",
      });
    } else if (input.createEntryTarget === "continue_backend_draft") {
      cards.push({
        key: "continue-draft",
        title: "Finish draft release",
        description: "Resume a saved backend draft and move it toward publish.",
        href: input.createEntryHref,
        tone: "default",
      });
    } else if (!input.hasTracks) {
      cards.push({
        key: "upload-track",
        title: "Upload your first track",
        description: "Start the first release once an album exists.",
        href: input.createEntryHref,
        tone: "default",
      });
    }
  }

  if (input.monetizationLocked) {
    cards.push({
      key: "monetization-locked",
      title: "Monetization locked",
      description:
        "Upgrade your artist plan to sell tracks, albums, or subscriber access.",
      href: "/dashboard/monetization",
      tone: "success",
    });
  }

  return cards.slice(0, 4);
}

function toActionHref(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" ? value : fallback;
}

function buildReadinessActionCards(input: {
  issues: CreatorCatalogHealthIssue[];
  createEntryTarget: CreateEntryTarget;
  tracksSummary: DashboardTrackList | null;
  uploadOptions: DashboardUploadOptions | null;
}): CreatorActionCard[] {
  const prioritized = [...input.issues].sort((a, b) => {
    if (a.severity === b.severity) {
      return 0;
    }

    return a.severity === "blocker" ? -1 : 1;
  });

  return prioritized.slice(0, 2).map((issue) => {
    const issueCountLabel =
      issue.affectedCount > 0
        ? `${issue.affectedCount} ${
            issue.affectedCount === 1 ? "item" : "items"
          } affected.`
        : "";
    const routedHref =
      issue.action !== null
        ? resolveReadinessActionHref({
            actionKey: issue.action.key,
            createEntryTarget: input.createEntryTarget,
            tracksSummary: input.tracksSummary,
            uploadOptions: input.uploadOptions,
          })
        : "/dashboard";

    return {
      key: `readiness-${issue.code}`,
      title: issue.title,
      description: `${issue.description}${issueCountLabel ? ` ${issueCountLabel}` : ""}`,
      href: toActionHref(routedHref),
      tone: issue.severity === "blocker" ? "warning" : "default",
    };
  });
}

function buildVerificationActionCards(input: {
  profile: DashboardUserProfile | null;
}): CreatorActionCard[] {
  const verification = input.profile?.verification;
  if (!verification) {
    return [];
  }

  const statusLabel = verification.status.replace(/_/g, " ");

  if (verification.status === "verified") {
    return [];
  }

  if (verification.status === "pending") {
    return [
      {
        key: "verification-pending",
        title: "Verification in review",
        description:
          "Your creator verification request is pending review. Check status updates here.",
        href: toActionHref(
          resolveVerificationTaskHref({
            actionKey: "review_pending_verification",
            status: verification.status,
            canRequest: verification.canRequest,
            eligible: verification.eligible,
          }),
          "/account/verification",
        ),
        tone: "default",
      },
    ];
  }

  if (
    (verification.status === "rejected" || verification.status === "revoked") &&
    verification.canRequest
  ) {
    return [
      {
        key: "verification-resubmit",
        title: "Re-submit verification request",
        description:
          verification.reason && verification.reason.trim() !== ""
            ? `Previous status: ${statusLabel}. ${verification.reason}`
            : `Previous status: ${statusLabel}. Update and resubmit your verification request.`,
        href: toActionHref(
          resolveVerificationTaskHref({
            actionKey: "resubmit_verification",
            status: verification.status,
            canRequest: verification.canRequest,
            eligible: verification.eligible,
          }),
          "/account/verification",
        ),
        tone: "warning",
      },
    ];
  }

  if (verification.status === "not_requested" && verification.canRequest) {
    return [
      {
        key: "verification-request",
        title: "Request creator verification",
        description:
          "Verification helps establish trust on your creator profile and release surfaces.",
        href: toActionHref(
          resolveVerificationTaskHref({
            actionKey: "request_verification",
            status: verification.status,
            canRequest: verification.canRequest,
            eligible: verification.eligible,
          }),
          "/account/verification",
        ),
        tone: "default",
      },
    ];
  }

  return [
    {
      key: "verification-eligibility",
      title: "Complete verification requirements",
      description:
        verification.reason && verification.reason.trim() !== ""
          ? verification.reason
          : "Verification request requirements are not yet met.",
      href: toActionHref(
        resolveVerificationTaskHref({
          actionKey: "fix_verification_eligibility",
          status: verification.status,
          canRequest: verification.canRequest,
          eligible: verification.eligible,
        }),
        "/account/profile",
      ),
      tone: "warning",
    },
  ];
}

function buildActivityCards(input: {
  unreadMessageCount: number;
  unreadNotificationCount: number;
}): CreatorActivityCard[] {
  return [
    {
      key: "messages",
      title: "Unread messages",
      description:
        input.unreadMessageCount > 0
          ? `${input.unreadMessageCount} conversation updates need review.`
          : "No unread creator conversations.",
      href: "/audience/inbox",
      count: input.unreadMessageCount,
    },
    {
      key: "notifications",
      title: "Unread notifications",
      description:
        input.unreadNotificationCount > 0
          ? `${input.unreadNotificationCount} creator alerts are waiting.`
          : "No unread creator notifications.",
      href: "/audience/notifications",
      count: input.unreadNotificationCount,
    },
  ];
}

interface CreatorBootstrapContextValue {
  loading: boolean;
  error: string | null;
  eligibility: CreatorEligibilityGate;
  accessState: CreatorAccessState;
  onboardingState: CreatorOnboardingState;
  createEntryTarget: CreateEntryTarget;
  uploadOptions: DashboardUploadOptions | null;
  profile: DashboardUserProfile | null;
  analytics: CreatorAnalyticsPayload | null;
  tracksSummary: DashboardTrackList | null;
  albumsSummary: DashboardAlbumList | null;
  audienceSummary: CreatorBootstrapSummary<
    UserConversationInboxItem,
    NotificationItem
  >["audienceSummary"];
  dashboardBuckets: CreatorBootstrapSummary["dashboardBuckets"];
  catalogReadiness: CreatorBootstrapSummary["catalogReadiness"];
  introSeen: boolean;
  onboardingCompleted: boolean;
  markIntroSeen: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  refetch: () => Promise<void>;
}

const CreatorBootstrapContext =
  createContext<CreatorBootstrapContextValue | null>(null);

export function CreatorBootstrapProvider({ children }: PropsWithChildren) {
  const { session, isHydrating } = useAuth();
  const inbox = useInbox(5);
  const notifications = useNotifications(5);
  const [uploadOptions, setUploadOptions] =
    useState<DashboardUploadOptions | null>(null);
  const [profile, setProfile] = useState<DashboardUserProfile | null>(null);
  const [analytics, setAnalytics] = useState<CreatorAnalyticsPayload | null>(
    null,
  );
  const [tracksSummary, setTracksSummary] = useState<DashboardTrackList | null>(
    null,
  );
  const [albumsSummary, setAlbumsSummary] = useState<DashboardAlbumList | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introSeen, setIntroSeen] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const userUuid = session?.user.uuid ?? "";

  useEffect(() => {
    let active = true;

    async function loadLocalFlags() {
      if (!userUuid) {
        if (!active) {
          return;
        }
        setIntroSeen(false);
        setOnboardingCompleted(false);
        return;
      }

      const [nextIntroSeen, nextOnboardingCompleted] = await Promise.all([
        readCreatorIntroSeen(userUuid),
        readCreatorOnboardingComplete(userUuid),
      ]);

      if (!active) {
        return;
      }

      setIntroSeen(nextIntroSeen);
      setOnboardingCompleted(nextOnboardingCompleted);
    }

    void loadLocalFlags();

    return () => {
      active = false;
    };
  }, [userUuid]);

  const refetch = useCallback(async () => {
    if (!session?.accessToken) {
      setUploadOptions(null);
      setProfile(null);
      setAnalytics(null);
      setTracksSummary(null);
      setAlbumsSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const failures: PromiseRejectedResult[] = [];

    const [uploadResult, profileResult] =
      await Promise.allSettled([
        getUploadOptions(),
        getUserProfile(session.user),
      ]);

    if (uploadResult.status === "fulfilled") {
      setUploadOptions(uploadResult.value);
    } else {
      setUploadOptions(null);
      failures.push(uploadResult);
    }

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value);
    } else {
      setProfile(null);
      failures.push(profileResult);
    }

    const permissions =
      uploadResult.status === "fulfilled"
        ? uploadResult.value.currentUser.permissions
        : session.user.permissions;
    const canLoadCreatorData = isCreatorCapable(permissions);

    if (canLoadCreatorData) {
      const [analyticsResult, tracksResult, albumsResult] = await Promise.allSettled(
        [getCreatorAnalytics("30d"), getMyTracks(1, 12), getMyAlbums(1, 12)],
      );

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
      } else {
        setAnalytics(null);
        failures.push(analyticsResult);
      }

      if (tracksResult.status === "fulfilled") {
        setTracksSummary(tracksResult.value);
      } else {
        setTracksSummary(null);
        failures.push(tracksResult);
      }

      if (albumsResult.status === "fulfilled") {
        setAlbumsSummary(albumsResult.value);
      } else {
        setAlbumsSummary(null);
        failures.push(albumsResult);
      }
    } else {
      setAnalytics(null);
      setTracksSummary(null);
      setAlbumsSummary(null);
    }

    if (failures.length > 0) {
      setError(normalizeBootstrapError(failures[0].reason));
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const markIntroSeen = useCallback(async () => {
    if (!userUuid) {
      return;
    }

    await writeCreatorIntroSeen(userUuid);
    setIntroSeen(true);
  }, [userUuid]);

  const markOnboardingComplete = useCallback(async () => {
    if (!userUuid) {
      return;
    }

    await writeCreatorOnboardingComplete(userUuid);
    setOnboardingCompleted(true);
  }, [userUuid]);

  const catalogReadiness = useMemo(() => {
    const tracks = tracksSummary?.tracks ?? [];
    const albums = albumsSummary?.albums ?? [];

    return {
      hasAlbums: albums.length > 0,
      hasTracks: tracks.length > 0,
      hasBackendDraftTracks: tracks.some(
        (track) => resolveTrackReleaseState(track.status) === "draft",
      ),
      hasScheduledReleases:
        tracks.some((track) => resolveTrackReleaseState(track.status) === "scheduled") ||
        albums.some((album) => album.status.releaseState === "scheduled"),
      hasFailedProcessing: tracks.some(
        (track) => track.status.processing === "failed",
      ),
      hasPublishedReleases:
        tracks.some((track) => resolveTrackReleaseState(track.status) === "published") ||
        albums.some((album) => album.status.releaseState === "published"),
    };
  }, [albumsSummary, tracksSummary]);

  const needsProfile = useMemo(
    () => Boolean(!(profile?.bio?.trim() && profile.avatarUrl)),
    [profile],
  );

  const createEntryTarget = useMemo<CreateEntryTarget>(() => {
    if (!catalogReadiness.hasAlbums) {
      return "create_album";
    }
    if (catalogReadiness.hasFailedProcessing) {
      return "recover_failed_item";
    }
    if (catalogReadiness.hasBackendDraftTracks) {
      return "continue_backend_draft";
    }
    return "upload_track";
  }, [catalogReadiness]);

  const createEntryHref = useMemo(
    () =>
      resolveCreateEntryHref({
        createEntryTarget,
        tracksSummary,
        uploadOptions,
      }),
    [createEntryTarget, tracksSummary, uploadOptions],
  );
  const createEntryActionHref = useMemo(
    () => (typeof createEntryHref === "string" ? createEntryHref : "/create"),
    [createEntryHref],
  );

  const onboardingState = useMemo<CreatorOnboardingState>(() => {
    if (!introSeen) {
      return "needs_intro";
    }

    if (!onboardingCompleted) {
      if (needsProfile) {
        return "needs_profile";
      }
      if (!catalogReadiness.hasAlbums) {
        return "needs_album";
      }
      if (!catalogReadiness.hasTracks) {
        return "needs_first_track";
      }
    }

    return "complete";
  }, [
    catalogReadiness.hasAlbums,
    catalogReadiness.hasTracks,
    introSeen,
    needsProfile,
    onboardingCompleted,
  ]);

  const eligibility = useMemo<CreatorEligibilityGate>(
    () =>
      resolveEligibilityGate({
        isHydrating,
        isBootstrapLoading: loading,
        hasAccessToken: Boolean(session?.accessToken),
        sessionPermissions: session?.user.permissions,
        uploadPermissions: uploadOptions?.currentUser.permissions,
        hasBootstrapData: Boolean(uploadOptions || profile),
        error,
      }),
    [error, isHydrating, loading, profile, session?.accessToken, session?.user.permissions, uploadOptions],
  );

  const accessState = useMemo<CreatorAccessState>(() => {
    if (eligibility.state === "pending") {
      return "loading";
    }

    if (eligibility.state === "error") {
      return "error";
    }

    if (!eligibility.eligible) {
      return "non_creator_blocked";
    }

    return "creator_ready";
  }, [
    eligibility,
  ]);

  const audienceSummary = useMemo(
    () => ({
      unreadMessageCount: inbox.totalUnread,
      unreadNotificationCount: notifications.unreadCount,
      recentConversations: inbox.items,
      recentNotifications: notifications.items,
    }),
    [inbox.items, inbox.totalUnread, notifications.items, notifications.unreadCount],
  );

  const dashboardBuckets = useMemo(
    () => ({
      performance: buildPerformanceCards(analytics),
      actionNeeded: buildActionCards({
        needsProfile,
        hasTracks: catalogReadiness.hasTracks,
        createEntryTarget,
        createEntryHref: createEntryActionHref,
        verificationCards: buildVerificationActionCards({
          profile,
        }),
        readinessCards: buildReadinessActionCards({
          issues: analytics?.catalogHealth?.issues ?? [],
          createEntryTarget,
          tracksSummary,
          uploadOptions,
        }),
        monetizationLocked: Boolean(analytics?.revenue?.sellingLocked),
      }),
      activity: buildActivityCards({
        unreadMessageCount: audienceSummary.unreadMessageCount,
        unreadNotificationCount: audienceSummary.unreadNotificationCount,
      }),
    }),
    [
      analytics,
      audienceSummary,
      catalogReadiness.hasTracks,
      createEntryActionHref,
      createEntryTarget,
      needsProfile,
      profile,
      tracksSummary,
      uploadOptions,
    ],
  );

  const value = useMemo<CreatorBootstrapContextValue>(
    () => ({
      loading: isHydrating || loading,
      error:
        error ??
        inbox.error ??
        notifications.error ??
        null,
      eligibility,
      accessState,
      onboardingState,
      createEntryTarget,
      uploadOptions,
      profile,
      analytics,
      tracksSummary,
      albumsSummary,
      audienceSummary,
      dashboardBuckets,
      catalogReadiness,
      introSeen,
      onboardingCompleted,
      markIntroSeen,
      markOnboardingComplete,
      refetch,
    }),
    [
      accessState,
      albumsSummary,
      analytics,
      audienceSummary,
      catalogReadiness,
      createEntryTarget,
      dashboardBuckets,
      eligibility,
      error,
      inbox.error,
      introSeen,
      isHydrating,
      loading,
      markIntroSeen,
      markOnboardingComplete,
      notifications.error,
      onboardingCompleted,
      onboardingState,
      profile,
      refetch,
      tracksSummary,
      uploadOptions,
    ],
  );

  return (
    <CreatorBootstrapContext.Provider value={value}>
      {children}
    </CreatorBootstrapContext.Provider>
  );
}

export function useCreatorBootstrap() {
  const context = useContext(CreatorBootstrapContext);
  if (!context) {
    throw new Error(
      "useCreatorBootstrap must be used within CreatorBootstrapProvider.",
    );
  }

  return context;
}
