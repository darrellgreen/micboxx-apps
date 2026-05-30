# Monorepo Continuation Plan

This document outlines the strategy for further monorepo consolidation following the initial `monorepo-migration-complete` milestone. It defines strict phases, extraction criteria, and stop conditions to maintain production stability.

## 1. Stability Window Rules

**Current Phase: Phase 6 - Stabilize**
* **No more shared package extraction yet.** The monorepo must prove stable in production before further consolidation.
* **Use both apps normally** for a few days (Consumer and Creator apps).
* **Fix only bugs caused by the migration.** Avoid feature work or refactoring that could muddy migration validation.

## 2. Low-Risk Extraction Candidates (Phase 7)

Once the stability window concludes, begin by extracting only "boring", stateless helpers into `@micboxx/utils` or similar scoped packages:
* Date helpers
* Image URL helpers
* Slug/URL helpers
* Validation helpers
* Shared constants/enums
* Analytics event names/types

## 3. Extraction Decision Checklist

Before extracting any code into a shared package, verify:
- [ ] Is the code completely stateless?
- [ ] Does it lack dependencies on app-specific environment variables (e.g., `env.ts`)?
- [ ] Does it lack dependencies on app-specific Redux state or Native Modules that aren't globally available?
- [ ] Are the consumer and creator versions identical, or is one a strict superset that safely covers both?

## 4. Packages That Should NOT Be Extracted Yet

These features are explicitly deferred because they are high/medium risk and tightly coupled to runtime behavior:
* **Auth (OAuth PKCE):** Token storage, Redux slice, provider.
* **Player Engine:** Native module dependencies, complex state.
* **Redux Store:** Tightly coupled to app state and middleware.
* **Catalog Browsing:** Deep dependency on store + player.
* **Firebase Social/DMs:** External service coupling, Firestore rules.
* **Rooms/LiveKit:** Native WebRTC plugin dependencies.

## 5. Proposed Next Package: `@micboxx/utils`

The first post-stabilization package should be `@micboxx/utils`, focusing on the low-risk extraction candidates listed in section 2.

* **Target:** Date formatters, string manipulators, basic validation logic.
* **Approach:** Same as Phase 2 (identify superset, create package, rewrite imports, validate).

*Note: Phase 8 (Configurable API client) and Phase 9 (Shared feature contracts) will follow only after `@micboxx/utils` is stable.*

## 6. Validation Commands Required After Each Extraction

After *every* shared package extraction, run the following from the monorepo root:
1. `npm install` (ensure workspace links are correct)
2. `npm run typecheck` (must pass for all workspaces)
3. `npm run lint` (must pass for all workspaces)
4. Start both dev servers: `npm run start:consumer` and `npm run start:creator`
5. Verify core user flows (Login, Playback, Rooms, Dashboard) manually in the dev client.

## 7. Stop Conditions if Runtime Behavior Changes

**HALT EXTRACTION IMMEDIATELY IF:**
* You have to change how a function works to make it shared (e.g., adding new parameters to handle app differences).
* You find yourself needing to pass Redux dispatch/select functions into shared utilities.
* The extracted code introduces new native dependencies that break the Expo Go fallback or dev client builds.
* Any typecheck error cannot be resolved by simple import path updates.
