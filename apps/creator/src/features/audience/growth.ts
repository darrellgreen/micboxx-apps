import type { CreatorAnalyticsPayload } from "@/contracts/creator";

export interface AudienceGrowthSummary {
  uniqueListeners: number;
  returningSharePercent: number | null;
  engagementBacklog: number;
  playsTrendPercent: number | null;
  momentumLabel: string;
  momentumDescription: string;
}

function deriveTrendPercent(
  playsOverTime: { label: string; plays: number }[] | null | undefined,
): number | null {
  if (!playsOverTime || playsOverTime.length < 2) {
    return null;
  }

  const first = playsOverTime[0]?.plays ?? 0;
  const last = playsOverTime[playsOverTime.length - 1]?.plays ?? 0;
  if (first <= 0) {
    return null;
  }

  return Math.round(((last - first) / first) * 100);
}

function describeMomentum(input: {
  trendPercent: number | null;
  engagementBacklog: number;
}): Pick<AudienceGrowthSummary, "momentumLabel" | "momentumDescription"> {
  if (input.trendPercent == null) {
    return {
      momentumLabel: "Insufficient data",
      momentumDescription:
        "Audience momentum will appear after enough analytics windows are available.",
    };
  }

  if (input.trendPercent >= 20) {
    return {
      momentumLabel: "Accelerating",
      momentumDescription:
        input.engagementBacklog > 0
          ? "Audience growth is accelerating, and there is unread audience activity to triage."
          : "Audience growth is accelerating across the current analytics window.",
    };
  }

  if (input.trendPercent >= 0) {
    return {
      momentumLabel: "Growing",
      momentumDescription:
        input.engagementBacklog > 0
          ? "Audience trend is positive with pending inbox or notification follow-up."
          : "Audience trend is positive and engagement queue is clear.",
    };
  }

  return {
    momentumLabel: "Cooling",
    momentumDescription:
      "Audience trend is down versus the first window. Review recent releases and audience touchpoints.",
  };
}

export function buildAudienceGrowthSummary(input: {
  analytics: CreatorAnalyticsPayload | null;
  unreadMessageCount: number;
  unreadNotificationCount: number;
}): AudienceGrowthSummary {
  const uniqueListeners = input.analytics?.basic.uniqueListeners ?? 0;
  const returningSharePercent =
    input.analytics?.premium?.returningAudience?.returningSharePercent ?? null;
  const engagementBacklog =
    input.unreadMessageCount + input.unreadNotificationCount;
  const playsTrendPercent = deriveTrendPercent(
    input.analytics?.hero?.playsOverTime,
  );
  const momentum = describeMomentum({
    trendPercent: playsTrendPercent,
    engagementBacklog,
  });

  return {
    uniqueListeners,
    returningSharePercent,
    engagementBacklog,
    playsTrendPercent,
    momentumLabel: momentum.momentumLabel,
    momentumDescription: momentum.momentumDescription,
  };
}
