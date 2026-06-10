# Release Night — Product Specification

**Date:** 2026-06-09
**Type:** Discovery document 3 of 5 — code-grounded product spec
**Thesis:** Release Rooms are MicBoxx's most differentiated, most complete surface (Atlas §4D). Release Night productizes them into a repeatable ritual: *the night your music comes out is an event, your fans are in the room, and the listening funds you.*
**Labels:** every feature is tagged **EXISTS** (built end-to-end), **PARTIAL** (backend or one surface only), or **BUILD** (net-new). Evidence from `micboxx_rooms` (47 routes), `@micboxx/contracts/rooms.ts`, and direct service reads on 2026-06-09.

---

## 1. The Discovery That Shapes This Spec

Three facts found in code change the product framing:

1. **Every release already *is* a room.** `RoomAwakener` (`micboxx_rooms/src/Service/RoomAwakener.php`) implements a **dormant→awakened lifecycle**: a Room implicitly exists per release (unique index on `release_ref_type, release_ref_id`); the first entry awakens it transactionally. There is no "create a room" chore to design — Release Night is about *scheduling and charging the moment*, not provisioning infrastructure. (High)
2. **Support goals already exist server-side.** `RoomSupportController::activate()` accepts `support_goal_cents` (line 78–83); `RoomSupportStatus` reports `support_goal_cents`, `total_support_amount_cents`, `backer_count`; payment methods include `direct_stripe` and a **user support balance/wallet** (`RoomSupportBalance`, `RoomSupportPaymentMethod` in `@micboxx/contracts/rooms.ts:399–411`); `RoomSupportStripeWebhookHandler` closes the payment loop. The Atlas's "support goals UI missing" is right — but only the *UI* is missing. (High)
3. **Fan achievements from room events already exist.** `RoomRewardsTrigger` "awards account-level room achievements from trusted room_event rows" — the fan-memory/identity foundation for recaps and superfan status is live code, not a concept. (High)

Net: Release Night is ~70% systems-complete. The work is **choreography and UI**, not infrastructure.

---

## 2. The Ritual — Seven Phases

### Phase 0 — Schedule ("set the date")
Artist schedules the release; Release Night inherits the date.

| Capability | Status | Evidence |
|---|---|---|
| Scheduled publishing (date-driven release) | **EXISTS** | ECA scheduled publishing; `TrackPublicationManager::scheduleTrack()` |
| Room implicitly attached to release | **EXISTS** | `RoomAwakener` dormant room per release |
| Guided "plan your Release Night" flow (pick date → preview room → set goal → write artist note) | **BUILD** | net-new UX in studio + creator app |
| Eligibility precondition (release must be publish-ready) | **PARTIAL** | readiness profile exists; publish gate is doc-2 work (`RIGHTS_LIGHT_ELIGIBILITY_DESIGN.md` §4.2) |

### Phase 1 — Announce & Invite ("doors at 9")
Fans learn the night exists and commit to showing up.

| Capability | Status | Evidence |
|---|---|---|
| Room discovery (public lists, per-artist, per-release summaries) | **EXISTS** | `/v1/public/rooms(+summary)`, `/v1/public/releases/{id}/room-summary`, `/v1/public/artists/{id}/rooms`; `RoomDiscoveryService` |
| Follower notifications (in-app) | **EXISTS** | Firestore `notifications` + `RoomNotificationService` |
| Push to followers (consumer app) | **PARTIAL** | `micboxx_push` + consumer FCM wired; **notification choreography for "room opens at X" is BUILD**; creator-app push missing entirely (Atlas Gap 5) |
| RSVP / "I'll be there" + reminder | **BUILD** | no RSVP concept found; could reuse follows + a scheduled push |
| Shareable invite link (deep link `micboxx://room/…` + web URL with OG card) | **PARTIAL** | deep-link schemes + web room pages exist; share-card/invite UX is BUILD |

### Phase 2 — Doors Open ("the room wakes up")
First listeners arrive; the room comes alive.

