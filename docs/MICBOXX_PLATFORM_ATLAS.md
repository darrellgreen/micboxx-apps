# MicBoxx Platform Atlas: System Discovery & Capability Map

**Date:** 2026-06-09
**Type:** Read-only platform discovery artifact
**Scope:** Three repositories — `micboxx-apps` (mobile monorepo), `micboxx-web` (web monorepo), `micboxx-server` (Drupal backend)
**Method:** Full codebase inspection (routing files, modules, packages, contracts, configs, tests, internal docs). No code was modified.

**Confidence labels used throughout:**
- **High** — directly proven by code read during this discovery
- **Medium** — supported by multiple references (code + docs + naming)
- **Low** — inferred from naming, structure, or partial code
- **Unknown** — not enough evidence

**Status scale used throughout:** Complete · Mostly complete · Partial · Prototype · Stubbed · Missing · Unknown

---

## 1. Executive Summary

### Current platform identity

MicBoxx is **not an early prototype**. It is a multi-surface music platform with production-grade infrastructure across four client applications and a deep Drupal 11 backend with **38 custom modules** (`micboxx-server/web/modules/custom/`). The platform already operates as three things simultaneously:

1. **A streaming/catalog product** — upload, FFmpeg processing pipeline, waveforms, public catalog APIs, Solr search, playback with entitlement gating.
2. **A social release-event platform** — "Release Rooms" with synchronized playback clocks, chat, reactions, polls, Q&A, artist video drop-ins (LiveKit), Time Machine replay, and in-room fan support — implemented end-to-end across server (47 API routes in `micboxx_rooms.routing.yml`), web, and both mobile apps.
3. **A catalog distribution/ingestion hub** — an outbound DSP submission API (`micboxx_dsp`) *and* an inbound partner catalog ingest system (`micboxx_dsp_ingest`) with API-key client registry, validation → matching → operator review → commit pipeline, and e2e proof scripts. This is the least visible and most strategically significant system in the codebase.

### Primary product surfaces

| Surface | Repo | Status |
|---|---|---|
| Listener web app (micboxx.com) | `micboxx-web/apps/web` | Live, under performance optimization |
| Creator Studio web app | `micboxx-web/apps/studio` | Functional; web→studio migration in flight |
| Consumer mobile app ("MicBoxx", `com.micboxx.mobile`) | `micboxx-apps/apps/consumer` | Functional, near release-ready |
| Creator mobile app ("MicBoxx Studio", `com.micboxx.creators`) | `micboxx-apps/apps/creator` | Functional, beta-ready; RevenueCat live |
| Backend / canonical API | `micboxx-server` (Drupal 11, `/v1/*`) | Production |

### Strongest existing capabilities (High confidence)

- **Release Rooms** — the most differentiated and most completely built product surface (server + web + both mobile apps + Firestore projections + moderation + monetization hooks).
- **Catalog pipeline** — upload → async FFmpeg processing → derivatives/waveforms → scheduled publishing (ECA workflows) → public catalog → Solr search.
- **Multi-rail monetization** — Stripe track/album/subscription checkout with webhooks, entitlement resolution (`fever_core_entitlements`), preroll music ads, RevenueCat creator subscription ("MicBoxx Pro"), in-room fan support, and a full payout/settlement/reconciliation subsystem (`micboxx_payouts`).
- **Social graph** — follows, likes, comments, DMs, notifications on Firestore with a Drupal-UUID-aligned custom-token identity bridge.

### Most important gaps

- **Mobile product analytics is a console stub** — no telemetry flows from either mobile app (`apps/*/src/features/analytics/adapter.ts`).
- **Creator mobile app has no push notifications** (no Firebase messaging dependency).
- **Rights/eligibility is backend-scaffolded but not enforced at upload** — `micboxx_rights` has repositories and readiness checkers but no uploader attestation flow in any client; the team's own roadmap defers this ("Rights, claims, and release-readiness expansion", MCBM-118–124).
- **Subscription lifecycle completion is open** (MCBM-90–97 per `docs/MicBoxx Product Readiness Snapshot.md`).
- **Secrets** — the originally suspected leaks (Apple `.p8` at the micboxx-apps root, OAuth keys in `micboxx-server/keys/`) were **verified gitignored and never committed** (Appendix A); however, a full-history gitleaks baseline found **one genuine committed credential**: AWS SES SMTP user/pass in `micboxx-server/config/sync/symfony_mailer.mailer_transport.smtp.yml` (Gap 18 — rotate and move to env override).
- **Moderation is room-scoped**; there is no visible platform-wide trust & safety review queue beyond admin endpoints and report records.

### Biggest strategic discovery

The DSP infrastructure cuts both ways: MicBoxx can **send releases out** to DSP distribution (`POST /v1/dsp/submissions`) and **receive partner catalogs in** (`POST /v1/partner-ingest/releases` with API-key auth, client registry, key rotation/revocation). Combined with Release Rooms and the payouts subsystem, the architecture points at something none of the obvious comparables do: a **catalog activation platform** — where artist-uploaded and partner-licensed catalogs can both be turned into monetizable fan experiences, not just streams.

### Recommended next documentation/audit work

See §12. Top five: (1) security/secrets audit, (2) rights & content-eligibility design doc, (3) monetization ledger end-to-end audit (Stripe → entitlements → payouts), (4) Release Room monetization product spec, (5) mobile launch readiness checklist.

---

## 2. Platform Map

### 2.1 micboxx-server — Backend & Canonical API

- **Purpose:** Source of truth for catalog, users, commerce, rooms, payouts, DSP integration. Serves the custom normalized `/v1/*` JSON API consumed by all clients.
- **Stack:** Drupal 11.3, PHP 8.1+, Simple OAuth 6, Stripe PHP SDK 20, kreait/firebase-php 7 (FCM), Search API + Solr (`search_api_solr ^4.3`), S3 file storage (`s3fs ^3.10`, Minio for local), ECA 3 rules engine, Ultimate Cron, DDEV local environment. (High — `composer.json`)
- **Primary users:** All client apps, DSP partners (API key), operators/admins (Drupal admin + `/console/*`).
- **Major capabilities:** Catalog CRUD + processing, auth/OAuth, rooms (47 routes), commerce + webhooks, entitlements, payouts/settlement, push delivery, DSP submission + partner ingest, verification, rights data layer, articles, radio, rewards, digests, advertising, analytics, audit logging.
- **Important directories:** `web/modules/custom/` (38 modules), `docs/` (80+ internal docs), `scripts/` (verification/fixture scripts), root-level DSP e2e scripts (`create-dsp-e2e-test.php`, `test-dsp-ingest-e2e.php`), `phpunit.xml` (15+ test suites).
- **Module domains (High):**
  - *Music:* `micboxx_music` (Track/Album/Playlist entities, dashboard + public controllers), `micboxx_music_ingest` (upload/processing state), `micboxx_music_identity` (Artist/Label repos), `micboxx_music_assets`, `micboxx_music_analytics`, `micboxx_music_ads`, `micboxx_music_promotions`, `micboxx_music_readiness`, `micboxx_music_video(+_ingest)`, `micboxx_music_cli`
  - *Distribution:* `micboxx_dsp`, `micboxx_dsp_ingest`, `micboxx_dsp_partner`, `micboxx_distribution`, `micboxx_ingest`
  - *Commerce/finance:* `fever_core_commerce`, `micboxx_commerce_music`, `fever_core_entitlements`, `fever_core_balance`, `micboxx_payouts`, `fever_intervention_ledger`, `fever_core_advertising`, `core_commerce`
  - *Social/live:* `micboxx_rooms`, `micboxx_notifications`, `micboxx_push`
  - *Identity/trust:* `micboxx_auth`, `micboxx_social_login`, `micboxx_verification`, `micboxx_rights`, `fever_audit`
  - *Content/growth:* `micboxx_articles`, `micboxx_radio`, `micboxx_rewards`, `micboxx_digest_delivery`, `micboxx_mail`, `fever_core_analytics`
