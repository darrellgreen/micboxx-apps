# MicBoxx Creators Fixture Verification Matrix

Date: 2026-04-19
Scope: creator scaffold verification without live OAuth

## Verification sources

- Fixture-mode runtime via `npm run verify:web:*`
- Scenario switching via `EXPO_PUBLIC_CREATOR_FIXTURE_SCENARIO`
- Stateful in-memory creator fixtures in `src/lib/creator-fixtures.ts`

## Scenario commands

- `npm run verify:web:creator-ready`
- `npm run verify:web:needs-profile`
- `npm run verify:web:needs-album`
- `npm run verify:web:needs-track`
- `npm run verify:web:non-creator`
- `npm run verify:web:failed-processing`

## What fixture mode proves

- Creator-only shell routing
- Bootstrap classification driven by creator-capable vs non-creator sessions
- Onboarding gating for profile, album, and first-track requirements
- Smart `/create` routing
- Album-first upload enforcement
- Catalog entity-first lists and detail/edit surfaces
- Account mutations:
  - profile
  - avatar
  - cover
  - verification request
- Audience summary, inbox, thread, and notifications rendering
- Failed-processing recovery flow

## What fixture mode does not prove

- Real OAuth browser handoff
- Real callback completion timing against Drupal
- Session restore from live tokens
- Real creator permission hydration from Drupal
- Real Firebase auth token exchange
- Real upload transport and media-processing jobs

## Suggested pass matrix

| Scenario | Route / Flow | Expected result |
| --- | --- | --- |
| `creator_ready` | `/dashboard` | Lands in tabs with performance, action, and activity buckets |
| `creator_ready` | `/create` | Resolves to draft continuation or upload, based on fixture readiness |
| `creator_ready` | `/catalog/tracks` | Shows draft, scheduled, published state filters |
| `creator_ready` | `/account/profile` | Save profile updates and persist through refetch |
| `creator_ready` | `/audience/inbox` | Inbox list renders fixture conversations |
| `needs_profile` | `/` | Routes to `/onboarding/profile` after intro |
| `needs_album` | `/` | Routes to `/onboarding/album` |
| `needs_track` | `/` | Routes to `/onboarding/track` |
| `non_creator` | `/` | Routes to creator access block, never tab shell |
| `failed_processing` | `/create` | Routes into failed-item recovery path |

## Live auth handoff still required

After fixture verification is complete, manually test live auth with a real account:

1. cold launch with no session
2. sign in through Drupal OAuth
3. callback completion
4. creator vs non-creator classification
5. relaunch and session restore
