import type { DashboardTrackStatus } from "@/contracts/creator";

export function resolveTrackReleaseState(status: DashboardTrackStatus) {
  if (status.published) {
    return "published";
  }

  return status.releaseState === "published" ? "draft" : status.releaseState;
}

export function isTrackPublished(status: DashboardTrackStatus): boolean {
  return resolveTrackReleaseState(status) === "published";
}

export function isTrackDraft(status: DashboardTrackStatus): boolean {
  return resolveTrackReleaseState(status) === "draft";
}

export function isTrackScheduled(status: DashboardTrackStatus): boolean {
  return resolveTrackReleaseState(status) === "scheduled";
}
