# Monorepo Migration Report

**Date:** 2026-05-30
**Tag:** `monorepo-migration-complete`
**Source repos:** `micboxx-mobile` (consumer), `micboxx-creators` (creator)
**Target repo:** `micboxx-apps`

---

## What Moved

| Source | Destination | Package name |
|---|---|---|
| `micboxx-mobile/` | `apps/consumer/` | `@micboxx/consumer` |
| `micboxx-creators/` | `apps/creator/` | `@micboxx/creator` |

**Git strategy:** Clean copy (not subtree merge). No git history was carried over.

---

## Shared Packages Extracted

| Package | Contents | Baseline | Lines removed |
|---|---|---|---|
| `@micboxx/contracts` | Platform type definitions (commerce, dashboard, micboxx, registration, rooms, social) | Consumer (superset) | ~1,427 |
| `@micboxx/theme` | Design tokens (colors, typography, spacing, radii, shadows) | Creator (superset with spacing/surface/icon tokens) | ~154 |
| `@micboxx/ui` | 9 UI primitives + haptic utilities | Identical (consumer used as source) | ~678 |
| `@micboxx/api` | Formatting utilities (duration, count, currency, relative time) | Identical | ~19 |

**Total duplicate code eliminated:** ~2,278 lines

---

## App Identity Verification

| Property | Consumer | Creator |
|---|---|---|
| Bundle ID (iOS) | `com.micboxx.mobile` | `com.micboxx.creators` |
| Bundle ID (Android) | `com.micboxx.mobile` | `com.micboxx.creators` |
| App name | MicBoxx | MicBoxx Creators |
| Deep link scheme | `micboxx://` | `micboxx-creators://` |
| EAS project ID | `300f252f-bc76-42c1-8214-a757ab3a5916` | `d5619e61-6b36-4f47-94eb-e9b73cf6e9ba` |
| Workspace name | `@micboxx/consumer` | `@micboxx/creator` |
| Env file | `apps/consumer/.env.local` | `apps/creator/.env` |

---

## What Was Validated

- [x] `npm install` — clean, all workspace packages linked
- [x] `npm run typecheck` — all 6 workspaces pass (both apps + 4 packages)
- [x] `npx expo start` — both apps launch in dev client
- [x] `babel-preset-expo` resolves correctly (explicit devDependency + `require.resolve`)
- [x] Native modules resolve correctly (Metro `disableHierarchicalLookup` + Expo `autolinking.nativeModulesDir`)
- [x] Env files copied from source repos, gitignored

---

## Monorepo Root Scripts

| Command | Effect |
|---|---|
| `npm run start:consumer` | Start consumer Expo dev server |
| `npm run start:creator` | Start creator Expo dev server |
| `npm run build:consumer` | EAS build for consumer |
| `npm run build:creator` | EAS build for creator |
| `npm run typecheck` | TypeScript check across all workspaces |
| `npm run lint` | ESLint across all workspaces |
| `npm run clean` | Remove all `node_modules/` |
| `npm run reset` | Clean + reinstall |

---

## What Was Intentionally Deferred

These remain duplicated in both apps. **Do not extract until the monorepo is stable in production.**

| Feature | Risk | Reason |
|---|---|---|
| Auth (OAuth PKCE + token storage) | High | Redux slice, secure storage, provider — tightly coupled to app state |
| Player engine | High | ~15 files, native module deps (TrackPlayer, Expo Audio) |
| Redux store | High | App-specific middleware, slice composition |
| `apiFetch()` client | Medium | Depends on app-specific `env.ts` config; needs refactor to configurable client |
| Catalog browsing | Medium | Deep dependency on store + player |
| Social / DMs (Firebase) | Medium | External service coupling, Firestore rules |
| Rooms / LiveKit | Medium | Native WebRTC plugin dependencies |

---

## Stability Window

The monorepo should be used normally for several days before further extraction:

1. **No more shared package extraction yet**
2. Fix only bugs caused by the migration
3. Verify these user flows work:
   - Login / logout
   - Room entry and playback
   - Creator dashboard
   - Creator room controls
   - Notifications
4. Run EAS preview builds for both apps
5. Once stable, proceed to low-risk utility extraction (date/URL/validation helpers)
