import type { Href } from "expo-router";

import type {
  CreateEntryTarget,
  CreatorReadinessActionKey,
  CreatorAccessState,
  CreatorOnboardingState,
  DashboardVerificationStatus,
  DashboardTrackList,
  DashboardTrackSummary,
  DashboardUploadOptions,
} from "@/contracts/creator";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";

export function resolveOnboardingHref(
  onboardingState: CreatorOnboardingState,
  createEntryTarget: CreateEntryTarget = "upload_track",
): Href {
  switch (onboardingState) {
    case "needs_intro":
      return "/onboarding/intro";
    case "needs_profile":
      return "/onboarding/profile";
    case "needs_album":
      return "/onboarding/album";
    case "needs_first_track":
      // Reuse adaptive create routing when a backend draft or failed upload
      // already exists so onboarding does not force a stale linear path.
      return createEntryTarget === "upload_track" ? "/onboarding/track" : "/create";
    case "complete":
    default:
      return "/dashboard";
  }
}

export function resolveCreatorEntryHref(input: {
  hasSession: boolean;
  accessState: CreatorAccessState;
  onboardingState: CreatorOnboardingState;
  createEntryTarget: CreateEntryTarget;
}): Href {
  if (!input.hasSession) {
    return "/welcome";
  }

  if (input.accessState === "non_creator_blocked") {
    return "/creator-access";
  }

  if (input.accessState === "creator_setup_required") {
    return resolveOnboardingHref(input.onboardingState, input.createEntryTarget);
  }

  if (input.accessState === "error") {
    return "/creator-access";
  }

  return "/dashboard";
}

function pickNewestTrack(
  tracks: DashboardTrackSummary[],
  predicate: (track: DashboardTrackSummary) => boolean,
) {
  const matching = tracks.filter(predicate);
  if (matching.length === 0) {
    return null;
  }

  return matching.sort((a, b) => {
    const aTime = Date.parse(a.timestamps.updatedAt || "");
    const bTime = Date.parse(b.timestamps.updatedAt || "");
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  })[0];
}

export function resolveCreateEntryHref(input: {
  createEntryTarget: CreateEntryTarget;
  tracksSummary: DashboardTrackList | null;
  uploadOptions: DashboardUploadOptions | null;
}): Href {
  if (input.createEntryTarget === "recover_failed_item") {
    const failedTrack = pickNewestTrack(
      input.tracksSummary?.tracks ?? [],
      (track) => track.status.processing === "failed",
    );
    if (failedTrack) {
      if (failedTrack.album?.id) {
        return `/catalog/albums/${failedTrack.album.id}?tab=tracks&highlightTrackId=${failedTrack.id}` as Href;
      }
      return `/catalog/tracks/${failedTrack.id}` as Href;
    }
  }

  if (input.createEntryTarget === "continue_backend_draft") {
    const draftTrack = pickNewestTrack(
      input.tracksSummary?.tracks ?? [],
      (track) => resolveTrackReleaseState(track.status) === "draft",
    );
    if (draftTrack) {
      return `/create/review/${draftTrack.id}` as Href;
    }
  }

  return "/create/release";
}

export function resolveReadinessActionHref(input: {
  actionKey: CreatorReadinessActionKey;
  createEntryTarget: CreateEntryTarget;
  tracksSummary: DashboardTrackList | null;
  uploadOptions: DashboardUploadOptions | null;
}): Href {
  switch (input.actionKey) {
    case "create_album":
    case "upload_track":
    case "recover_failed_item":
    case "continue_backend_draft":
      return resolveCreateEntryHref({
        createEntryTarget: input.createEntryTarget,
        tracksSummary: input.tracksSummary,
        uploadOptions: input.uploadOptions,
      });

    case "review_catalog_metadata":
    case "publish_ready_tracks":
      return "/catalog/tracks";
  }
}

export type VerificationTaskActionKey =
  | "request_verification"
  | "review_pending_verification"
  | "resubmit_verification"
  | "fix_verification_eligibility";

export function resolveVerificationTaskHref(input: {
  actionKey: VerificationTaskActionKey;
  status: DashboardVerificationStatus;
  canRequest: boolean;
  eligible: boolean;
}): Href {
  if (input.actionKey === "fix_verification_eligibility") {
    return "/account/profile";
  }

  if (
    input.status === "not_requested" &&
    input.canRequest &&
    input.eligible &&
    input.actionKey === "request_verification"
  ) {
    return "/account/verification";
  }

  if (input.status === "pending" && input.actionKey === "review_pending_verification") {
    return "/account/verification";
  }

  if (
    (input.status === "rejected" || input.status === "revoked") &&
    input.canRequest &&
    input.actionKey === "resubmit_verification"
  ) {
    return "/account/verification";
  }

  return "/account/verification";
}
