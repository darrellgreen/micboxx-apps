# MicBoxx Mobile Launch Readiness

**Date:** 2026-06-09
**Type:** Discovery document 5 of 5 — per-app launch checklist
**Apps:** Consumer "MicBoxx" (`com.micboxx.mobile`) · Creator "MicBoxx Studio" (`com.micboxx.creators`)
**Legend:** 🟥 Blocking · 🟧 Should-fix before launch · 🟩 Ready · ⬜ Decision needed | Owner: **E**ng / **P**roduct / **F**ounder

---

## 1. Summary Verdict

- **Consumer app:** launchable after three items — store-policy decision (⬜→🟥), signup repair confirmation (🟥, in flight as MCBM-83), telemetry audit (🟧). Telemetry is substantially wired; mic string fixed; CI added.
- **Creator app:** **submitted for App Store review 2026-06-10.** Public launch still blocked by push notifications (🟥) once live. RevenueCat identity binding fixed.
- **New findings from this audit:** (Resolved) RevenueCat runs on anonymous app-user IDs, and the consumer app ships WebRTC without an iOS microphone usage description. Both fixed. PostHog removed — first-party analytics wired in its place.

## 2. Consumer App Checklist

| # | Item | Status | Evidence / detail | Owner |
|---|---|---|---|---|
| C1 | Product telemetry | 🟧 | First-party analytics wired: `PlayerAnalyticsSink` sends `media_session.*` events to Drupal; `room_entry` and `support_send` POST to `/v1/public/events`. PostHog removed — MicBoxx Analytics Suite is source of truth. Remaining: audit `fever_analytics_event` to confirm events are landing. | E |
| C2 | App Store digital-content policy decision | ⬜→🟥 | App surfaces purchasable/subscriber-gated tracks with **no IAP**. Options: (a) hide all purchase/upsell UI on iOS (reader-style), (b) add IAP for listener sub, (c) external-purchase-link entitlement where available. Must be decided before submission; rejection risk otherwise (Atlas Gap 9). | F+P |
| C3 | iOS `NSMicrophoneUsageDescription` missing | 🟩 | Fixed in app.json. | E |
| C4 | Signup flow repair | 🟥 | MCBM-83 "Mobile signup flow repair" In Progress per server readiness snapshot — confirm closed before launch. | E |
| C5 | Push notifications | 🟩 | FCM end-to-end: permission, token register (`/v1/devices/token`), foreground/background handlers, deep links (`src/features/push/`). | — |
| C6 | Deep links | 🟩 | `micboxx://` scheme + notification routing; verify a link matrix (track/album/artist/room/DM) as a test pass. | E (test) |
| C7 | Versioning | 🟧 | No `buildNumber`/`versionCode` in `app.json`; confirm EAS auto-increment is enabled in `eas.json` production profile or set explicitly. | E |
| C8 | Privacy labels / data safety | 🟧 | Derive from actual SDKs: Sentry (diagnostics), Firebase/Firestore (identifiers, user content: messages/comments), FCM (device tokens), playback analytics (usage). No ad SDKs in app. Draft answers for both stores. | P |
| C9 | Age rating | 🟧 | UGC (chat, DMs, comments) + moderation/report/block flows exist (required by Apple for UGC apps: report ✓, block ✓, moderation ✓ room-scoped). Expect 12+/Teen; document UGC safeguards in review notes. | P |
| C10 | Store metadata/screenshots | 🟧 | Not in repo (expected); needs producing. Icons/splash ✓. | P |
| C11 | Crash reporting | 🟩 | Sentry RN configured via plugin. | — |
| C12 | Account deletion (Apple requirement) | 🟩 | `DELETE /v1/dashboard/user/account` + cancel/activate flows exist server-side; **verify in-app entry point is reachable**. | E (verify) |
| C13 | Background audio entitlement | 🟩 | Consumer only: `UIBackgroundModes: ["audio"]` remains in `apps/consumer/app.json`. Creator/Studio intentionally does not declare background audio. | — |
| C14 | Uncommitted workspace changes | 🟧 | `metro.config.js`, `_layout.tsx`, `stubs/`, suppress-deprecation file still uncommitted — land or drop before release branch. | E |

