import assert from "node:assert/strict";

import {
  resolveCreateEntryHref,
  resolveCreatorEntryHref,
  resolveReadinessActionHref,
  resolveVerificationTaskHref,
} from "../src/features/bootstrap/routes";

function testResolveCreatorEntryHref() {
  assert.equal(
    resolveCreatorEntryHref({
      hasSession: false,
      accessState: "loading",
      onboardingState: "needs_intro",
      createEntryTarget: "upload_track",
    }),
    "/welcome",
  );

  assert.equal(
    resolveCreatorEntryHref({
      hasSession: true,
      accessState: "non_creator_blocked",
      onboardingState: "needs_intro",
      createEntryTarget: "upload_track",
    }),
    "/creator-access",
  );

  assert.equal(
    resolveCreatorEntryHref({
      hasSession: true,
      accessState: "creator_setup_required",
      onboardingState: "needs_intro",
      createEntryTarget: "upload_track",
    }),
    "/onboarding/intro",
  );

  assert.equal(
    resolveCreatorEntryHref({
      hasSession: true,
      accessState: "creator_setup_required",
      onboardingState: "needs_first_track",
      createEntryTarget: "continue_backend_draft",
    }),
    "/create",
  );

  assert.equal(
    resolveCreatorEntryHref({
      hasSession: true,
      accessState: "error",
      onboardingState: "complete",
      createEntryTarget: "upload_track",
    }),
    "/creator-access",
  );

  assert.equal(
    resolveCreatorEntryHref({
      hasSession: true,
      accessState: "creator_ready",
      onboardingState: "complete",
      createEntryTarget: "upload_track",
    }),
    "/dashboard",
  );
}

function testResolveCreateEntryHref() {
  assert.equal(
    resolveCreateEntryHref({
      createEntryTarget: "create_album",
      tracksSummary: null,
      uploadOptions: null,
    }),
    "/create/album",
  );

  assert.equal(
    resolveCreateEntryHref({
      createEntryTarget: "recover_failed_item",
      tracksSummary: {
        tracks: [
          {
            id: 101,
            status: { processing: "failed" },
            timestamps: { updatedAt: "2026-04-01T12:00:00Z" },
          },
          {
            id: 202,
            status: { processing: "failed" },
            timestamps: { updatedAt: "2026-04-05T12:00:00Z" },
          },
        ],
      } as any,
      uploadOptions: null,
    }),
    "/create/progress/202",
  );

  assert.equal(
    resolveCreateEntryHref({
      createEntryTarget: "continue_backend_draft",
      tracksSummary: {
        tracks: [
          {
            id: 303,
            status: { releaseState: "draft" },
            timestamps: { updatedAt: "2026-04-03T12:00:00Z" },
          },
          {
            id: 404,
            status: { releaseState: "draft" },
            timestamps: { updatedAt: "2026-04-09T12:00:00Z" },
          },
        ],
      } as any,
      uploadOptions: null,
    }),
    "/create/review/404",
  );

  assert.equal(
    resolveCreateEntryHref({
      createEntryTarget: "upload_track",
      tracksSummary: null,
      uploadOptions: {
        albums: [{ id: 77 }],
      } as any,
    }),
    "/create/upload?albumId=77",
  );

  assert.equal(
    resolveCreateEntryHref({
      createEntryTarget: "upload_track",
      tracksSummary: null,
      uploadOptions: null,
    }),
    "/create/select-album",
  );
}

function testResolveReadinessActionHref() {
  assert.equal(
    resolveReadinessActionHref({
      actionKey: "recover_failed_item",
      createEntryTarget: "recover_failed_item",
      tracksSummary: {
        tracks: [
          {
            id: 9001,
            status: { processing: "failed" },
            timestamps: { updatedAt: "2026-04-10T12:00:00Z" },
          },
        ],
      } as any,
      uploadOptions: null,
    }),
    "/create/progress/9001",
  );

  assert.equal(
    resolveReadinessActionHref({
      actionKey: "continue_backend_draft",
      createEntryTarget: "continue_backend_draft",
      tracksSummary: {
        tracks: [
          {
            id: 711,
            status: { releaseState: "draft" },
            timestamps: { updatedAt: "2026-04-11T12:00:00Z" },
          },
        ],
      } as any,
      uploadOptions: null,
    }),
    "/create/review/711",
  );

  assert.equal(
    resolveReadinessActionHref({
      actionKey: "review_catalog_metadata",
      createEntryTarget: "upload_track",
      tracksSummary: null,
      uploadOptions: null,
    }),
    "/catalog/tracks",
  );
}

function testResolveVerificationTaskHref() {
  assert.equal(
    resolveVerificationTaskHref({
      actionKey: "request_verification",
      status: "not_requested",
      canRequest: true,
      eligible: true,
    }),
    "/account/verification",
  );

  assert.equal(
    resolveVerificationTaskHref({
      actionKey: "review_pending_verification",
      status: "pending",
      canRequest: false,
      eligible: true,
    }),
    "/account/verification",
  );

  assert.equal(
    resolveVerificationTaskHref({
      actionKey: "resubmit_verification",
      status: "rejected",
      canRequest: true,
      eligible: true,
    }),
    "/account/verification",
  );

  assert.equal(
    resolveVerificationTaskHref({
      actionKey: "fix_verification_eligibility",
      status: "not_requested",
      canRequest: false,
      eligible: false,
    }),
    "/account/profile",
  );
}

function run() {
  testResolveCreatorEntryHref();
  testResolveCreateEntryHref();
  testResolveReadinessActionHref();
  testResolveVerificationTaskHref();
}

run();
