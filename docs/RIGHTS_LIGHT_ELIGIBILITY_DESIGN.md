# MicBoxx Rights-Light Content Eligibility — Design

**Date:** 2026-06-09
**Type:** Discovery document 2 of 5 (design, not implementation)
**Thesis alignment:** MicBoxx is rights-*aware*, not a rights-administration company. Responsibility sits with uploaders and partners; the platform keeps enough control to gate publishing, restrict playback, and honor takedowns.

---

## 1. The Headline Discovery

The rights spine is **already built and already wired together** — it just isn't connected to the product:

1. `micboxx_rights` provides tested repositories (RightsHolder, Contributor, Territory, OwnershipSnapshot, TakedownUpdateRequest) and three readiness checkers (`OwnershipReadinessChecker`, `TerritoryReadinessChecker`, `TakedownUpdateReadinessChecker`) — all kernel-tested. (High)
2. `ReleaseReadinessProfileBuilder` (`micboxx_music_readiness/src/Service/ReleaseReadinessProfileBuilder.php`) **already composes all three checkers** — it imports them (lines 11–14), requires an approved ownership snapshot ("Ownership: approved snapshot required.", line ~130), and carries takedown warnings as profile findings (lines 89–90). (High)
3. `TakedownUpdateRequestRepository` already supports the full gating contract: `createRequest()`, `hasBlockingRequest()`, `hasPendingRequest()`, per-subject listing. (High)

**What's missing is purely the product layer (High):**

- `TrackPublicationManager.publishTrack()/scheduleTrack()` (`micboxx_music/src/Service/TrackPublicationManager.php:31,69`) **never consults the readiness profile** — publishing is ungated.
- Readiness is exposed only at an **admin operations route** (`/admin/micboxx/operations/readiness`, `micboxx_music_readiness.routing.yml`) — creators never see it.
- No **attestation capture** exists in any upload flow (studio web, creator mobile) — nothing creates ownership snapshots from creator action.
- No **takedown intake surface** exists — the repository has no public/creator-facing route.
- No **provenance field** distinguishes artist-uploaded from partner-ingested content at the Track/playback level (DSP ingest knows the source at ingest time; it is not carried forward as policy).

Design implication: this is a **wiring project, not a build project**. Every component below names the existing service it reuses.

---

## 2. Goals & Non-Goals