## 3. Creator App Checklist

| # | Item | Status | Evidence / detail | Owner |
|---|---|---|---|---|
| S1 | Push notifications | 🟥 | No `@react-native-firebase/messaging` dependency at all; Android perms lack `POST_NOTIFICATIONS`. Artists can't hear support/follows/room events. Port consumer `features/push/` (server side already done). Blocks public launch; OK to TestFlight without. | E |
| S2 | RevenueCat identity binding | 🟩 | Fixed in provider.tsx to log in via RevenueCat on auth change. | E |
| S3 | Product telemetry | 🟧 | `room_entry` wired to first-party analytics. PostHog removed. Remaining: `paywall_view` (PostHog call removed but not re-wired to first-party analytics). | E |
| S4 | IAP compliance | 🟩 | Creator sub correctly uses store IAP via RevenueCat (+ paywall UI). Confirm price points/offerings configured in RC dashboard + both stores. | P |
| S5 | Permission strings | 🟩 | Camera/mic/photo iOS strings present (video drop-ins, uploads). | — |
| S6 | Versioning / EAS | 🟧 | Same as C7. | E |
| S7 | Privacy labels | 🟧 | Same as C8 + camera/photo (uploads) + RevenueCat (purchase data). | P |
| S8 | Review notes for creator gating | 🟧 | App requires a creator account → provide demo creator credentials + the fixture scenarios (`verify:web:creator-ready` etc. show the flows exist) for App Review. | P |
| S9 | Deep links | 🟩 | `micboxx-creators://` registered; test matrix as C6. | E (test) |
| S10 | Crash reporting | 🟩 | Sentry RN configured. | — |

## 4. Shared / Platform Items

| # | Item | Status | Detail | Owner |
|---|---|---|---|---|
| P1 | No CI on micboxx-apps | 🟩 | Added ci.yml running typecheck and lint. | E |
| P2 | Apple `.p8` key location | 🟩 (contained) | Gitignored, never committed (`SECURITY_SECRETS_AUDIT.md` §2); relocation is P2 hygiene. | F |
| P3 | Social-bridge dependency | 🟧 | All mobile social/rooms realtime depends on web's `POST /api/social/auth/token` (Atlas Gap 13). Acceptable for launch; document the outage blast radius in runbooks. | E |
| P4 | Store assets pipeline | 🟧 | Screenshots, descriptions, keywords, support URL, marketing URL — none in repo; needs an owner and a checklist of its own. | P/F |

## 5. Recommended Launch Sequence

1. **Done:** C1/S3 telemetry (first-party) · S2 RevenueCat identity binding · C3 mic string · P1 CI. Creator app submitted for App Store review 2026-06-10.
2. **Next creator app update (post-approval):** S1 push notifications · S3 `paywall_view` wiring.
3. **Decision week:** C2 store-policy (founder decision, then UI work sized accordingly) · C8/C9 privacy + age-rating drafts.
4. **Consumer submission:** after C2/C4 close → TestFlight → staged App Store release.
5. **Creator public launch:** after S1 push ships in an approved update.
6. **Post-launch:** P3 runbook, deep-link test matrices as regression suites.

---

*Cross-references: Atlas §4O (store readiness), Gaps 4/5/9/10; `MONEY_FLOW_AUDIT.md` F2/B2 (RevenueCat); `RELEASE_NIGHT_PRODUCT_SPEC.md` §5 (telemetry dependency). Evidence: `apps/*/app.json`, `apps/creator/src/features/subscription/provider.tsx:106`, package.json dependency lists — read 2026-06-09.*
