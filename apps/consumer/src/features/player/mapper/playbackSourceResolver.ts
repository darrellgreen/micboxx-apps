import type {
    PlaybackAuthorization,
    PlayerItem,
} from "@/features/player/types/player";

export function resolvePlaybackAuthorization(
  item: Omit<PlayerItem, "authorization">,
  options?: {
    hasSubscription?: boolean;
    capabilities?: string[];
    purchasedTrackIds?: string[];
    purchasedAlbumIds?: string[];
  },
): PlaybackAuthorization {
  const capabilities = new Set(options?.capabilities ?? []);
  const purchasedTrackIds = new Set(options?.purchasedTrackIds ?? []);
  const purchasedAlbumIds = new Set(options?.purchasedAlbumIds ?? []);

  const hasCapability = Boolean(
    item.requiredCapability && capabilities.has(item.requiredCapability),
  );
  const hasTrackPurchase = purchasedTrackIds.has(item.id);
  const hasAlbumPurchase = item.albumId
    ? purchasedAlbumIds.has(item.albumId)
    : false;
  const hasFullAccess =
    !item.locked ||
    hasCapability ||
    Boolean(options?.hasSubscription && item.isSubscriberOnly) ||
    hasTrackPurchase ||
    hasAlbumPurchase;

  if (hasFullAccess && item.fullAudioUrl) {
    return {
      allowed: true,
      sourceKind: "full",
      url: item.fullAudioUrl,
      planKey: item.planKey ?? null,
      requiredCapability: item.requiredCapability ?? null,
    };
  }

  const blockedReason = item.isSubscriberOnly
    ? "requires_subscription"
    : item.isPurchasable
      ? "requires_purchase"
      : "not_available";

  if (!hasFullAccess && item.demoAudioUrl) {
    return {
      allowed: true,
      sourceKind: "demo",
      url: item.demoAudioUrl,
      reason: blockedReason,
      planKey: item.planKey ?? null,
      requiredCapability: item.requiredCapability ?? null,
    };
  }

  if (item.locked) {
    return {
      allowed: false,
      sourceKind: "locked",
      url: null,
      reason: blockedReason,
      planKey: item.planKey ?? null,
      requiredCapability: item.requiredCapability ?? null,
    };
  }

  return {
    allowed: false,
    sourceKind: "unavailable",
    url: null,
    reason: "not_available",
    planKey: item.planKey ?? null,
    requiredCapability: item.requiredCapability ?? null,
  };
}