**Goals**
1. Every published track has an uploader attestation on record (who claimed what, when, under which terms version).
2. Publishing is gated by the existing readiness profile (blocking findings stop publish; warnings don't).
3. Takedown/dispute requests have an intake path and automatically restrict content via `hasBlockingRequest()`.
4. Catalog provenance (artist-uploaded vs partner-licensed) is a first-class flag consulted by playback and monetization policy.
5. The platform can answer, per track: *is this eligible for public playback, rooms, monetization, territory X?*

**Non-goals (explicit, per strategic framing)**
- No rights administration: no split sheets, no publishing royalty accounting, no PRO integration.
- No sync licensing marketplace.
- No claim adjudication beyond a simple operator review queue — MicBoxx referees process, not ownership truth.
- No Content-ID-style audio fingerprinting in v1 (note as future option only).

## 3. Eligibility Model

One new derived state per Track/Album, computed (not stored as truth) from existing sources:

```
eligibility = f(attestation, readiness profile, takedown state, provenance, moderation)

  eligible            → publicly playable, room-usable, monetizable
  eligible_restricted → playable with limits (e.g. territory-filtered, demo-only)
  ineligible_pending  → blocked from publish (missing attestation / blocking finding)
  ineligible_blocked  → unpublished/hidden (approved takedown, moderation action)
```

- Source of truth stays in the existing tables (ownership snapshots, takedown requests, territory records); eligibility is the `ReleaseReadinessProfileBuilder` output reduced to one enum + findings list. **Reuse `buildTrackProfile()`/`buildAlbumProfile()` as-is**; add a thin `EligibilityResolver` that maps profile findings → enum.
- Provenance: add a `catalog_provenance` field on Track/Album (`artist_uploaded` | `partner_licensed` | `platform_seeded`), set at creation time — by the upload flow for creators, by `DspIngestDraftCatalogCommitService` for partner ingests. Different attestation rules per provenance: creators attest personally; partners attest contractually at the client/batch level (their API submission *is* the attestation, recorded per `DspIngestAcknowledgement`).

## 4. Component Design (each names its reuse)

### 4.1 Uploader attestation
- **Where:** one step in existing upload flows — studio (`apps/studio` uploads pages) and creator mobile (track create flow). Checkbox set + terms version: "I own or control these rights / I am authorized / I accept the platform license."
- **Backend:** `POST /v1/dashboard/tracks/{track}/attestation` (new, thin) writing an **OwnershipSnapshot** via the existing `OwnershipSnapshotRepository` with `source = creator_attestation`, terms version, timestamp, account id. No new tables. (`OwnershipReadinessChecker` already requires an approved snapshot — creator attestation creates it in `approved` state for `artist_uploaded` provenance; partner provenance gets snapshots from ingest.)
- **Re-attestation:** replacing source audio (`POST /v1/dashboard/tracks/{track}/source-audio`) invalidates the snapshot (new snapshot required) — matches the snapshot model's point-in-time semantics.

### 4.2 Publish gate
- **Where:** inside `TrackPublicationManager::publishTrack()` and `scheduleTrack()` (and album equivalents in `AlbumPublicationManager`).
- **Logic:** call `ReleaseReadinessProfileBuilder::buildTrackProfile()`; blocking findings (no approved snapshot, `hasBlockingRequest()` true) → reject with the findings list in the API error payload; warnings pass through to the response for UI display.
- **Escape hatch:** operator override permission for edge cases, logged via `fever_audit`.

### 4.3 Creator-facing "Release Health" surface
- Reuse the admin readiness data: new `GET /v1/dashboard/tracks/{track}/readiness` returning the same profile the admin overview uses (`ReadinessOperationsController` already renders it at `/admin/micboxx/operations/readiness/{subject_type}/{subject_id}`).
- Surfaces: studio release pages and creator mobile release detail — a findings checklist ("Attestation ✓ / Artwork ✓ / Territory — none set (worldwide default) / 1 warning").
- This doubles as the DSP-submission pre-flight the readiness slices (`docs/architecture/micboxx-dsp-readiness-slice-*.md`) were written for.

### 4.4 Takedown / dispute intake
- **Public intake:** lightweight web form (web app, `/report-content` or per-track page action) → new `POST /v1/public/takedown-requests` → `TakedownUpdateRequestRepository::createRequest()` with reporter contact, subject, claim type (ownership dispute / DMCA-style notice / other).
- **Effect:** `hasPendingRequest()` shows a flag in operator console; operator approval flips to blocking → `hasBlockingRequest()` → eligibility `ineligible_blocked` → existing unpublish path (`TrackPublicationManager::unpublishTrack()`).
- **Operator queue:** extend the existing readiness operations console rather than building new admin UI.
- **Counter-notice:** out of scope for v1; record disposition notes only.

### 4.5 Provenance-aware playback & monetization policy
- Playback source resolution (web entitlement checks; mobile `playbackSourceResolver.ts`) additionally consults eligibility + provenance:
  - `partner_licensed` + territory records (via `TerritoryReadinessChecker::trackHasActiveTerritory()`) → territory-filtered availability.
  - `ineligible_blocked` → no playback anywhere, including rooms and Time Machine.
  - Monetization rails (purchase, support attribution, ads) only on `eligible` content; partner content's monetizability is a per-partner flag on the `micboxx_dsp_partner` Partner record.
- Room creation for a release requires the release to be `eligible` — one check in `RoomEntryController`/room claim flow.

## 5. Rollout

1. **Phase A (pre-launch, blocks Gap 3 in the Atlas):** attestation capture + publish gate + creator readiness endpoint. Backfill: existing published tracks get a grandfathered snapshot (`source = backfill_grandfathered`), with a one-time re-attestation prompt on next edit.
2. **Phase B:** takedown intake + operator queue + blocked-state playback enforcement.
3. **Phase C (pre-partner):** provenance field + territory enforcement + per-partner monetization flags.

## 6. Open Questions (for founder/product)

1. Terms-of-license text and version management — who owns the legal copy? (Blocker for Phase A.)
2. Should attestation be per-track or per-release (album-level with track inheritance)? Recommendation: per-track record, album-level UX.
3. Grandfathering window for existing catalog before the publish gate turns on.
4. Whether `eligible_restricted` (demo-only playback for disputed-but-not-blocked content) is wanted in v1 or collapses into binary eligible/blocked.

---

*Cross-references: Atlas §4G (rights status), Gap 3/8/14; team roadmap "Rights, claims, and release-readiness expansion" (MCBM-118–124) — this design is a concrete proposal for that Jira range. Evidence: all service/method names verified by direct read on 2026-06-09.*