| Capability | Status | Evidence |
|---|---|---|
| Room entry with capability negotiation | **EXISTS** | `POST /v1/rooms/enter` → `RoomEntryResponse.capabilities` (`RoomCapabilityResolver`) |
| Presence (count, aura, privacy modes) | **EXISTS** | heartbeat + `presence_summary` projection; `RoomPresencePrivacy = visible/anonymous/hidden` |
| Synchronized listening clock | **EXISTS** | `RoomPlaybackClock`, `GET /v1/rooms/{id}/clock`, `RoomClockState` |
| Countdown-to-start state ("doors open, music at 9:00") | **BUILD** | clock exists; a pre-start lobby state is choreography work |

### Phase 3 — The Listen (synchronized premiere)
The album plays once, together, in order.

| Capability | Status | Evidence |
|---|---|---|
| Shared playback, track-by-track clock | **EXISTS** | `RoomClockTrackEntry`, clock routes, web + both mobile players |
| Chat, reactions | **EXISTS** | 6 chat routes (+pin/hide/delete/report), `/reactions`; all surfaces |
| Polls & Q&A | **EXISTS** | 14 routes; `RoomPollService`, `RoomQuestionService` |
| Moments / stage takeover | **EXISTS** | `/moments`, `/moments/active`; hardening closed (`ROOM_MOMENT_RUNTIME_HARDENING_CLOSURE.md`) |
| Moderation during the night | **EXISTS** (room-scoped) | mute/block/users routes; `RoomModerationManager` |

### Phase 4 — Artist Drop-In (the surprise)
The artist appears — voice/video — between tracks.

| Capability | Status | Evidence |
|---|---|---|
| Artist presence (enter/heartbeat/leave/pin) | **EXISTS** | 5 artist-drop-in routes |
| Live video via LiveKit (publish + watch) | **EXISTS** | RN SDKs both apps; web token mint + invitations API |
| Artist identity/keys in room | **EXISTS** | `/artist-keys/request|status`, room claim (`RoomClaimController`) |
| Scheduled/announced drop-in ("artist arrives after track 4") | **BUILD** | invitations API exists; scheduling choreography is new |

### Phase 5 — The Support Goal (the funding moment)
A visible goal turns appreciation into money, together.

| Capability | Status | Evidence |
|---|---|---|
| Enable support + set goal | **EXISTS** (API) | `POST /support/activate` with `support_goal_cents` |
| Send support (Stripe or wallet balance) | **EXISTS** | `POST /support/send`; `RoomSupportPaymentMethod = direct_stripe | user_support_balance`; `RoomSupportStripeWebhookHandler` |
| Goal progress (totals, backers, goal) | **EXISTS** (API) | `GET /support/status` → `RoomSupportStatusResult` |
| **Goal UI**: progress bar, milestone celebrations (50%/100% confetti via existing reactions/moments), backer shout-outs | **BUILD** | clients render basic support panels; no goal visualization found |
| Artist "thank you" moment on goal hit (auto-moment) | **BUILD** | compose existing moments API |
| Support → payout attribution | **PARTIAL** | payout-event spine exists (`micboxx_payouts`); end-to-end attribution verified in doc 4 (`MONEY_FLOW_AUDIT.md`) |

### Phase 6 — Fan Moments & Memories
The night leaves a mark on the fan's identity.

| Capability | Status | Evidence |
|---|---|---|
| Room achievements ("was there night one", first reaction, etc.) | **EXISTS** (engine) | `RoomRewardsTrigger` awards from `room_event` rows; criteria mapping in code |
| Fan-visible memories surface ("your moments") | **BUILD** | no client surface found for achievements |
| Activity log feeding all of this | **EXISTS** | `RoomActivityService`, `/v1/rooms/{id}/activity`, `RoomEventLogger` |

### Phase 7 — Afterglow (replay & recap)
The event becomes evergreen content.

| Capability | Status | Evidence |
|---|---|---|
| Time Machine (rewind/replay state) | **EXISTS** (API) | `/time-machine`; `RoomTimeMachineService`; web + consumer clients call it |
| Recap page (stats: peak listeners, messages, goal result, drop-in clips, top moments) | **BUILD** | all inputs exist (activity log, support status, presence, moments); page is new |
| Share-the-recap (fan + artist versions) | **BUILD** | — |
| Post-night follow-up push ("the room is still warm — replay") | **BUILD** | composes existing push + Time Machine |

---

## 3. Build List (net-new work, priority order)

