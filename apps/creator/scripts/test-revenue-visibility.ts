import assert from "node:assert/strict";

import {
  buildPayoutReadinessSummary,
  buildRevenueTrendSummary,
} from "../src/features/revenue/insights";

function testRevenueTrendSummary() {
  const trendPending = buildRevenueTrendSummary(null);
  assert.equal(trendPending.concentrationLevel, "insufficient_data");
  assert.equal(trendPending.topReleaseSharePercent, null);

  const concentrated = buildRevenueTrendSummary({
    snapshot: {
      grossRevenue: 200,
      salesCount: 20,
      topEarningTrack: { title: "Track A", amount: 120 },
      topEarningAlbum: { title: "Album A", amount: 40 },
    },
    topEarningReleases: [
      {
        type: "track",
        id: 1,
        title: "Track A",
        artworkUrl: null,
        revenue: 150,
        unitsSold: 10,
        isPurchasable: true,
        href: "/catalog/tracks/1",
      },
      {
        type: "album",
        id: 2,
        title: "Album A",
        artworkUrl: null,
        revenue: 50,
        unitsSold: 5,
        isPurchasable: true,
        href: "/catalog/albums/2",
      },
    ],
    monetizationReadiness: {
      purchasableTracks: 1,
      purchasableAlbums: 1,
      subscriberOnlyTracks: 0,
      unmonetizedPublishedTracks: 0,
      recommendedAction: null,
    },
    sellingLocked: false,
  });
  assert.equal(concentrated.averageOrderValue, 10);
  assert.equal(concentrated.topReleaseSharePercent, 75);
  assert.equal(concentrated.concentrationLevel, "single_release");
}

function testPayoutReadinessSummary() {
  const blocked = buildPayoutReadinessSummary({
    snapshot: null,
    topEarningReleases: [],
    monetizationReadiness: {
      purchasableTracks: 0,
      purchasableAlbums: 0,
      subscriberOnlyTracks: 0,
      unmonetizedPublishedTracks: 0,
      recommendedAction: {
        label: "Upgrade plan",
        href: "/account/plan",
      },
    },
    sellingLocked: true,
  });
  assert.equal(blocked.state, "blocked");
  assert.equal(blocked.nextAction.href, "/account/plan");

  const needsAction = buildPayoutReadinessSummary({
    snapshot: {
      grossRevenue: 0,
      salesCount: 0,
      topEarningTrack: { title: null, amount: null },
      topEarningAlbum: { title: null, amount: null },
    },
    topEarningReleases: [],
    monetizationReadiness: {
      purchasableTracks: 0,
      purchasableAlbums: 0,
      subscriberOnlyTracks: 0,
      unmonetizedPublishedTracks: 3,
      recommendedAction: null,
    },
    sellingLocked: false,
  });
  assert.equal(needsAction.state, "needs_action");
  assert.equal(needsAction.nextAction.href, "/catalog/tracks");

  const ready = buildPayoutReadinessSummary({
    snapshot: {
      grossRevenue: 120,
      salesCount: 12,
      topEarningTrack: { title: "Track A", amount: 80 },
      topEarningAlbum: { title: "Album A", amount: 40 },
    },
    topEarningReleases: [
      {
        type: "track",
        id: 1,
        title: "Track A",
        artworkUrl: null,
        revenue: 80,
        unitsSold: 8,
        isPurchasable: true,
        href: "/catalog/tracks/1",
      },
    ],
    monetizationReadiness: {
      purchasableTracks: 3,
      purchasableAlbums: 1,
      subscriberOnlyTracks: 0,
      unmonetizedPublishedTracks: 0,
      recommendedAction: null,
    },
    sellingLocked: false,
  });
  assert.equal(ready.state, "ready");
  assert.equal(ready.nextAction.href, "/account/revenue");
}

function run() {
  testRevenueTrendSummary();
  testPayoutReadinessSummary();
}

run();
