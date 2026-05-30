import type { MicboxxSession, PublicTrack } from "@micboxx/contracts";
import { mapTrackToPlayerItem } from "@/features/player/mapper/playerItemMapper";
import { formatCurrency } from "@micboxx/api";

import type { AccessCtaModel } from "./detail-models";

export interface TrackAccessContext {
  isSignedIn: boolean;
  hasSubscription?: boolean;
  capabilities?: string[];
  purchasedTrackIds?: string[];
  purchasedAlbumIds?: string[];
}

const EMPTY_TRACK_ACCESS_CONTEXT: Required<TrackAccessContext> = {
  isSignedIn: false,
  hasSubscription: false,
  capabilities: [],
  purchasedTrackIds: [],
  purchasedAlbumIds: [],
};

function normalizeIds(values?: (string | number | null | undefined)[]) {
  return (values ?? []).flatMap((value) => {
    if (typeof value === "string" || typeof value === "number") {
      return [String(value)];
    }

    return [];
  });
}

function hasSubscriberRole(roles: string[]) {
  return roles.some((role) =>
    /subscriber|subscription|premium|pro/i.test(role),
  );
}

export function coerceTrackAccessContext(
  input?: boolean | Partial<TrackAccessContext> | null,
): Required<TrackAccessContext> {
  if (typeof input === "boolean") {
    return {
      ...EMPTY_TRACK_ACCESS_CONTEXT,
      isSignedIn: input,
    };
  }

  return {
    isSignedIn: Boolean(input?.isSignedIn),
    hasSubscription: Boolean(input?.hasSubscription),
    capabilities: [...(input?.capabilities ?? [])],
    purchasedTrackIds: normalizeIds(input?.purchasedTrackIds),
    purchasedAlbumIds: normalizeIds(input?.purchasedAlbumIds),
  };
}

export function buildTrackAccessContext(
  session?: MicboxxSession | null,
): Required<TrackAccessContext> {
  if (!session) {
    return { ...EMPTY_TRACK_ACCESS_CONTEXT };
  }

  const entitlements = session.entitlements ?? null;
  const capabilities = new Set<string>([
    ...(session.user.capabilities ?? []),
    ...(entitlements?.capabilities ?? []),
  ]);

  return {
    isSignedIn: true,
    hasSubscription:
      Boolean(entitlements?.hasListenerSubscription) ||
      capabilities.has("listener.subscription") ||
      hasSubscriberRole(session.user.roles),
    capabilities: [...capabilities],
    purchasedTrackIds: normalizeIds(entitlements?.purchasedTrackIds),
    purchasedAlbumIds: normalizeIds(entitlements?.purchasedAlbumIds),
  };
}

function joinBaseUrl(baseUrl: string | null | undefined, path: string) {
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function resolveTrackPlaybackState(
  track: PublicTrack,
  input?: boolean | Partial<TrackAccessContext> | null,
) {
  const context = coerceTrackAccessContext(input);
  const playerItem = mapTrackToPlayerItem(track, {
    hasSubscription: context.hasSubscription,
    capabilities: context.capabilities,
    purchasedTrackIds: context.purchasedTrackIds,
    purchasedAlbumIds: context.purchasedAlbumIds,
  });

  const authorization = playerItem.authorization;
  const trackId = String(track.id);
  const albumId = track.album ? String(track.album.id) : null;
  const isOwned =
    context.purchasedTrackIds.includes(trackId) ||
    Boolean(albumId && context.purchasedAlbumIds.includes(albumId));

  return {
    context,
    authorization,
    isOwned,
    isPreviewOnly: authorization.sourceKind === "demo",
    hasFullPlaybackAccess:
      authorization.allowed && authorization.sourceKind === "full",
    requiresSubscription:
      authorization.reason === "requires_subscription" ||
      Boolean(
        (track.access?.locked || track.playback?.locked || track.locked) &&
        (track.isSubscriberOnly || track.access?.requiredCapability),
      ),
    requiresPurchase:
      authorization.reason === "requires_purchase" ||
      Boolean(
        (track.access?.locked || track.playback?.locked || track.locked) &&
        track.commerce?.isPurchasable,
      ),
  };
}

export function buildTrackAccessCtaModel(
  track: PublicTrack,
  input?: boolean | Partial<TrackAccessContext> | null,
  options?: { webBaseUrl?: string | null },
): AccessCtaModel {
  const state = resolveTrackPlaybackState(track, input);

  if (
    !state.context.isSignedIn &&
    (state.requiresSubscription || state.requiresPurchase)
  ) {
    return {
      accessState: "sign_in_required",
      ctaLabel: "Sign in to continue",
      actionType: "sign_in",
      destination: "/sign-in",
      handoffUrl: null,
      refreshPolicy: "none",
      helperText: "Sign in to resolve access and entitlement state.",
    };
  }

  if (state.hasFullPlaybackAccess) {
    return {
      accessState: state.isOwned ? "owned" : "playable",
      ctaLabel: "Play now",
      actionType: "play",
      destination: null,
      handoffUrl: null,
      refreshPolicy: "none",
      helperText: state.isOwned
        ? "You already have access to this release. Full playback is available now."
        : track.commerce?.isPurchasable && track.commerce.price
          ? "Full playback is already available. Purchasing remains optional support for the release."
          : "Playback is available now.",
    };
  }

  if (state.requiresSubscription) {
    const subscriptionHandoffUrl = joinBaseUrl(
      options?.webBaseUrl,
      `/subscription?intent=listener&from=subscriber_only_track&track=${encodeURIComponent(track.slug)}`,
    );

    return {
      accessState: "subscriber_locked",
      ctaLabel: "See listener plans",
      actionType: "open_subscription",
      destination: "/account/plan",
      handoffUrl: subscriptionHandoffUrl,
      refreshPolicy: "on_focus",
      helperText: subscriptionHandoffUrl
        ? "Full playback is reserved for subscriber access."
        : "Full playback is reserved for subscriber access. Plans can still be opened in-app.",
    };
  }

  if (state.requiresPurchase && track.commerce?.price) {
    const purchaseHandoffUrl = joinBaseUrl(options?.webBaseUrl, track.href);

    return {
      accessState: "purchase_available",
      ctaLabel: `Buy ${formatCurrency(track.commerce.price, track.commerce.currency ?? "USD")}`,
      actionType: "open_checkout",
      destination: "/account/revenue",
      handoffUrl: purchaseHandoffUrl,
      refreshPolicy: "after_web_return",
      helperText: purchaseHandoffUrl
        ? "Checkout stays server-driven and returns to the app afterward."
        : "Checkout is not configured in this build, but your purchase and access area is still available in-app.",
    };
  }

  if (state.isPreviewOnly) {
    return {
      accessState: "playable",
      ctaLabel: "Play preview",
      actionType: "play",
      destination: null,
      handoffUrl: null,
      refreshPolicy: "none",
      helperText: "A preview clip is available right now.",
    };
  }

  return {
    accessState: "unavailable",
    ctaLabel: "Unavailable",
    actionType: "none",
    destination: null,
    handoffUrl: null,
    refreshPolicy: "none",
    helperText: "This release is not currently available for playback.",
  };
}