| # | Item | Surfaces | Backend needed? | Size (inference) |
|---|---|---|---|---|
| 1 | Support **goal UI** (progress bar, milestones, backer feed) | web + consumer + creator | **No** — API complete | S–M |
| 2 | Release Night **planner** (guided flow in studio/creator app: date, goal, artist note, drop-in plan) | studio + creator app | Thin (store plan metadata on room settings) | M |
| 3 | Notification **choreography** (announce → reminder → doors open → goal hit → recap), incl. creator-app push port | all + `micboxx_push` | Scheduling triggers (ECA or cron) | M |
| 4 | **Recap page** + share cards | web (canonical) + in-app | Read-model aggregation over existing data | M |
| 5 | Pre-start **lobby/countdown** state | web + consumer | Clock state extension | S |
| 6 | **Fan memories** surface ("your nights") | consumer | No — `RoomRewardsTrigger` data | S–M |
| 7 | RSVP/reminder | web + consumer | Small table or reuse follows + scheduled push | S |
| 8 | Scheduled drop-in announcements | creator app | Compose invitations + moments | S |

Explicit **non-build** (deferred): paid room entry (capability flags could carry it later), multi-room tours, co-listening DM rooms.

## 4. Monetization Model

- **Now:** support goal (tips) is the only in-night rail — by design. One goal, one button, visible progress. Stripe direct + wallet balance both already work (§Phase 5).
- **Pricing posture:** Release Night free for artists at launch (it drives catalog + support volume); platform takes existing support fee (verify fee config in doc 4).
- **Later hooks (architecture present, product deferred):** paid early-door access via `RoomCapabilities`/`RoomAccessManager`; supporter-only afterglow window in Time Machine; membership cross-sell on recap page.
- **Dependency:** support → payout attribution must be verified end-to-end (doc 4) before marketing "the listening funds you."

## 5. Success Metrics

Primary: **rooms with ≥1 awakening on release day**, **median concurrent listeners at premiere**, **goal attainment rate**, **support per attendee**, **replay rate in 7 days**, **fan return rate to a second Release Night**.
**Hard dependency:** mobile telemetry is currently a console stub (Atlas Gap 4) — none of these are measurable on mobile until `@micboxx/analytics` has a real adapter. Doc 5 carries that work; it is a **launch blocker for this product**, not a nice-to-have. Web-side, `PLAYER_ANALYTICS_EVENTS` and room runtime QA hooks already exist.

## 6. Risks & Dependencies

1. **Eligibility gate first** — monetized public listening events on unattested uploads compounds rights exposure; Phase A of `RIGHTS_LIGHT_ELIGIBILITY_DESIGN.md` should land before Release Night marketing. Room creation already has the right seam (`RoomEntryController` check, doc 2 §4.5).
2. **Moderation load spikes at events** — room-scoped tools exist; a busy night needs the operator/trust queue (Atlas Gap 8, MCBM-113–117) at least in minimal form.
3. **Creator push gap** — artists can't feel the night from their pocket until the creator app gets push (Atlas Gap 5); the planner (#2) without choreography (#3) is half a product.
4. **Clock fidelity at scale** — presence is heartbeat-best-effort (12s); load characteristics beyond current QA runbook scale are Unknown.

## 7. Open Product Questions

1. Is the premiere **strictly synchronized** (everyone hears track 1 together, latecomers join mid-stream) or **rolling** (each entrant starts at track 1)? The clock supports the former; product must choose. Recommendation: synchronized for the event window, free-listen after.
2. Default support goal: artist-set, platform-suggested (e.g. based on follower count), or both?
3. Does Release Night apply to singles, or albums/EPs only? (RoomRelease supports both — `release_ref_type`.)
4. Recap page visibility: public (growth) vs attendees-only (FOMO)? Recommendation: public recap, attendee-only badge.

---

*Cross-references: Atlas §4D/§8/§10 (Release Rooms, strategy, opportunities), `RIGHTS_LIGHT_ELIGIBILITY_DESIGN.md` (gate), `MONEY_FLOW_AUDIT.md` (support attribution), `MOBILE_LAUNCH_READINESS.md` (telemetry, push). All EXISTS labels verified by direct code/route reads 2026-06-09.*
