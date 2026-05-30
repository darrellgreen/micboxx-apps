import assert from "node:assert/strict";

import { buildAudienceGrowthSummary } from "../src/features/audience/growth";

function testGrowthPending() {
  const summary = buildAudienceGrowthSummary({
    analytics: null,
    unreadMessageCount: 0,
    unreadNotificationCount: 0,
  });

  assert.equal(summary.uniqueListeners, 0);
  assert.equal(summary.returningSharePercent, null);
  assert.equal(summary.playsTrendPercent, null);
  assert.equal(summary.momentumLabel, "Insufficient data");
}

function testGrowthAcceleratingWithBacklog() {
  const summary = buildAudienceGrowthSummary({
    analytics: {
      basic: {
        uniqueListeners: 400,
      },
      hero: {
        playsOverTime: [
          { label: "Week 1", plays: 100 },
          { label: "Week 2", plays: 130 },
        ],
      },
      premium: {
        returningAudience: {
          returningSharePercent: 46,
        },
      },
    } as any,
    unreadMessageCount: 3,
    unreadNotificationCount: 2,
  });

  assert.equal(summary.uniqueListeners, 400);
  assert.equal(summary.returningSharePercent, 46);
  assert.equal(summary.engagementBacklog, 5);
  assert.equal(summary.playsTrendPercent, 30);
  assert.equal(summary.momentumLabel, "Accelerating");
}

function testGrowthCooling() {
  const summary = buildAudienceGrowthSummary({
    analytics: {
      basic: {
        uniqueListeners: 180,
      },
      hero: {
        playsOverTime: [
          { label: "Week 1", plays: 100 },
          { label: "Week 2", plays: 75 },
        ],
      },
      premium: null,
    } as any,
    unreadMessageCount: 0,
    unreadNotificationCount: 0,
  });

  assert.equal(summary.playsTrendPercent, -25);
  assert.equal(summary.momentumLabel, "Cooling");
}

function run() {
  testGrowthPending();
  testGrowthAcceleratingWithBacklog();
  testGrowthCooling();
}

run();
