import type { CreatorDashboardRevenue } from "@/contracts/creator";

export type RevenueConcentrationLevel =
  | "insufficient_data"
  | "balanced"
  | "concentrated"
  | "single_release";

export interface RevenueTrendSummary {
  grossRevenue: number;
  salesCount: number;
  averageOrderValue: number | null;
  topReleaseSharePercent: number | null;
  concentrationLevel: RevenueConcentrationLevel;
  label: string;
  description: string;
}

export interface PayoutReadinessSummary {
  state: "ready" | "needs_action" | "blocked";
  summary: string;
  checks: {
    planUnlocked: boolean;
    hasPurchasableCatalog: boolean;
    hasRecordedSales: boolean;
    hasUnmonetizedPublishedTracks: boolean;
  };
  nextAction: {
    label: string;
    href: string;
  };
}

function getTopReleaseRevenue(revenue: CreatorDashboardRevenue | null): number {
  if (!revenue || revenue.topEarningReleases.length === 0) {
    return 0;
  }

  return revenue.topEarningReleases.reduce((maxRevenue, release) => {
    return release.revenue > maxRevenue ? release.revenue : maxRevenue;
  }, 0);
}

export function buildRevenueTrendSummary(
  revenue: CreatorDashboardRevenue | null,
): RevenueTrendSummary {
  const grossRevenue = revenue?.snapshot?.grossRevenue ?? 0;
  const salesCount = revenue?.snapshot?.salesCount ?? 0;
  const averageOrderValue =
    salesCount > 0 ? Number((grossRevenue / salesCount).toFixed(2)) : null;
  const topReleaseRevenue = getTopReleaseRevenue(revenue);
  const topReleaseSharePercent =
    grossRevenue > 0 && topReleaseRevenue > 0
      ? Math.round((topReleaseRevenue / grossRevenue) * 100)
      : null;

  if (topReleaseSharePercent == null) {
    return {
      grossRevenue,
      salesCount,
      averageOrderValue,
      topReleaseSharePercent,
      concentrationLevel: "insufficient_data",
      label: "Trend pending",
      description:
        "Revenue trend signals will appear after monetized releases record sales.",
    };
  }

  if (topReleaseSharePercent >= 70) {
    return {
      grossRevenue,
      salesCount,
      averageOrderValue,
      topReleaseSharePercent,
      concentrationLevel: "single_release",
      label: "Single-release dependent",
      description:
        "Most revenue is concentrated in one release. Diversify monetized catalog to reduce risk.",
    };
  }

  if (topReleaseSharePercent >= 45) {
    return {
      grossRevenue,
      salesCount,
      averageOrderValue,
      topReleaseSharePercent,
      concentrationLevel: "concentrated",
      label: "Lead-release concentration",
      description:
        "A lead release drives a large share of revenue. Promote additional catalog for stability.",
    };
  }

  return {
    grossRevenue,
    salesCount,
    averageOrderValue,
    topReleaseSharePercent,
    concentrationLevel: "balanced",
    label: "Balanced revenue mix",
    description: "Revenue is spread across releases with lower concentration risk.",
  };
}

export function buildPayoutReadinessSummary(
  revenue: CreatorDashboardRevenue | null,
): PayoutReadinessSummary {
  const planUnlocked = !Boolean(revenue?.sellingLocked);
  const monetizationReadiness = revenue?.monetizationReadiness ?? null;
  const hasPurchasableCatalog = Boolean(
    (monetizationReadiness?.purchasableTracks ?? 0) +
      (monetizationReadiness?.purchasableAlbums ?? 0) >
      0,
  );
  const hasRecordedSales = (revenue?.snapshot?.salesCount ?? 0) > 0;
  const hasUnmonetizedPublishedTracks =
    (monetizationReadiness?.unmonetizedPublishedTracks ?? 0) > 0;
  const recommendedAction = monetizationReadiness?.recommendedAction ?? null;

  if (!planUnlocked) {
    return {
      state: "blocked",
      summary:
        "Catalog selling is plan-locked. Upgrade before payout-relevant signals can progress.",
      checks: {
        planUnlocked,
        hasPurchasableCatalog,
        hasRecordedSales,
        hasUnmonetizedPublishedTracks,
      },
      nextAction: recommendedAction ?? {
        label: "Review plan",
        href: "/account/plan",
      },
    };
  }

  if (!hasPurchasableCatalog) {
    return {
      state: "needs_action",
      summary:
        "No purchasable releases are configured yet. Enable pricing on tracks or albums first.",
      checks: {
        planUnlocked,
        hasPurchasableCatalog,
        hasRecordedSales,
        hasUnmonetizedPublishedTracks,
      },
      nextAction: recommendedAction ?? {
        label: "Set release pricing",
        href: "/catalog/tracks",
      },
    };
  }

  if (hasUnmonetizedPublishedTracks) {
    return {
      state: "needs_action",
      summary:
        "Published releases exist without monetization enabled. Resolve those gaps for payout readiness.",
      checks: {
        planUnlocked,
        hasPurchasableCatalog,
        hasRecordedSales,
        hasUnmonetizedPublishedTracks,
      },
      nextAction: recommendedAction ?? {
        label: "Review monetization",
        href: "/dashboard/monetization",
      },
    };
  }

  if (!hasRecordedSales) {
    return {
      state: "needs_action",
      summary:
        "Catalog is monetization-ready, but there are no completed sales yet to validate payout flow.",
      checks: {
        planUnlocked,
        hasPurchasableCatalog,
        hasRecordedSales,
        hasUnmonetizedPublishedTracks,
      },
      nextAction: {
        label: "Review revenue surfaces",
        href: "/account/revenue",
      },
    };
  }

  return {
    state: "ready",
    summary:
      "Monetization is active with recorded sales and no remaining published monetization gaps.",
    checks: {
      planUnlocked,
      hasPurchasableCatalog,
      hasRecordedSales,
      hasUnmonetizedPublishedTracks,
    },
    nextAction: {
      label: "Open revenue details",
      href: "/account/revenue",
    },
  };
}