- **Maturity:** **Production-ready** for core (catalog, auth, commerce, rooms); **Functional** for payouts/DSP (implemented, not broadly launched per the team's own `docs/MicBoxx Product Readiness Snapshot.md`); **Partial** for rights/promotions/radio.
- **Note on naming:** `fever_*` modules are legacy-branded but MicBoxx-owned infrastructure (per `AGENTS.md`; `fevercore-server` is a retired predecessor).

### 2.2 micboxx-web / apps/web — Listener Web App

- **Purpose:** Public listener platform: discovery, playback, artist/album/track pages, rooms, library, purchases/subscriptions, messaging. Governance explicitly scopes it to listener surfaces (`docs/WEB_VS_STUDIO_BOUNDARIES.md`, ADR dated 2026-05-11, High).
- **Stack:** Next.js 16.2, React 19.2, App Router, pnpm + turbo monorepo, Vercel deploy, Firebase (Auth custom tokens + Firestore), Stripe, Sentry, Playwright e2e, GitHub Actions CI.
- **Major routes (High):** `/discover`, `/search`, `/top-music`, `/new-music`, `/track/[slug]`, `/albums/[slug]`, `/genres/[slug]`, `/rooms`, `/account/*` (library, playlists, subscriptions, billing), `/messages/*`, marketing/legal pages, `/embed/tracks/[slug]`.
- **Notable architecture:** Deferred player provider (extraction validated in `PLAYER_PROVIDER_EXTRACTION_REPORT.md`), deferred auth shell (implemented, unvalidated per `PERFORMANCE_PHASE_STATUS.md`), extensive Next.js API routes proxying/augmenting the Drupal `/v1` API plus Firestore-backed social/room features.
- **Maturity:** **Functional/Production** with active performance remediation; `/discover` LCP regression (16.3s in Lighthouse baseline) unresolved.

### 2.3 micboxx-web / apps/studio — Creator Studio (web)

- **Purpose:** "Authoritative creator application" (ADR language): uploads, releases, playlists, analytics, earnings, billing, moderation, campaigns, rooms management, messaging, settings.
- **Routes (High):** `/home`, `/uploads(/[trackId], /redesign)`, `/releases(/albums/[albumId])`, `/playlists/*`, `/analytics`, `/earnings`, `/billing`, `/moderation`, `/campaigns`, `/rooms`, `/messages/*`, `/settings`, `/creator-access-required`.
- **Maturity:** **Partial** — primary creator surfaces exist; migration of legacy creator features out of `apps/web` is tracked in `docs/WEB_TO_STUDIO_MIGRATION_REGISTER.md` and incomplete.

### 2.4 micboxx-apps / apps/consumer — Consumer Mobile App

- **Purpose:** Listener mobile app: catalog, playback, rooms, social, notifications.
- **Stack:** Expo SDK 54, React Native 0.81.5, React 19, expo-router, Redux Toolkit + RTK Query (`@micboxx/api`), react-native-track-player, LiveKit RN (room video), Firebase JS + @react-native-firebase/messaging (FCM), expo-secure-store, Sentry RN. Bundle ID `com.micboxx.mobile`, scheme `micboxx://`, EAS configured. (High — `apps/consumer/app.json`, `package.json`)
- **Maturity:** **Functional, near release-ready.** Auth (Drupal OAuth2 PKCE), playback, rooms (chat/reactions/Q&A/support/time machine/live video), social graph (Firestore via web custom-token bridge), FCM push, deep links all implemented. Analytics is a console stub; no automated tests.

### 2.5 micboxx-apps / apps/creator — Creator Mobile App ("MicBoxx Studio")

- **Purpose:** Creator mobile app: catalog management (tracks/albums/playlists), release rooms control, artist video drop-ins, revenue/audience analytics, RevenueCat "MicBoxx Pro" subscription paywall.
- **Stack:** Same base as consumer, plus react-native-purchases(+ui) 10.2 (RevenueCat), expo-image-picker/document-picker, draggable flatlist, LiveKit video. Bundle ID `com.micboxx.creators`. (High)
- **Maturity:** **Functional / beta-ready.** Creator gate (role/permission check), bootstrap onboarding (profile → album → track → release) with fixture scenarios, revenue visibility, monetization tab. **Missing:** push notifications, real analytics. The server team labels the creator native app "Implemented (scaffolded), not production-complete" (`MicBoxx Product Readiness Snapshot.md`).

### 2.6 Shared packages

**Mobile monorepo (`micboxx-apps/packages/`, High):** `@micboxx/contracts` (8 contract files: `micboxx.ts`, `rooms.ts` (54 exports), `social.ts`, `commerce.ts`, `dashboard.ts`, `player.ts`, `registration.ts`), `@micboxx/api` (RTK Query client + fixtures), `@micboxx/ui`, `@micboxx/theme`, `@micboxx/analytics` (interface only), `@micboxx/notifications`, `@micboxx/media`, `@micboxx/utils` (placeholder).

**Web monorepo (`micboxx-web/packages/`, High):** `@micboxx/api-client` (HTTP transport, bearer auth, envelopes), `@micboxx/types` (auth/creator/music/commerce/social/earnings/analytics), `@micboxx/ui`, `@micboxx/design-tokens`, `@micboxx/tsconfig`.

**Key observation (High):** The mobile and web monorepos maintain **two parallel, independently named contract/type systems** for the same backend API. There is no cross-repo shared contract package and no codegen from an API schema. This is the platform's largest structural duplication.

### 2.7 Admin/operator surfaces

- Drupal admin (`/admin/*`), payout reports (`/admin/reports/micboxx-payouts/{events,balances,eligibility,runs,batches,statements,adjustments,reconciliation}` — High, `micboxx_payouts` routing), DSP ingest console (`/console/ingest/batches`, `/console/ingest/match-results` — High), web admin API routes (`/api/admin/users|tracks|albums/...` verify/feature/publish actions — High).

### 2.8 Supporting scripts and tests

- **Server:** 15+ PHPUnit suites (`phpunit.xml`), ~25 verification scripts in `scripts/` (checkout/webhook/entitlement/ad-eligibility verifiers, fixture seeders), root-level DSP e2e scripts proving album→publish→DSP-submit→batch flows.
- **Web:** 20+ Playwright e2e specs (`apps/web/e2e/`), Firestore rules/projection validators (`apps/web/scripts/validate-*.mjs`), CI (lint→typecheck→build).
- **Mobile:** No test framework, no CI; fixture-based verification scripts only (`verify:web:*`, `test:bootstrap-routes` etc. in `apps/creator/package.json`).

---

## 3. Capability Inventory

Statuses below are cross-checked against the team's own `micboxx-server/docs/MicBoxx Product Readiness Snapshot.md` (2026-04-20), which distinguishes Live / Implemented / In Progress / Planned. Where this atlas and that snapshot agree, confidence is High.

| Capability | Frontend | Backend/API | Storage | Mobile/Web parity | Status | Confidence |
|---|---|---|---|---|---|---|
| Auth (OAuth2, registration, social login) | All 4 apps | `micboxx_auth`, Simple OAuth, `micboxx_social_login` | Drupal users + secure token storage | Full parity | **Complete** | High |
| Catalog upload & processing | Studio web + creator mobile | `micboxx_music`, `micboxx_music_ingest` (queue + FFmpeg) | S3 + media entities | Web richer; mobile functional | **Mostly complete** | High |
| Release management (draft/schedule/publish) | Studio + creator mobile | `MusicReleaseManager`, ECA scheduled publishing | release_state fields | Parity | **Mostly complete** | High |
| Public catalog & artist/album/track pages | Web + consumer mobile | `/v1/public/*` controllers | Drupal + Solr index | Parity | **Complete** | High |
| Playback (queue, persistence, gating) | Web (deferred provider) + both mobile (track-player) | Audio derivatives, demo URLs, entitlement checks | Session/AsyncStorage queue persistence | Parity | **Complete** | High |
| Search & discovery | Web + consumer mobile | `PublicSearchController`, Solr indexes (tracks/albums/artists/playlists/genres) | Solr | Parity | **Mostly complete** (personalization early) | High |
| Recommendations | Web API (`/api/recommendations/*`) + mobile endpoints | Web-upstream; no stable server contract yet (snapshot note) | Firestore `recommendationEvents` | Mobile depends on web upstream | **Partial** | Medium |
| Release Rooms (chat/reactions/polls/Q&A/moments/drop-ins/time machine/support) | Web + both mobile | `micboxx_rooms` — 47 routes | Drupal entities + Firestore projections | Near-parity | **Mostly complete** | High |
| Social graph (follow/like/comment/DM/block) | Web + both mobile | Web custom-token bridge `/api/social/auth/token` | Firestore (source of truth) | Parity | **Complete** | High |
| Notifications — in-app | Web + both mobile | Firestore `notifications` collection group; `/v1/rooms/notifications` compat | Firestore | Parity | **Complete** | High |
| Notifications — push | Consumer mobile only | `micboxx_push` (kreait FCM), `/v1/devices/token` | Device token records | **Creator app missing push** | **Partial** | High |
| Commerce (track/album purchase, listener subscription) | Web checkout | `fever_core_commerce` + `micboxx_commerce_music` + Stripe webhooks | Orders, entitlements | **Mobile has no purchase flow** (IAP question open) | **Mostly complete** (lifecycle gaps MCBM-90–97) | High |
| Entitlements | All apps consume `/v1/dashboard/entitlements` | `fever_core_entitlements` resolver | Entitlement records | Parity (read) | **Complete** | High |
| Creator subscription (RevenueCat "MicBoxx Pro") | Creator mobile paywall | RevenueCat; server-side webhook sync **unverified** | RevenueCat + ? | Mobile-only | **Partial** | Medium |
| Fan support / tips in rooms | Web + consumer mobile UI | `/v1/rooms/{id}/support/{activate,send,status}` | Room support records | Parity | **Mostly complete** | High |
| Music ads (preroll) | Web playback | `fever_core_advertising`, `micboxx_music_ads`, `/api/music-ads/*` | Ad plans/events | Web-only | **Mostly complete** | High |
| Payouts & settlement | Studio `/earnings`; admin reports | `micboxx_payouts` (events, balances, runs, batches, statements, reconciliation), `/v1/creator/earnings` | Payout tables | Creator mobile shows revenue | **Functional, not launched** ("Implemented" per snapshot) | High |
| Creator analytics | Studio `/analytics`, creator mobile dashboard | `/v1/dashboard/analytics/summary`, `micboxx_music_analytics` | Play events | Partial parity | **Partial** | Medium |
| Product analytics / telemetry | Web instrumented (`micboxx-analytics.ts`, Sentry, GA-style platform events) | Fever Core event mirroring (`$FEVERCORE_API_URL/v1/events`) | Firestore + internal | **Mobile = console stub** | **Partial** | High |
| DSP outbound submission | None (creator-facing API only) | `micboxx_dsp` (`/v1/dsp/submissions`, retry) | Submission records | N/A | **Functional** (e2e-proven by scripts) | High |
| Partner catalog ingest (inbound) | Operator console only | `micboxx_dsp_ingest` (8 repositories, full pipeline) | Custom ingest tables | N/A | **Functional, pre-launch** | High |
| Rights / content eligibility | **No client surface** | `micboxx_rights` (RightsHolder/Contributor/Territory/OwnershipSnapshot/TakedownUpdateRequest repos + readiness checkers, kernel-tested) | Custom tables | None | **Prototype/data-layer only**; expansion Planned (MCBM-118–124) | High |
| Verification (artist badge) | Request from profile; admin review | `micboxx_verification`, `/v1/dashboard/user/verification-request` | Verification records | Web + mobile request | **Mostly complete** (hardening in MCBM-50) | High |
| Moderation | Room moderation UI (web+mobile), studio `/moderation`, report buttons | Room mute/block/hide/pin routes; `socialReports` Firestore; web `/api/admin/*` | Firestore + Drupal | Room-scoped parity | **Partial** (platform-wide queue missing) | High |
| Promotions/campaigns | Studio `/campaigns` | `micboxx_music_promotions` (request + manual review) | Promotion records | Web-only | **Partial** ("exposed unfinished product" per snapshot, MCBM-49) | High |
| Radio | Web `/radio` page | `micboxx_radio` module | — | Web-only | **Partial/deferred** ("Implemented", not launched) | Medium |
| Video (uploads/livestream) | Room live video (LiveKit) live; video ingest backend exists | `micboxx_music_video(+_ingest)`, room live-video token routes | Media entities | Rooms only | **Partial** | Medium |
| Rewards / loyalty | No visible client surface | `micboxx_rewards` | — | — | **Prototype/Unknown** | Low |
| Articles/blog, digests | Web `/articles`, `/blog` | `micboxx_articles`, `micboxx_digest_delivery` | Nodes | Web-only | **Mostly complete** | Medium |

**Cross-cutting gaps:** mobile telemetry (stubbed), creator push (missing), rights enforcement at upload (missing), mobile purchase flows (missing/undecided re: IAP policy), duplicated contracts across monorepos, no mobile test coverage.

**Cross-cutting risks:** Firestore as social source-of-truth (eventual consistency), Firebase custom-token bridge as a single point of failure for all mobile social features, Stripe webhook idempotency unverified, private keys stored inside repo working trees (gitignored, never committed — verified).

---

## 4. Capability Expectations To Check Against

### A. Artist & Creator Platform

| Expected | Found | Evidence | Status |
|---|---|---|---|
| Artist onboarding | Yes — creator bootstrap flow (profile → album → track → release) with fixture scenarios | `micboxx-apps/apps/creator/src/features/` bootstrap; `verify:web:needs-profile` etc. | Mostly complete |
| Creator profile/account management | Yes | `/v1/dashboard/user/profile|avatar|cover|account` (`micboxx_auth.routing.yml`) | Complete |
| Artist verification/claiming | Yes — request-and-review verification; room claim requests | `micboxx_verification`; `/v1/rooms/{roomId}/claim-request`; `VerifiedBadge` in `@micboxx/ui` | Mostly complete |
| Creator dashboard | Yes — studio web + creator mobile tabs | `apps/studio/src/app/(site)/(workspace)/home`; creator mobile `(tabs)/dashboard` | Mostly complete |
| Release/track/album management | Yes | §4B | Mostly complete |
| Artist analytics | Summary level | `/v1/dashboard/analytics/summary`; studio `/analytics` | Partial |
| Monetization setup | Pricing/gating per track (purchasable, subscriber-only); earnings views | upload metadata flows; `/earnings` | Partial (no self-serve payout setup visible — bank/payout onboarding **Unknown**) |
| Creator plan access | RevenueCat "MicBoxx Pro" paywall (mobile); studio `/billing` | `react-native-purchases` in creator app | Partial |
| Label/team readiness | **Data layer only** — Label entity exists (`micboxx_music_identity/LabelRepository`); workspace switching exists (`/v1/console/workspaces/switch`) | High | Prototype |

**User types supported:** independent artists (fully), non-creator users hitting creator surfaces (handled — `creator-access-required` page, CreatorAccessGate), verified creators (yes). **Labels and managers/teams: backend primitives only; no label-facing product.** Workspace switching (`ConsoleWorkspaceController`) is the seed of multi-workspace/team support (Medium confidence inference).

### B. Catalog & Release Infrastructure

- **Album/track creation, metadata, artwork:** Complete. `DashboardTrackController`/`DashboardAlbumController` with artwork and source-audio replacement endpoints (`POST /v1/dashboard/tracks/{track}/artwork|source-audio`). (High)
- **Release states:** `draft → scheduled → published → removed` via `release_state` fields and ECA scheduled publishing; processing pipeline `pending → processing → ready|failed` with retry and queue worker (`micboxx_music_track_processing`). (High)
- **DSP-style metadata readiness:** Yes — this is unusually advanced. `micboxx_music_readiness` builds release-readiness profiles; `docs/architecture/micboxx-dsp-readiness-slice-*.md` (11 slices) cover asset validation, rights/contributors, usage reporting. ISRC/UPC appear in DSP ingest package metadata (Medium — referenced in ingest models, not verified field-by-field).
- **Catalog ingestion readiness:** Yes — `micboxx_dsp_ingest` staging system (see §4H).
- **Rights attestation hooks:** Backend scaffolding only (see §4G).

**Verdict:** MicBoxx is **beyond an upload platform** and closest to an **artist release management system with DSP-grade catalog plumbing** — i.e., the foundation of a **catalog activation platform**. It is not a DSP-like consumer catalog system in scale terms (no licensed major-label catalog), but the metadata/ingest discipline is DSP-shaped.

### C. Playback & Player System

- **Web:** `MicboxxPlayerProvider` + `GlobalPlayerBar` with **completed deferred-loading extraction** — heavy vendor chunks removed from public route manifests, player initializes on idle/interaction (`PLAYER_PROVIDER_EXTRACTION_REPORT.md`, High). Queue persisted in session storage (`mbx-player-state`). Media Session API integration; 12s heartbeat; events `play_started`, `play_qualified`, `play_completed` — **qualified-play logic exists** (High).
- **Mobile:** react-native-track-player with background audio (`UIBackgroundModes: ["audio"]`), queue/session persistence (`queueStorage.ts`, `playbackSessionStorage.ts`), waveform UI, playback source resolver mapping entitlements → full/premium/demo audio (High).
- **Anonymous playback:** Supported on web public routes with anonymous listener ID in analytics (`mbx-analytics-sid` + persistent anonymous ID, High).
- **Entitlement gating:** subscriber-only/purchasable/demo modes enforced in source resolution on both platforms (High).
- **Known issues:** `/discover` LCP 16.3s regression (root cause open); auth-provider deferral unvalidated — public-route contamination risk remains until manifest re-validation (`PERFORMANCE_PHASE_STATUS.md`, High).

**Status: Complete** (web perf work outstanding).

### D. Release Rooms & Social Listening

All verified against `micboxx_rooms.routing.yml` (47 routes, High):

| Feature | Server | Web | Consumer mobile | Creator mobile |
|---|---|---|---|---|
| Room entry/discovery | `/v1/rooms/enter`, `/v1/public/rooms(+summary)`, per-release/per-artist room lookups | ✓ | ✓ | ✓ (dashboard) |
| Shared playback clock | `/v1/rooms/{id}/clock` | ✓ | ✓ | ✓ |
| Presence | Heartbeat + `presence_summary` Firestore projection | ✓ | ✓ (presence bar) | ✓ |
| Chat (+pin/hide/delete/report) | 6 chat routes | ✓ | ✓ | ✓ |
| Reactions | `/reactions` | ✓ | ✓ | ✓ |
| Q&A | 11 question routes (submit/activate/answer/archive/flag/show/hide/vote) | ✓ | ✓ | ✓ |
| Polls | create/vote/close | ✓ | ✓ | ✓ |
| Moments / stage takeover | `/moments`, `/moments/active`; hardening closed (`ROOM_MOMENT_RUNTIME_HARDENING_CLOSURE.md`) | ✓ | ✓ | ✓ |
| Artist drop-in (live video) | enter/heartbeat/leave/pin/unpin + LiveKit token mint (web API) | ✓ | ✓ | ✓ (publisher) |
| Time Machine | `/time-machine` | ✓ | ✓ | — |
| Support prompts (tips) | `/support/activate|send|status` | ✓ | ✓ | ✓ (toggle) |
| Moderation | mute/block/users routes | ✓ | partial | ✓ |
| Replay/archive | Time Machine is the replay hook; full archive product **Missing** | — | — | — |

**Verdict:** Release Rooms behave most like a **release launch event fused with a direct monetization surface** — synchronized listening + artist presence + support prompts. The "listening party" framing undersells it: the clock, claim/artist-keys, moments, and Time Machine systems are launch-event infrastructure. (Interpretation; evidence High.)

### E. Room Interaction Systems

Covered feature-by-feature in §4D. Persistence model (High): Drupal is the write authority for room state via `/v1` routes; **Firestore holds the real-time read projections** (`rooms/{roomId}/chat|polls|questions|reactions|moments|presence_summary|moderation` per `firestore.indexes` and `micboxx-web/apps/web/src/lib/firebase/rooms-*.ts`); web also writes chat to Firestore with async Drupal audit logging (`ROOM_CHAT_READ_MODEL_IMPLEMENTATION_PLAN.md` + Phase C cutover runbook describe the migration). Tests: rooms runtime QA runbook + Playwright `test:rooms-runtime-qa` (web); room PHPUnit suite (server); none (mobile). **Gap:** chat durability split — Firestore UI truth vs lagging Drupal audit log; mobile lacks room moderation parity in places.

### F. Monetization Infrastructure

What exists today (all High unless noted):

1. **One-off purchases:** Stripe checkout sessions for tracks and albums (`/api/dashboard/commerce/tracks|albums/[id]/checkout-session` → `micboxx_commerce_music` webhook handlers → entitlements). Verified by server scripts (`verify-micboxx-*-checkout*.php`).
2. **Listener subscription:** Stripe subscription plans, cancel-at-period-end, orders history; "Go Pro" baseline live; **lifecycle completion open** (MCBM-90–97).
3. **Creator subscription:** RevenueCat "MicBoxx Pro" (monthly/yearly/VIP) in creator mobile app. Server-side RevenueCat webhook reconciliation **not found in composer/code — Unknown**; risk of entitlement drift between RevenueCat and Drupal.
4. **Fan support in rooms:** activate/send/status routes + UI on web and consumer mobile; revenue surfaced in creator app (`features/revenue/`).
5. **Ads:** preroll plan/eligibility/event APIs, web playback integration, "earnings foundation" live per readiness snapshot.
6. **Payout spine:** `micboxx_payouts` — events → balances → settlement runs → batches → statements → reconciliation + adjustments, with admin report routes and `fever_intervention_ledger` for manual ops. **Implemented, not broadly launched.**
7. **Entitlement checks:** `fever_core_entitlements` resolver, `/v1/dashboard/entitlements`, consumed by all clients for playback gating.

**Currently structured to monetize:** track/album sales, listener subscriptions, creator subscriptions (tools), fan support, ads. **Implied by architecture but missing:** paid rooms (room entry has capabilities/access fields — Low confidence hook), memberships/fan clubs, drops/exclusive access, partner catalog revenue share (payout event model could carry it — inference, Medium).

### G. Rights, Content Eligibility & Platform Trust

- **What exists (High):** `micboxx_rights` is a tested data layer: `RightsHolderRepository`, `ContributorRepository`, `TerritoryRepository`, `OwnershipSnapshotRepository`, `TakedownUpdateRequestRepository`, plus `OwnershipReadinessChecker`, `TerritoryReadinessChecker`, `TakedownUpdateReadinessChecker` — all with kernel tests (`micboxx_rights/tests/src/Kernel/`). DSP readiness docs include a rights/contributors slice. `micboxx_music_readiness` gates release readiness profiles.
- **What is missing (High):** uploader attestation UI/flow in any client; ownership confirmation checkbox/contract at upload; content eligibility flags on public playback; a takedown/dispute intake surface; restricted-content handling; any distinction in the catalog between **artist-uploaded** and **partner-licensed** content at the playback/monetization layer (the ingest system distinguishes provenance at ingest time, but no provenance-aware playback policy was found — Medium confidence on absence).
- **Could the current system support the strategic model?** Yes (Medium): the readiness-checker pattern is exactly the right shape for "rights-aware, not rights-administration" — attestation becomes another readiness check before publish; takedown requests already have a repository and update-readiness checker; territory rules exist for partner catalog restrictions. The team's own roadmap places this in "Rights, claims, and release-readiness expansion" (MCBM-118–124, Planned).

### H. Licensed Catalog / Partner Integration Readiness

This is the platform's hidden strategic asset (all High, verified in `micboxx_dsp_ingest.routing.yml` and src/):

- **Partner ingest API:** `POST /v1/partner-ingest/releases` (API-key auth via `PartnerIngestAuthService`).
- **Client registry:** `GET|POST /v1/clients`, `GET|POST /v1/clients/{client_key}/keys`, `POST /v1/keys/{key_id}/rotate|revoke` — a DSP-style API-key registry with rotation and revocation (`MicBoxxApiKeyService`, `MicBoxxClientService`, `ApiRegistryAuthService`).
- **Ingest pipeline:** receive → validate → catalog-match-classify (new/update/duplicate) → operator review → draft catalog commit → activate, with 8 repositories (batch/package/item/asset/validation/attempt/acknowledgement/match-result) and an operator console (`/console/ingest/batches`).
- **Partner model:** `micboxx_dsp_partner` Partner entity with territories/formats/rules; `micboxx_music_identity` Artist/Label repos for ingest matching.
- **Outbound:** `micboxx_dsp` submission API with retry; e2e proven by root scripts (`create-dsp-e2e-test.php` output references a tenant-keyed external DSP console — Low confidence on the external service's nature).
- **Reporting/export readiness:** usage-reporting covered in DSP readiness slice docs (Medium — docs, not code-verified); `export-fevercore-data.php` shows export tooling patterns.
- **Named partners (MassiveMusic, Tuned Global, Feed.fm):** **No code evidence of any specific partner integration.** What exists is *architectural readiness* — a generic, authenticated, validated ingest front door. Integrating a specific provider would be adapter work on top of an existing pipeline, not a greenfield build. (High on absence; Medium on effort inference.)
- **Territory/availability rules:** `TerritoryRepository` + partner territory fields exist; enforcement at playback **not found** (Medium on absence).

### I. Search, Discovery & Recommendation Surfaces

- **Search:** Solr-backed (`search_api_solr`), five indexes (tracks/albums/artists/playlists/genres in `search_api.index.*.yml`), public search + autocomplete APIs, search screens on web and consumer mobile. **Mostly complete** (High).
- **Discovery:** `/discover`, `/top-music`, `/new-music`, genre browsing, featured/popular/trending endpoints. **Content-query + search-backend driven.** (High)
- **Personalization:** `/api/recommendations/for-you`, `/api/discover/personalized`, `recommendationEvents` Firestore telemetry, `MicBoxx Recommendation Engine Architecture.md` design doc. Per the readiness snapshot, mobile expects a **web recommendation upstream** until a stable server contract exists. **Partial.** (High)
- **Room discovery:** `/v1/public/rooms` + summaries; `/rooms` pages. (High)
- **Social/editorial discovery:** social graph exists but no feed-driven discovery product found; editorial = featured flags via admin routes (`/api/admin/tracks/[id]/feature`). **Partial.** (Medium)

**Verdict:** discovery today is **content-query driven with a search backend and early personalization** — not yet social-graph or editorially driven.

### J. Social Graph & Notifications

- **Graph (High):** Firestore collection groups `follows`, `trackLikes`, `trackFavorites`, `trackComments`, `messages`, `userBlocks`, `socialReports`, with denormalized `social/meta` counters on users and tracks; security rules validated by scripts (`validate-firestore-rules.mjs`, `validate-track-comments-rules.mjs`).
- **Identity bridge (High):** Drupal UUID = Firebase UID; mobile and web obtain Firebase custom tokens via `POST /api/social/auth/token` (web app endpoint) — a **single point of failure** for all mobile social features (`firebaseSocialBridge.ts`).
- **In-app notifications (High):** Firestore `notifications` (userUid, isRead, type, payload, indexed), consumed on web and both mobile apps; room notification compat routes on server.
- **Push (High):** `micboxx_push` with kreait FCM client; `POST|DELETE /v1/devices/token`; consumer app fully wired (permission, token refresh, foreground/background handlers, deep-link parsing in `features/push/`). **Creator app: no push dependency at all.**
- **Push vs in-app state:** separate by design — Firestore holds read/unread; FCM is delivery-only. (High)
- **Deep links (High):** `micboxx://` and `micboxx-creators://` schemes; notification deep-link routing in consumer app.

### K. Authentication, Roles & Access Control

- **Backend (High):** Simple OAuth (authorization code + PKCE for mobile; bearer tokens in signed cookies for web), social login (Google/Apple via social_auth), registration with email verification (`/v1/auth/register|verify|resend-code`), password reset and account cancel/activate flows, OAuth logout choreography (`/v1/auth/logout-start|complete`), mobile callback route.
- **Roles/permissions (High):** roles + permission flags surfaced in session (`MicboxxSessionUser.permissions`, e.g. `canUploadTracks`); creator gating on all four creator surfaces; admin permission gates on console/report routes; entitlement-based access for playback/commerce.
- **Duplicated auth logic (High):** four separate client implementations (web AuthShell/MicboxxAuthProvider, studio, consumer slice, creator slice) plus the Firebase custom-token layer. Mobile slices are intentionally not yet extracted (`MONOREPO_CONTINUATION_PLAN.md` defers them).
- **Security assumptions to flag:** server-side permission checks are the real boundary on room moderation endpoints (client guards thin); OAuth keys live in `micboxx-server/keys/` (gitignored, never committed — verified); auth deferral on web unvalidated (perf, not security).
- **Performance:** auth provider bundle impact documented in `AUTH_PROVIDER_AUDIT.md` (63 routes: 42 public/21 authenticated; 21 chunks).

### L. Media, Upload, Ingest & Asset Handling

- **Audio:** upload via presigned policy (`GET /v1/dashboard/upload-options` → `DashboardUpload` contracts in `@micboxx/api-client`), source-audio replacement, FFmpeg derivative pipeline (processed/demo/waveform), retry + attempts tracking. **Complete.** (High)
- **Artwork/images:** track/album/playlist artwork endpoints, avatar/cover uploads. **Complete.** (High)
- **Video:** `micboxx_music_video` + `micboxx_music_video_ingest` backend modules exist; live video via LiveKit in rooms; **no creator video-upload product surface found.** **Partial.** (Medium)
- **Storage/CDN:** S3 (s3fs) with public/private takeover flags, Minio locally; CDN-frontable URLs; shared `normalizeMediaUrl`/cache-key helpers in `@micboxx/media`. (High)
- **Missing lifecycle states:** no visible media quarantine/virus-scan/loudness-normalization steps (Low confidence on absence — could live in infra outside repos).

### M. Moderation, Safety & Trust

- **Room-level (High):** mute/block/users, chat hide/delete/pin, message reporting, question flag/hide — server routes + web/mobile UI; `fever_audit` logs sensitive ops.
- **Social-level (High):** user blocks, `socialReports` collection, web `/api/social/moderation/reports/[reportId]` handler; comment status states.
- **Platform-level (Partial, Medium):** web admin API can block/unblock users, unpublish tracks/albums, reject verification; studio has a `/moderation` page (creator-scoped); but **no unified admin review queue/workflow product was found**, and no automated content scanning. "Trust spine and intervention foundations" is In Progress per the readiness snapshot (MCBM-113–117).
- **Takedown:** repository + readiness checker exist (`micboxx_rights`); **no intake surface.** (High)

### N. Analytics, Observability & Performance

- **Web (High):** custom analytics module (`micboxx-analytics.ts` — play/media-session/platform events, anonymous + session IDs), recommendation event telemetry, music-ad diagnostics, Sentry (`@sentry/nextjs`), Playwright analytics validation (`test:social-analytics`), Lighthouse baselines + RSC manifest parser (`scripts/parse_rsc_manifests.js`).
- **Server (High):** play-event bridge (`scripts/e2e-play-event-bridge.sh`), `micboxx_music_analytics`, best-effort event mirroring to Fever Core analytics (`$FEVERCORE_API_URL/v1/events`), watchdog + `WATCHDOG_ERROR_ANALYSIS.md`, `fever_audit`.
- **Mobile (High):** Sentry RN configured; **product analytics is a console adapter with TODOs** (`apps/*/src/features/analytics/adapter.ts`) — playback/room/social events defined in `@micboxx/analytics` (`PLAYER_ANALYTICS_EVENTS`) but go nowhere.
- **Product-truth vs marketing:** play-qualified events and recommendation events are product-truth instrumentation; GA/GTM-style platform events on web are lighter-weight. Mobile contributes nothing today — **the platform is blind to mobile behavior.**
- **Performance:** player extraction complete; auth/GA deferral unvalidated; `/discover` LCP 16.3s open; heavy provider nesting documented.

### O. Mobile App Store / Release Readiness

- **Consumer (High):** bundle IDs aligned (`com.micboxx.mobile`), EAS projects + production profiles, icons/splash present, iOS background-audio mode, Android `POST_NOTIFICATIONS`, `ITSAppUsesNonExemptEncryption: false`, Firebase plist/json committed, Sentry wired, deep-link scheme registered. Build wrapper `scripts/eas-production-build.mjs` typechecks before building. **Missing:** App Store metadata/screenshots in repo, privacy-manifest/data-safety docs, age-rating analysis. Signup-flow repair In Progress (MCBM-83).
- **Creator (High):** same scaffolding + RevenueCat key env, camera/mic/photo permission strings for video drop-ins. **Missing:** push notifications (release blocker for engagement loops), real analytics.
- **Store-compliance question (inference, Medium):** consumer app surfaces purchasable/subscriber-gated content but has no IAP; Apple's rules around digital-content purchase routing need an explicit decision (reader-app vs IAP) before App Store submission.

### P. Shared Packages, Contracts & Monorepo Health

- Both monorepos are healthy *internally*: clean package boundaries, no circular deps observed, typecheck/lint/build green (mobile migration report verified ~2.3k LOC duplication eliminated; web uses turbo with CI).
- **Cross-repo, the picture is weaker (High):** two parallel contract systems (`micboxx-apps/packages/contracts` vs `micboxx-web/packages/types` + `api-client`) hand-mirror the same Drupal API with different names (e.g. `PublicTrackSummary` vs `music.ts` Track). No OpenAPI/codegen source of truth. Drift risk grows with every endpoint.
- Mobile defers extraction of auth/player/social slices deliberately (`MONOREPO_CONTINUATION_PLAN.md` Phase 6 "Stabilize") — reasonable, but the duplication is already real across consumer/creator apps.
- **Verdict:** each monorepo supports scaling its own surfaces well; **the platform lacks a cross-client contract authority**, which is the main monorepo-health risk as surfaces multiply.

---

## 5. Data Model & State Map

| Entity | Defined / stored | Used by | Key states & notes |
|---|---|---|---|
| **User** | Drupal user + session contract (`@micboxx/contracts/micboxx.ts` MicboxxSessionUser; `@micboxx/types/auth.ts`) | All apps | roles, permission flags, verified; account states active/cancelled via `/v1/account/*` flows |
| **Artist / Label** | `micboxx_music_identity` (ArtistRepository, LabelRepository); public projection `PublicArtistSummary` | Catalog, DSP matching, public pages | Label has **no product surface** — data layer only |
| **Creator** | Role/permission overlay on User + workspace records (`/v1/console/workspaces`) | Studio, creator mobile | Gated by `canUploadTracks` etc. |
| **Track** | `micboxx_music` entity; contracts in both monorepos | All apps, Solr, DSP | `release_state`: draft→scheduled→published→removed; `processing_state`: pending→processing→ready/failed (+attempts, error); access: free/demo/purchasable/subscriber-only |
| **Album / Playlist / PlaylistMembership** | `micboxx_music`; dashboard + public controllers | All apps | Same release states; playlist publish/unpublish doubles as scheduling surface on web |
| **Release** | Composite of album/track release_state + `micboxx_music_readiness` profile | Studio, DSP submission | Readiness profile gates DSP distribution |
| **Room** | `micboxx_rooms` entities; Firestore projections (`rooms/{id}/*`) | Web + both mobile | Lifecycle: created→active→(paused)→archived; capabilities flags per room; claim + artist-keys grant flow |
| **Room moment** | `micboxx_rooms` + Firestore `moments` | Web + mobile | Types incl. stage takeover, qa_opened, artist_video_drop_in; time-based expiry; single-active invariant (`/moments/active`) |
| **Chat message** | Firestore (UI truth) + Drupal audit log | Web + mobile | states: visible/hidden/deleted/pinned; report flow |
| **Reaction** | Firestore + `/v1/rooms/{id}/reactions` | Web + mobile | Emoji types incl. confetti/fire/star |
| **Poll / Q&A question** | `micboxx_rooms` + Firestore | Web + mobile | Poll: active→closed; Question: submitted→activated→answered/archived, flag/unflag, show/hide |
| **Notification** | Firestore `notifications` collection group | Web + both mobile | isRead toggle; types: like/follow/comment/DM/room; deep-link payloads |
| **Order / Subscription** | `fever_core_commerce` + Stripe | Web checkout, account pages | pending→paid/failed; subscription active→cancel-at-period-end; **lifecycle completion open (MCBM-90–97)** |
| **Entitlement** | `fever_core_entitlements` | All apps (playback gating) | purchased/subscribed/free; resolver-based |
| **Media asset** | Drupal media + S3; `DspIngestAsset` for partner assets | Catalog, ingest | source vs processed vs demo vs waveform derivatives |
| **Moderation record** | Room moderation entities; Firestore `socialReports`, `userBlocks`; `fever_audit` log | Web + mobile + admin | Room-scoped mute/block; report status states; **no unified platform queue** |
| **Device token** | `micboxx_push` records via `/v1/devices/token` | Consumer mobile | register/unregister; FCM only (APNs via FCM) |
| **Playback event** | Web analytics module + server play-event bridge; `recommendationEvents` | Analytics, ads, payout events | play_started/qualified/completed; **mobile emits nothing** |
| **Payout entities** | `micboxx_payouts`: PayoutEvent, Balance, SettlementRun, Batch, Statement, Adjustment, Reconciliation | Admin reports, `/v1/creator/earnings` | collect→aggregate→run(draft)→reconcile→finalize→pay |
| **DSP ingest entities** | `micboxx_dsp_ingest`: Batch, Package, Item, Asset, Validation, Attempt, Acknowledgement, MatchResult | Operator console, partner API | receive→validate→match(new/update/duplicate)→operator review→draft commit→activate |
| **Partner / Client / API key** | `micboxx_dsp_partner` (Partner), `micboxx_dsp_ingest` (client registry, keys) | Partner ingest auth | key states: active→rotated/revoked |
| **Rights records** | `micboxx_rights`: RightsHolder, Contributor, Territory, OwnershipSnapshot, TakedownUpdateRequest | Readiness checkers only | **No client-facing states yet** |
| **Verification** | `micboxx_verification` | Profile request + admin review | submitted→approved/rejected |

**Missing/inconsistent states worth noting:** no content-eligibility state on Track (e.g. attested/flagged/restricted); no room "monetization mode" state (paid entry); no partner-vs-artist provenance state surfaced past ingest; subscription lifecycle edge states (grace, dunning) open per Jira range.

---

## 6. API & Integration Map

### 6.1 Canonical Drupal API (`/v1/*`) — micboxx-server

| Area | Representative routes | Auth | Consumers | Tests |
|---|---|---|---|---|
| Auth & account | `/v1/auth/register|verify|resend-code|check-username|check-email|logout-start|logout-complete|mobile-callback`; `/v1/account/password-reset|cancel|activate/{validate,complete}`; `/oauth/authorize`, `/oauth/token` | public/PKCE | all clients | verify scripts + PHPUnit |
| User/dashboard | `/v1/dashboard/user/profile|avatar|cover|account|verification-request`; `/v1/console/workspaces(+switch)` | OAuth2 | studio, mobile | PHPUnit |
| Catalog (creator) | `/v1/dashboard/upload-options`; `/v1/dashboard/tracks` CRUD + `artwork|source-audio|publish`; albums + playlists equivalents | OAuth2 | studio, creator mobile | seed + PHPUnit |
| Catalog (public) | `/v1/public/tracks|albums|playlists|artists|releases|genres`; `/v1/public/search`; discover/featured/popular/trending; recommendations | open | web, consumer mobile | e2e fixtures |
| Rooms | 47 routes (see §4D) | mixed open/OAuth2 | web + both mobile | PHPUnit suite + web runtime QA |
| Commerce | checkout (track/album/subscription), webhooks (Stripe), entitlements | OAuth2 + webhook secret | web; mobile reads entitlements | verify-*-checkout(+webhook) scripts |
| Payouts | `/v1/creator/earnings`; `/admin/reports/micboxx-payouts/*` | OAuth2 / admin perm | studio, creator mobile, ops | PHPUnit |
| Push | `POST|DELETE /v1/devices/token` | OAuth2 | consumer mobile | — |
| DSP outbound | `GET|POST /v1/dsp/submissions(+/{id}, /retry)` | OAuth2 | creator tooling | root e2e scripts |
| Partner ingest | `POST /v1/partner-ingest/releases` | **API key** | external partners | ingest e2e scripts |
| Client registry | `/v1/clients`, `/v1/clients/{key}/keys`, `/v1/keys/{id}/rotate|revoke` | API key/admin | ops, partners | — |
| Analytics | play-event ingestion; mirroring to `$FEVERCORE_API_URL/v1/events` | internal | web/server | e2e-play-event-bridge.sh |

### 6.2 Web BFF layer (Next.js API routes) — micboxx-web/apps/web

Acts as a backend-for-frontend over Drupal + Firestore: `/api/auth/*` (login/register/verify/session), `/api/account/*`, `/api/dashboard/commerce/*` (Stripe sessions, entitlements, orders), `/api/dashboard/playlists/*`, `/api/public/rooms/*` (full room interaction surface incl. live-video token mint and invitations), `/api/public/tracks/[id]/play|event`, `/api/search/*`, `/api/discover/personalized`, `/api/recommendations/*`, `/api/social/auth/token` (**Firebase custom-token mint — consumed by both mobile apps**), `/api/social/moderation/*`, `/api/admin/*` (user/track/album admin actions), `/api/music-ads/*`, `/api/public/events`. (High — route tree read directly.)

**Architectural note (High):** the room interaction APIs exist in *both* layers (web `/api/public/rooms/*` and Drupal `/v1/rooms/*`) because web fronts Firestore projections while Drupal is the write authority — clients differ in which layer they call. This dual surface is functional but doubles the contract maintenance burden.

### 6.3 External services

| Service | Integration point | Confidence |
|---|---|---|
| Stripe | `stripe/stripe-php ^20`, webhook handlers in `micboxx_commerce_music`; web checkout sessions | High |
| Firebase Auth + Firestore | custom tokens (Drupal UUID = UID); social graph, room projections, notifications | High |
| FCM | kreait/firebase-php server-side; @react-native-firebase/messaging (consumer) | High |
| RevenueCat | creator mobile SDK; server-side sync **Unknown** | High/Unknown |
| LiveKit | room live video — RN SDKs + web token mint | High |
| Solr/SearchStax | search_api_solr, 5 indexes | High |
| S3/Minio | s3fs, presigned upload policies | High |
| Sentry | web (nextjs SDK) + mobile (RN SDK); server **not found** | High |
| Vercel | both web apps | High |
| Symfony Mailer / Simplenews | verification emails, digests | High |
| Fever Core analytics mirror | best-effort event POST | High |

---

## 7. User Journey Map

| Journey | Surfaces | Backend | Missing links / friction | Opportunity |
|---|---|---|---|---|
| **Listener discovers music** | Web discover/search/genres; consumer mobile tabs | Solr + public APIs + early personalization | `/discover` LCP 16.3s; personalization has no stable server contract; no social-feed discovery | Social/room-driven discovery is unbuilt but all inputs exist |
| **Listener enters a Release Room** | Web + consumer mobile room screens | `/v1/rooms/enter`, clock, Firestore projections | Anonymous room participation limits unclear; room discovery surface is thin | Rooms as front-door acquisition (shareable live links) |
| **Listener chats / reacts / supports** | Web + consumer mobile | chat/reaction/support routes; support status | Support payment rail in-room → Stripe linkage end-to-end **partially verified**; no support goal/leaderboard UI | "Support moments" tied to room moments — prompts exist, productization shallow |
| **Listener follows artist** | Web + mobile profiles | Firestore follows + counters | Follow → notification → re-engagement loop weak without mobile push parity + telemetry | Fan-relationship CRM for artists |
| **Artist signs up** | Web signup `/signup/artist`; creator mobile onboarding | registration + verification + creator gate | Mobile signup repair In Progress (MCBM-83); creator approval path semi-manual | Smooth "first release in one session" bootstrap already scaffolded with fixtures |
| **Artist creates/manages a release** | Studio uploads/releases; creator mobile catalog | upload-options → processing pipeline → publish/schedule | No rights attestation step; no ISRC/UPC capture surfaced to artist | Readiness-profile UI ("release health check") — backend exists |
| **Artist launches a Release Room** | Studio/creator mobile rooms; claim + artist keys | room creation/claim, clock, drop-in | Room creation UX vs auto-room-per-release policy unclear from code | Productize "release night" as a guided flow |
| **Artist monetizes fan engagement** | Support toggle, pricing flags, earnings views | support routes, commerce, payout events | RevenueCat↔server reconciliation unknown; payouts implemented but not launched; no paid-room/membership products | The largest white space — rails exist, products don't |
| **Creator views plan/access screen** | Creator mobile paywall; studio billing | RevenueCat + Stripe | Two unreconciled subscription systems (mobile RC vs web Stripe) | Unify entitlement source of truth |
| **User gets notification → deep-links** | Consumer mobile (FCM + `micboxx://`), web in-app | micboxx_push + Firestore | Creator app: no push at all; notification taxonomy not unified | Re-engagement engine once creator push lands |
| **Moderator handles bad behavior** | Room moderation UI; studio moderation; admin API | mute/block/hide routes, reports, audit log | No platform-wide review queue; no escalation/appeal flow | Trust-spine work already on roadmap (MCBM-113–117) |
| **Admin/support handles disputes** | Drupal admin + web admin API | takedown repos (no intake), intervention ledger | **No dispute intake surface end-to-end** | Lightweight takedown intake = partner-trust unlock |
| **Partner catalog becomes available** | Operator ingest console | partner-ingest API → pipeline → activate | No live partner; territory/provenance enforcement at playback missing; reporting/exports doc-only | The catalog-activation wedge (§8) |

---

## 8. Strategic Discovery Section

### What the codebase says MicBoxx is becoming

Tested against the candidate identities:

| Candidate identity | Evidence for | Evidence against |
|---|---|---|
| Social music monetization platform | Rooms + support + social graph + payouts all real | Monetization *products* on top of rails are thin (no memberships, paid rooms, drops) |
| Artist catalog activation platform | DSP-grade ingest both directions, readiness profiles, rights data layer, client registry | No live partner; rights enforcement unbuilt |
| Release launch infrastructure | Rooms = launch events (clock, moments, drop-ins, Time Machine, claim/artist-keys); ECA scheduled publishing | No guided "release night" product flow yet |
| Social radio platform | `micboxx_radio` module + `/radio` page; shared-clock playback tech | Radio explicitly deferred post-launch in scope docs |
| Artist-owned fan economy | Support, verification, fan identity (Firestore), creator tools | Fan identity is thin (no memberships/badges/tiers) |
| DSP + direct-fan layer | Catalog pipeline, entitlements, Solr, apps on 4 surfaces | No licensed catalog; scale economics of a DSP not present |
| SoundCloud-with-better-monetization | Upload culture + discovery + monetization rails | Discovery/social culture surface is much smaller than the monetization plumbing |
| Creator OS for artists/labels | Studio ADR literally says "creator operating system"; workspaces; payouts | Label/team product missing (data layer only) |

### Strategic interpretation (Medium confidence — interpretation over High-confidence evidence)

The engineering investment is **lopsided in a revealing way**: the deepest, most carefully engineered systems (DSP ingest pipeline, payout settlement/reconciliation, room runtime, readiness profiles) are exactly the systems a casual streaming clone would never build. The codebase is converging on:

> **"Release launch + catalog activation infrastructure, monetized through fan-powered experiences."**

Concretely: MicBoxx ingests catalogs (from artists today, partners tomorrow), makes them *release-ready* (readiness profiles, rights-awareness), launches them as *events* (Release Rooms), monetizes the resulting fan energy (support, purchases, subscriptions, ads), and settles money back to rights-holders (payouts). That loop — **catalog in → activation event → fan money → settlement out** — is present end-to-end in the architecture and absent as a marketed product.

### Most promising direction

**Release Rooms as the wedge, catalog activation as the moat.** Rooms are the unique, demo-able, emotionally legible product; the ingest/payout spine is what lets that product scale to labels and partner catalogs without re-architecture.

**Capabilities that support it (all High):** rooms runtime across 4 surfaces; support/commerce/payout rails; readiness + ingest pipelines; verification; social graph; push (consumer).

**Capabilities missing for it:** room monetization products (paid access, goals, memberships); rights attestation at upload; partner reporting/exports; creator push + mobile telemetry (you can't run launch events blind); a guided release-night flow; label/team workspaces.

### Risks to this direction

1. **Operational blindness** — no mobile telemetry means room-product iteration would run on web data only.
2. **Rights exposure scales with rooms** — public, social, monetized playback of uploaded music raises the stakes of having no attestation flow (severity grows with success).
3. **Two-monorepo contract drift** could slow exactly the cross-surface features (rooms) that matter most.
4. **Spread risk** — radio, rewards, articles, digests, promotions are all partially built; each is a tax on focus.

---

## 9. Gap Analysis

| # | Gap | Area | Severity | Evidence | Impact | Recommended action | Priority |
|---|---|---|---|---|---|---|---|
| 1 | Private keys stored inside repo working trees (Apple `.p8` at micboxx-apps root; OAuth keypair in micboxx-server/keys/) — **verified gitignored and never committed**; risk is accidental un-ignore, backup/sync exposure, or copy into a tracked path | Security | Medium (downgraded from Critical after git-history verification 2026-06-09) | `micboxx-apps/.gitignore:11` (`*.p8`), `micboxx-server/.gitignore:30` (`keys/`); `git log --all` empty for both paths | Latent leak risk only | Move both outside repo directories (e.g. `~/.config/micboxx/` or a secret manager); optionally add pre-commit secret scanning (gitleaks) | P2 |
| 3 | No rights attestation / content eligibility at upload | Rights/trust | **High** | `micboxx_rights` backend-only; no client flow; Planned MCBM-118–124 | Blocks rights-safe operation, partner deals, monetized rooms at scale | Add attestation step to upload + eligibility flag on Track via existing readiness-checker pattern | P0 for launch |
| 4 | Mobile product analytics stubbed | Analytics | **High** | `apps/*/src/features/analytics/adapter.ts` console TODOs | Blind launch; no funnel/room/playback data from apps | Wire Firebase Analytics or PostHog/Amplitude into existing `@micboxx/analytics` interface | P0 for launch |
| 5 | Creator app has no push | Mobile/engagement | **High** | no firebase-messaging dep in `apps/creator/package.json` | Creators miss support/follow/room events → retention loss | Port consumer `features/push/` (server side already done) | P1 |
| 6 | RevenueCat ↔ server entitlement reconciliation unverified | Monetization | **High** | RC SDK in app; no server webhook found | Entitlement drift, support burden, revenue leakage | Add RC webhook → `fever_core_entitlements` sync; document source of truth | P1 |
| 7 | Subscription lifecycle incomplete | Monetization | **High** | Snapshot: MCBM-90–97 Planned | Billing edge cases (dunning, grace, refunds) break trust | Execute existing Jira range before scale | P1 |
| 8 | No platform-wide moderation queue / takedown intake | Trust & safety | **High** | room-scoped tools only; takedown repos with no surface; MCBM-113–117 In Progress | Legal exposure; partner-trust blocker | Minimal admin review queue + takedown intake form feeding `TakedownUpdateRequestRepository` | P1 |
| 9 | Mobile IAP/store-policy decision unmade | Mobile launch | **High** (inference) | purchasable content visible in consumer app; no IAP | App Store rejection risk | Decide reader-mode vs IAP before submission; document | P1 |
| 10 | No tests/CI in mobile monorepo | Quality | Medium | no jest/workflows in `micboxx-apps` | Regression risk on 83k LOC | Add typecheck/lint CI + smoke tests for auth/playback/rooms | P2 |
| 11 | /discover LCP 16.3s | Web perf | Medium | `PERFORMANCE_PHASE_STATUS.md` | Discovery funnel conversion | Profile API waterfall; finish auth/GA deferral validation | P2 |
| 12 | Dual contract systems, no API schema authority | Architecture | Medium | `micboxx-apps/packages/contracts` vs `micboxx-web/packages/types` | Drift; slower cross-surface delivery | Introduce OpenAPI (or single shared package) generated from `/v1` | P2 |
| 13 | Firebase custom-token bridge SPOF on web app | Reliability | Medium | mobile social depends on `POST /api/social/auth/token` | Web outage kills mobile social/rooms realtime | Move token mint to Drupal or duplicate endpoint | P2 |
| 14 | Partner provenance/territory not enforced at playback | Catalog ingestion | Medium | TerritoryRepository unused at playback (absence, Medium conf.) | Blocks licensed-catalog go-live | Add provenance + territory checks to playback source resolution | P2 (P0 *if* partner deal signed) |
| 15 | Web→studio creator migration incomplete | Architecture | Medium | `WEB_TO_STUDIO_MIGRATION_REGISTER.md` | Duplicate creator UX, drift | Finish register; enforce ADR | P3 |
| 16 | Payouts implemented but unlaunched; payout onboarding (KYC/bank) not found | Monetization | Medium | `micboxx_payouts` + snapshot "Implemented" | Creators can earn but not get paid out self-serve | Define payout onboarding (Stripe Connect?) — **Unknown** territory | P2 |
| 17 | Chat audit-log lag (Firestore vs Drupal) | Data integrity | Low | read-model cutover docs | Moderation/audit gaps | Monitor parity (script exists: `room-chat-read-model-parity-report.php`) | P3 |
| 18 | AWS SES SMTP credentials committed in Drupal config sync | Security | **High** | `micboxx-server/config/sync/symfony_mailer.mailer_transport.smtp.yml` (gitleaks full-history baseline, Appendix A.4) | Mail-sending credential exposure; IAM-derived key in VCS | Rotate SES SMTP credentials in AWS; move user/pass to env override in `micboxx.settings.php`; optionally purge the single commit | P0, immediate |

---

## 10. Opportunity Map

| Opportunity | Why it matters | Existing foundation (code) | Required capabilities | Business impact | Next step |
|---|---|---|---|---|---|
| **Release Night product** (guided launch flow: schedule → room → drop-in → support goal → recap) | Turns the strongest tech into a sellable ritual; differentiation vs Spotify/SoundCloud | 47 room routes, moments, clock, drop-ins, Time Machine, ECA scheduling | Guided UX, support goals UI, recap/archive page | Creator acquisition + first revenue moment per release | Product spec on top of existing APIs (no backend rework) |
| **Direct fan monetization layer** (tips outside rooms, memberships, drops) | Rails exist; products don't; this is the Spotify-can't-follow zone | support routes, Stripe commerce, entitlements, payouts | Membership entity + gated content; tip surface on profiles/tracks | Recurring artist revenue → retention | Design entitlement-backed membership tier model |
| **Room replay / Time Machine memories** | Converts live events into evergreen content + re-engagement | `/time-machine` route, moments data | Replay player UI, shareable recap | Long-tail engagement per release | UI over existing data |
| **Creator subscriptions unification** | Two unreconciled billing systems is a trust/revenue bug *and* an opportunity to define one plan system | RevenueCat (mobile) + Stripe plans (web) + entitlements resolver | RC webhook sync; plan catalog in Drupal | Clean MRR reporting; cross-platform plans | Reconciliation design doc |
| **Licensed catalog partnerships / catalog ingestion** | The ingest pipeline + client registry is built; partners (e.g. Tuned Global, Feed.fm-style providers) need exactly this front door | `micboxx_dsp_ingest` full pipeline, partner entity, API keys, operator console | Provenance-aware playback, territory enforcement, usage reporting/exports | New supply without artist-by-artist acquisition; radio-style products | One pilot-partner adapter + reporting export |
| **Social radio** | Shared-clock playback already works; radio module exists | room clock tech, `micboxx_radio` | Programming/scheduling UX; licensed catalog | Lean-back listening + ad inventory | Keep deferred until catalog partnerships land (matches team's own scope call) |
| **Rights-light content eligibility** | Cheap to build on readiness-checkers; unblocks everything monetized | `micboxx_rights` repos + checkers, kernel tests | Attestation UI, eligibility flag, takedown intake | Partner trust, legal safety, store compliance | Single design doc + one upload-flow step |
| **Fan identity & memories** | Firestore identity + room participation history = fan résumé | social graph, notifications, room activity log | Fan profile surface, badges/memories | Superfan retention; future membership upsell | Lightweight "your moments" feed |
| **Artist drop-in as a booked product** | Drop-in tech is rare and built on all surfaces | LiveKit integration, invitations API, artist keys | Scheduling/announcement flow | Premium event pricing | Productize invitations API |
| **Mobile-first launch strategy** | Consumer app is near-ready and rooms are mobile-native experiences | EAS configured, FCM, deep links | Gaps #1, #4, #5, #9 closed | App-store distribution + push re-engagement | Close P0/P1 mobile gaps, submit |

---

## 11. Recommended Roadmap

### Horizon 1: Launch Integrity (now → public release)

1. **Secrets hygiene** — relocate the Apple `.p8` and server OAuth keys outside the repo working trees; add pre-commit secret scanning (Gap 1 — verified never committed, so no rotation/history purge required).
2. **Mobile telemetry** — real analytics adapter behind the existing `@micboxx/analytics` interface; ship before launch, not after (Gap 4).
3. **Rights-light attestation** — one upload-flow step + Track eligibility flag using `micboxx_rights` checkers; takedown intake form (Gaps 3, 8 minimum slice).
4. **Store-policy decision + consumer app submission**; creator push port (Gaps 5, 9).
5. **Finish in-flight web perf work** — validate auth/GA deferral, root-cause /discover LCP (Gap 11).
6. **Minimal CI for micboxx-apps** (Gap 10).
7. Documented: subscription source-of-truth decision (RC vs Stripe) even if full sync lands in H2 (Gap 6).

### Horizon 2: Monetization Foundation (differentiation vs Spotify/SoundCloud)

1. **Release Night product** — guided launch flow + support goals + recap (Opportunity 1).
2. **Subscription lifecycle completion** (MCBM-90–97) and RevenueCat↔entitlements sync.
3. **Payout activation** — payout onboarding (likely Stripe Connect), turn the implemented settlement spine into creator-visible money movement (Gap 16).
4. **Memberships/drops v1** on the entitlement resolver.
5. **Room replay/memories** to compound each launch event.
6. **Platform moderation queue** (completes MCBM-113–117 trust spine) — monetized social spaces require it.

### Horizon 3: Platform Expansion (partners, labels, scale)

1. **Pilot partner catalog ingest** — one adapter on `micboxx_dsp_ingest`, provenance-aware playback, territory enforcement, usage reporting export (Gap 14, Opportunity 5).
2. **Label/team workspaces** — productize `micboxx_music_identity` Label + workspace switching into multi-artist management.
3. **Social radio** on licensed catalog (only after #1).
4. **Contract authority** — OpenAPI/codegen for `/v1`, collapse dual type systems (Gap 12); move the Firebase token mint off the web app (Gap 13).
5. **Promotions/campaigns completion** (MCBM-49) as the artist growth-spend product.

---

## 12. Final Assessment

**What MicBoxx is today (High confidence):** a four-client music platform with production-grade catalog, auth, commerce, and social infrastructure; a genuinely differentiated and near-complete Release Rooms system; and an unusually deep, mostly invisible distribution/finance spine (DSP ingest both directions, payout settlement) that is implemented but not launched.

**What it is closest to becoming:** **release-launch and catalog-activation infrastructure monetized through fan-powered experiences** — "the place where music gets *launched* and fans fund it," sitting between a DSP (which it shouldn't try to out-scale) and a creator-tools company (which undersells the rooms runtime).

**Strongest strategic wedge:** Release Rooms productized as Release Night, with direct fan monetization attached, distributed mobile-first. Everything required is already built at the rails level; the gap is product packaging, telemetry, and rights hygiene.

**What should *not* become the focus:** competing as a general streaming catalog/DSP; building full rights administration or a sync-licensing marketplace (rights-*aware* readiness checks are enough); expanding the partially built side surfaces (radio, rewards, digests, articles) before the wedge lands; any new shared-package or contract refactors beyond the planned stabilization.

**Next five discovery/audit documents:**
1. **Security & Secrets Audit** — secret-storage hygiene across all three repos (the known on-disk keys are verified never-committed; sweep for others), Firestore rules review, webhook signature/idempotency verification, partner API-key storage at rest.
2. **Rights & Content Eligibility Design** — attestation flow, eligibility states, takedown intake, artist-uploaded vs partner-licensed provenance policy.
3. **Money-Flow End-to-End Audit** — Stripe → orders → entitlements → payout events → settlement → (missing) payout onboarding; RevenueCat reconciliation.
4. **Release Room Monetization Product Spec** — Release Night flow, support goals, paid access hooks, replay.
5. **Mobile Launch Readiness Checklist** — store policy decision, privacy manifests, push parity, telemetry, signup repair (MCBM-83), submission metadata.

---

*Produced by read-only inspection on 2026-06-09. Key cross-references: `micboxx-server/docs/MicBoxx Product Readiness Snapshot.md`, `MicBoxx Feature Set Inventory.md`, `micboxx-web/docs/WEB_VS_STUDIO_BOUNDARIES.md`, `micboxx-apps/MONOREPO_MIGRATION_REPORT.md`, and the routing/services files cited inline.*

---

## Addendum (2026-06-09): Refinements from the Discovery Document Campaign

Five follow-up documents were produced from this Atlas (`SECURITY_SECRETS_AUDIT.md`, `RIGHTS_LIGHT_ELIGIBILITY_DESIGN.md`, `RELEASE_NIGHT_PRODUCT_SPEC.md`, `MONEY_FLOW_AUDIT.md`, `MOBILE_LAUNCH_READINESS.md`). Their deeper reads refine the following Atlas statements (none reverse a conclusion):

1. **Room lifecycle (§5):** rooms use a **dormant→awakened** model — a Room implicitly exists per release (unique on `release_ref_type, release_ref_id`) and is awakened transactionally on first entry (`RoomAwakener.php`). "Created→active" understated this; every release already *is* a room.
2. **Support goals (§4D/§10):** goals are not merely a hook — `support_goal_cents` is settable (`RoomSupportController::activate`), reported in status, and backed by a Stripe webhook handler plus a user support wallet (`user_support_balance`). Only the goal **UI** is missing.
3. **Fan memories (§10):** `RoomRewardsTrigger` already awards account-level achievements from room events — the memories foundation is live code.
4. **Gap 6 (RevenueCat), sharpened:** the creator app configures RevenueCat with **anonymous app-user IDs** (no `logIn`), so Pro entitlements aren't bound to MicBoxx accounts at all (`MOBILE_LAUNCH_READINESS.md` S2).
5. **Money flow (§4F):** purchase rails are idempotent and signature-verified, but **room support completes a ledger without creating payout events**, and payout-event ingestion runs through Fever Core adapter clients — the commerce→payout bridge is the weakest link (`MONEY_FLOW_AUDIT.md` F1/F3).
6. **Rights (§4G), better than reported:** `ReleaseReadinessProfileBuilder` already composes all three rights checkers; only the publish gate, attestation capture, and creator-facing surfaces are missing (`RIGHTS_LIGHT_ELIGIBILITY_DESIGN.md` §1).
7. **New mobile finding:** consumer iOS config lacks `NSMicrophoneUsageDescription` despite bundling WebRTC (`MOBILE_LAUNCH_READINESS.md` C3).

---

## Appendix A. Security Verification — On-Disk Keys (2026-06-09)

An earlier draft of this atlas flagged two "committed secret" findings based on automated discovery. Both were re-verified directly against git state and **disproven**: the files exist on disk but are gitignored and have never been committed. Severity was downgraded from Critical (incident) to Medium (hygiene) — see Gap 1.

**Methodology lesson:** discovery agents may flag suspected risks from file presence alone; the atlas only labels something a breach after git history proves it. The commands below are the verification procedure for any future suspected secret.

### A.1 micboxx-apps — `SubscriptionKey_M99P97PRF2.p8` (Apple subscription key)

```console
$ cd micboxx-apps

$ git check-ignore -v SubscriptionKey_M99P97PRF2.p8
.gitignore:11:*.p8	SubscriptionKey_M99P97PRF2.p8     # ignored by the *.p8 rule

$ git ls-files SubscriptionKey_M99P97PRF2.p8
(no output — not tracked)

$ git log --all --oneline -- '*.p8'
(no output — no .p8 file has ever been committed on any ref)
```

### A.2 micboxx-server — `keys/private.key`, `keys/public.key` (OAuth keypair)

```console
$ cd micboxx-server

$ git check-ignore -v keys/private.key
.gitignore:30:keys/	keys/private.key                  # ignored by the keys/ rule

$ git ls-files keys/
(no output — nothing under keys/ is tracked)

$ git log --all --oneline -- keys/ 'keys/*'
(no output — keys/ has never been committed on any ref)
```

### A.3 Verdict and standing procedure

| Check | Command | apps `.p8` | server `keys/` |
|---|---|---|---|
| Ignored? | `git check-ignore -v <path>` | Yes (`.gitignore:11`) | Yes (`.gitignore:30`) |
| Tracked now? | `git ls-files <path>` | No | No |
| Ever committed? | `git log --all -- <path>` | No | No |
| Visible only as ignored? | `git status --ignored` | Yes (`!!`) | Yes (`!!`) |

**Conclusion:** for the two originally flagged keys, no rotation or history purge is warranted. Remaining actions are preventive: secret scanning in CI/pre-commit (gitleaks), and eventually relocating the keys outside the working trees once all local/EAS/OAuth tooling paths that reference them are confirmed.

### A.4 Full-history gitleaks baseline (2026-06-09)

Gitleaks 8.24.3 was run over the complete git history of all three repos (`gitleaks git <repo>`); every hit was manually triaged. CI workflows (`.github/workflows/secret-scan.yml`) and allowlist configs (`.gitleaks.toml`) were added to each repo so future scans only flag new, untriaged findings.

| Repo | Raw hits | After triage | Disposition |
|---|---|---|---|
| micboxx-apps | 3 | 0 | `google-services.json` Firebase Android client keys — public by design (allowlisted) |
| micboxx-web | 242 | 0 | 240 from `firebase-debug.log` in two old commits (short-lived OAuth tokens, long expired; file now gitignored); 2 from a PEM-parsing regex in `firebase-admin.ts`, which reads keys from `process.env` (allowlisted) |
| micboxx-server | 9 | **1 real** | 8 false positives (SQL schema text, demo-doc placeholder keys, e2e fixture password, captured Jira response with expired XSRF cookie). **1 genuine: `config/sync/symfony_mailer.mailer_transport.smtp.yml` contains live-shaped AWS SES SMTP credentials (an `AKIA…` IAM access key ID and 44-char SMTP password), tracked in git (1 commit).** Deliberately *not* allowlisted. |

**Required remediation for the real finding (Gap 18):**
1. Rotate in AWS: delete/deactivate the SES SMTP user's credentials in IAM and issue new ones.
2. Move the credential out of `config/sync` — override `$config['symfony_mailer.mailer_transport.smtp']['configuration']` (`user`/`pass`) from environment variables in the existing `micboxx.settings.php` overlay, and commit the config file with blank/placeholder values.
3. Optional after rotation: purge the file's history (single commit touches it, so the purge is simple) — rotation alone removes the actual risk.
4. Housekeeping: delete the `jira-*.txt/json` scratch captures at the server repo root.





