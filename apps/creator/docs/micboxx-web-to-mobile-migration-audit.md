# MicBoxx Web → Mobile Migration Audit

Date: 2026-04-10
Status: Opinionated execution plan based on first-hand reads of `../micboxx-web`, `../micboxx-server`, and the current `micboxx-mobile` app.

## Governing rule

> **Reuse the web contracts and behaviors, not the desktop layout.**

For MicBoxx, that rule needs one more constraint:

> **Prefer Drupal whenever the capability already exists there.**

The web app should usually be treated as a reference client that helps reveal:

1. which Drupal endpoints already exist,
2. how those payloads are shaped and combined,
3. where the web is only acting as a temporary bridge.

Mobile should **not** default to calling web-owned APIs just because the web screen exists. The preferred order is:

1. inspect the Drupal route/controller first,
2. inspect how the web consumes that Drupal contract,
3. mirror the contract and behavior in mobile,
4. only keep a web dependency where Drupal has no equivalent surface yet.

## Evidence reviewed

### Drupal-backed and web-backed references

- `../micboxx-web/src/app/(site)/(public)/discover/page.tsx`
- `../micboxx-web/src/app/(site)/(public)/tracks/[slug]/page.tsx`
- `../micboxx-web/src/app/(site)/(public)/albums/[slug]/page.tsx`
- `../micboxx-web/src/app/(site)/(public)/playlists/[slug]/page.tsx`
- `../micboxx-web/src/app/(site)/(public)/users/[username]/page.tsx`
- `../micboxx-web/src/app/(site)/messages/page.tsx`
- `../micboxx-web/src/app/(site)/dashboard/page.tsx`
- `../micboxx-web/src/app/api/social/auth/token/route.ts`
- `../micboxx-web/src/lib/recommendations.ts`
- `../micboxx-web/src/lib/firebase-social.ts`
- `src/features/catalog/api.ts`
- `src/features/recommendations/api.ts`
- `docs/micboxx-mobile-api-contract-map.md`

### Current mobile surfaces

- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/home.tsx`
- `src/app/(tabs)/browser.tsx`
- `src/app/(tabs)/genres.tsx`
- `src/app/messages/index.tsx`
- `docs/micboxx-mobile-product-scope.md`
- `docs/micboxx-mobile-navigation-screen-map.md`

## Domain naming rule

Mobile should keep the public creator surface unified as **user profile** unless the backend truly exposes a separate artist domain that behaves differently.

### Preferred mobile route model

- `track/[slug]`
- `album/[slug]`
- `playlist/[slug]`
- `user/[username]`

### Important nuance

The platform contracts still use names like `PublicArtistSummary`, `PublicArtistPage`, and `results.artists`, and the Drupal route is `/v1/public/users/{username}`. That is acceptable at the contract layer for now, but the **mobile route and UX language** should stay unified around the user/creator profile surface.

## What is portable to mobile now

These are the strongest migration candidates because they already map to stable platform behavior and the listener-first mobile scope.

### 1. Listener core from Drupal-first catalog routes

**Primary source: Drupal**

- `GET /v1/public/tracks/{slug}`
- `GET /v1/public/albums/{slug}`
- `GET /v1/public/playlists/{slug}`
- `GET /v1/public/users/{username}`
- `GET /v1/public/search`
- `GET /v1/public/discover/popular`
- `GET /v1/public/discover/recently-played`

**Mobile fit**

- track detail
- album detail
- user profile
- playlist detail
- genre drill-down
- mixed-entity search results
- home/discover lanes

### 2. Web bridges that are acceptable exceptions

These are valid **only because Drupal does not currently own the feature directly**.

- `GET /api/recommendations/for-you` — temporary recommendation bridge
- `POST /api/social/auth/token` — Firebase social auth bridge for Firestore

The preference is still Drupal. These stay in mobile only until a Drupal-native contract replaces them.

### 3. Commerce/access behavior

**Use the platform access state and Drupal-owned purchase/entitlement contracts.**

Mobile should bring over:

- locked content treatment
- entitlement-aware labels
- subscription / purchase prompts
- post-return access refresh

Mobile should **not** bring over desktop-heavy checkout management or invent new purchase logic.

## Search and discovery parity does NOT mean UI parity

On mobile, parity should mean:

- same retrieval sources
- same ranking logic or ranking contract
- same entity types
- same queue and entitlement semantics
- **mobile-first** presentation and interaction

It should **not** mean porting Next.js page composition into Expo screens.

## Recommended build order

### Priority 1A — listener loop foundation

- **track detail screen**
- **album detail screen**
- **user profile screen**
- **shared play / queue / like / follow hooks**

These are the most foundational because they complete the core listening loop.

### Priority 1B — supporting detail and context

- **playlist detail screen**
- **comments entry points**
- **related content lanes**
- **notifications polish**

Playlist detail matters, but it is slightly less foundational than the track/album/user loop.

## Actual mobile phase plan

### Phase 1 — listener core

- track detail screen
- album detail screen
- user profile screen
- universal entity cards
- shared hero/header patterns
- unified play / shuffle / queue / follow / like actions

### Phase 2 — discovery surface

- improved home/discover lanes
- genre drill-down
- search results with mixed entity sections
- recommendation hooks and continuation rows

### Phase 3 — social polish

- comments
- notifications refinement
- messaging UX cleanup
- follow / follower surfaces
- lightweight activity signals

### Phase 4 — commerce/access

- locked content treatment
- subscription / purchase prompts
- open web checkout handoff
- entitlement refresh after purchase

## Keep web-only for now

- uploads
- release management
- creator analytics
- admin / moderation
- deep billing management

These remain web-first because they are desktop-shaped and are outside the current launch gate.

## Mobile migration rules

- Reuse domain contracts, **not** React components
- Reuse business rules, **not** page structure
- Reuse API shapes, entitlement logic, and queue semantics exactly
- Do not port desktop dashboard concepts into listener tabs
- Creator tooling only comes to mobile when it is explicitly promoted into launch scope
- Any migrated feature must map to a named **mobile route**, **contract**, and **user flow**

## Access CTA contract

Purchase and access CTAs should not be treated as vague buttons. They should resolve from one formal mobile view model:

```ts
type AccessCtaModel = {
  accessState:
    | "playable"
    | "owned"
    | "subscriber_locked"
    | "purchase_available"
    | "sign_in_required"
    | "unavailable";
  ctaLabel: string;
  actionType:
    | "play"
    | "open_checkout"
    | "open_subscription"
    | "sign_in"
    | "none";
  destination: string | null;
  handoffUrl: string | null;
  refreshPolicy: "none" | "on_focus" | "after_web_return";
};
```

This should be derived from Drupal-backed access and commerce payloads, with the web checkout URL only used as a handoff target when needed.

## Immediate next deliverable

The next planning artifact should be a **mobile detail-screen architecture spec** for:

- `track/[slug]`
- `album/[slug]`
- `playlist/[slug]`
- `user/[username]`

That spec should define route params, data loaders, action bars, related-content lanes, and player integration points in a Drupal-first way.
