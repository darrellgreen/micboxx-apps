# MicBoxx Mobile `track/[slug]` Validation Matrix

Date: 2026-04-11
Scope: `src/app/track/[slug].tsx` only

## Verification sources

- **Fixture-mode runtime** via `nvm use && EXPO_PUBLIC_FORCE_FIXTURES=1 npm run web -- --localhost --port 3012`
- **Logic matrix** via `npx --yes tsx -e ...` against `src/features/catalog/track-access.ts`
- **Rendered route checks** on:
  - `http://localhost:3012/track/neon-afterglow`
  - `http://localhost:3012/track/midnight-paywall`
  - `http://localhost:3012/track/archive-fade`
  - `http://localhost:3012/track/does-not-exist`

## Matrix

| Scenario                                  | Expected                                                                    | Actual                                                                                                                                                 | Status         |
| ----------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Signed-out, fully playable                | Primary CTA should be `Play`; access copy should stay playback-first        | `neon-afterglow` renders `Play` + `FULL PLAYBACK AVAILABLE`                                                                                            | ✅             |
| Signed-out, preview-only                  | Primary CTA should be `Play preview`; supporting CTA should request sign-in | `signal-garden` / `midnight-paywall` render `Play preview` with `Sign in to continue` support                                                          | ✅             |
| Signed-in, non-subscriber, fully playable | CTA should remain `Play` and not switch to commerce-first copy              | Script resolves `playable` + `play` + `full`                                                                                                           | ✅             |
| Signed-in, non-subscriber, gated purchase | CTA should surface purchase flow while still allowing preview               | Script resolves `purchase_available` + `open_checkout` + `demo`                                                                                        | ✅             |
| Subscriber on gated track                 | CTA should collapse back to plain playback                                  | Script resolves `playable` + `play` + `full`                                                                                                           | ✅             |
| Purchased-access user                     | Screen should show owned/full-access state, not checkout                    | Script resolves `owned` + `play` + `full`                                                                                                              | ✅             |
| Active now-playing                        | Primary should become `Pause`; secondary should become `Open player`        | Code path in `track/[slug].tsx` switches on `activeTrackId === track.id`                                                                               | ✅ code-path   |
| Inactive/unavailable track                | No misleading `Play` CTA; screen should show unavailable state              | `archive-fade` renders `Unavailable` + `PLAYBACK UNAVAILABLE`                                                                                          | ✅             |
| Missing/unknown slug                      | Route should show recoverable error state                                   | `/track/does-not-exist` renders `Unable to load track` + `Retry` / `Go home`                                                                           | ✅             |
| Network failure                           | Recoverable load failure UI                                                 | Same `Unable to load track` error branch is used when the public fetch fails                                                                           | ✅             |
| Share on real device                      | Share sheet should open, fallback to browser if native share fails          | Code path verified in `handleShareTrack()`; real native share sheet not runnable from this environment                                                 | ⚠️ env-limited |
| Browser handoff + return                  | Purchase/subscription flow should open browser and refresh on return        | `buildTrackAccessCtaModel()` now emits `handoffUrl` + `after_web_return/on_focus`, and `handleAccessCta()` calls `openBrowserAsync()` then `refetch()` | ✅ code-path   |

## Issues found and fixed during the pass

1. **Locked purchase tracks were incorrectly resolving as full playback**
   - Root cause: `resolvePlaybackAuthorization()` treated `requiredCapability === null` as full access.
   - Fix: only capability-match when a capability is explicitly required.

2. **Unavailable tracks could still look sign-in or playback-ready**
   - Root cause: non-purchasable locked tracks defaulted to `requires_purchase` semantics.
   - Fix: distinguish true `not_available` tracks from purchase-gated tracks and disable the primary CTA.

3. **Fixture-mode validation was hard to force locally**
   - Root cause: blank env vars still fell back to Expo config values.
   - Fix: added `EXPO_PUBLIC_FORCE_FIXTURES=1` override.

4. **Misleading fixture copy**
   - `Neon Afterglow` now says full playback is already unlocked instead of implying subscriber-only access.
