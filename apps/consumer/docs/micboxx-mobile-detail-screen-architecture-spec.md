# MicBoxx Mobile Detail Screen Architecture Spec

Date: 2026-04-10
Status: Build-ready plan for the first listener detail routes.

## Purpose

Define the mobile architecture for the four primary public detail surfaces:

- `track/[slug]`
- `album/[slug]`
- `playlist/[slug]`
- `user/[username]`

This spec is intentionally **Drupal-first**. The web app is used as a behavior reference, not as the primary API source.

## Platform sourcing rule

### Preferred order

1. **Inspect the Drupal endpoint and payload first**
2. **Inspect how the web consumes that Drupal payload**
3. **Mirror the contract and behavior in mobile**
4. **Only use a web API route when Drupal does not provide that capability**

### Allowed web-bridge exceptions

- `GET /api/recommendations/for-you`
- `POST /api/social/auth/token`

Everything else in this spec should prefer Drupal-backed contracts.

---

## Canonical route model

| Mobile route      | Route param | Primary loader                                                | Backing source                           |
| ----------------- | ----------: | ------------------------------------------------------------- | ---------------------------------------- |
| `track/[slug]`    |      `slug` | `getTrackPage(slug)` / `useGetTrackPageQuery(slug)`           | Drupal `GET /v1/public/tracks/{slug}`    |
| `album/[slug]`    |      `slug` | `getAlbumPage(slug)` / `useGetAlbumPageQuery(slug)`           | Drupal `GET /v1/public/albums/{slug}`    |
| `playlist/[slug]` |      `slug` | `getPlaylistPage(slug)` / `useGetPlaylistPageQuery(slug)`     | Drupal `GET /v1/public/playlists/{slug}` |
| `user/[username]` |  `username` | `getArtistPage(username)` / `useGetArtistPageQuery(username)` | Drupal `GET /v1/public/users/{username}` |

> Note: the contract layer still uses `PublicArtist*` naming. Mobile should keep the **route and UX language** as **user profile** until the platform contract is renamed globally.

---

## Shared screen shell

All four detail routes should share the same structural pattern.

### 1. Hero / header region

Contains:

- artwork or avatar
- title / display name
- secondary metadata row
- access state pills when relevant
- primary action bar

### 2. Primary content region

Contains the entity-specific body:

- track description + stats
- album or playlist track list
- user profile summary, top tracks, albums, playlists

### 3. Context region

Contains related-content lanes:

- related tracks
- related albums
- related playlists
- more from this user

### 4. Global player integration

The mini player remains route-independent. Detail screens can seed or replace the queue, but they do not own playback state.

---

## Shared action bar model

The action bar should be built from reusable mobile actions, not screen-specific one-offs.

### Core actions

- `Play`
- `Shuffle` (album / playlist / user mix only)
- `Add to queue`
- `Like` (track-level first)
- `Follow` (user profile first)
- `Share`
- `Access CTA` (play / buy / subscribe / sign-in)

### Implementation rule

Action availability must come from the loaded contract payload and session state, not from UI guesses.

---

## Access CTA contract

Locked content and purchase prompts should resolve from one formal view model.

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

### Source of truth

Resolve this model from:

- `track.access`
- `track.commerce`
- album commerce payloads
- entitlement endpoints
- current session state

### Web handoff rule

If checkout is required, mobile opens the server-generated checkout URL in a browser/web view and then refreshes entitlement state after return.

---

## Screen-by-screen architecture

## 1. `track/[slug]`

### Route purpose

This is the tightest listener loop entry point.

### Primary loader

- `useGetTrackPageQuery(slug)`
- Backed by `getTrackPage(slug)`
- Drupal source: `GET /v1/public/tracks/{slug}`

### Screen sections

1. **Hero**
   - artwork
   - title
   - user/creator link
   - album link
   - genre
   - created date / duration
   - state pill for locked or subscriber-only content

2. **Primary actions**
   - Play / preview
   - Add to queue
   - Like
   - Share
   - Access CTA

3. **Body**
   - description
   - waveform if available
   - basic social stats
   - comments entry point

4. **Related lane**
   - `relatedTracks` from the payload

### Queue behavior

Track detail should start a queue shaped as:

```ts
[track, ...relatedTracks];
```

### Extra integrations

- playback analytics events for play start / playback event
- optional comments surface in Phase 3

---

## 2. `album/[slug]`

### Primary loader

- `useGetAlbumPageQuery(slug)`
- Drupal source: `GET /v1/public/albums/{slug}`

### Screen sections

1. **Hero**
   - artwork
   - album title
   - user/creator name
   - song count
   - duration
   - purchase/access state

2. **Primary actions**
   - Play album
   - Shuffle album
   - Add to queue
   - Access CTA if needed

3. **Track list**
   - ordered album tracks
   - row-level play action
   - lock indicators when necessary

4. **Related lane**
   - `relatedAlbums`

### Queue behavior

The queue should be the exact ordered album track list. Starting from a tapped track should preserve album order.

---

## 3. `user/[username]`

### Route purpose

This is the public creator/user surface. Mobile should present it as a **user profile**, even if some platform types still say `Artist`.

### Primary loader

- `useGetArtistPageQuery(username)` for now
- Drupal source: `GET /v1/public/users/{username}`

### Screen sections

1. **Hero**
   - avatar / cover
   - display name
   - `@username`
   - bio
   - profile links
   - follower / following counts
   - optional recognition badges

2. **Primary actions**
   - Follow
   - Message
   - Play creator mix
   - Share profile

3. **Content lanes**
   - top tracks
   - albums
   - playlists

4. **Future extensions**
   - follow/follower lists
   - lightweight activity signals

### Queue behavior

The primary play action should create a creator mix from the returned public tracks.

---

## 4. `playlist/[slug]`

### Primary loader

- `useGetPlaylistPageQuery(slug)`
- Drupal source: `GET /v1/public/playlists/{slug}`

### Screen sections

1. **Hero**
   - artwork
   - playlist title
   - owner name
   - track count
   - duration

2. **Primary actions**
   - Play playlist
   - Shuffle playlist
   - Add to queue
   - Share

3. **Track list**
   - ordered tracks with `position`
   - row-level play actions

4. **Related lane**
   - `relatedPlaylists`

### Queue behavior

Use the server-provided playlist order exactly.

---

## Related-content lane rules

### Immediate rules

- Track detail → `relatedTracks`
- Album detail → `relatedAlbums`
- Playlist detail → `relatedPlaylists`
- User profile → `tracks`, `albums`, `playlists`

### Do not do initially

- Do not invent separate mobile recommendation logic inside detail screens
- Do not route detail content through web page endpoints
- Do not block initial screen render on optional social enrichments

---

## Shared component needs

These should be implemented once and reused across all detail routes.

### Universal entity cards

- `TrackCard`
- `AlbumCard`
- `PlaylistCard`
- `UserCard`

### Shared shells

- `DetailHero`
- `DetailMetaRow`
- `DetailActionBar`
- `RelatedContentLane`
- `AccessStateBanner`

---

## Delivery order

### Priority 1A

1. shared hero/header shell
2. shared action bar + access CTA model
3. `track/[slug]`
4. `album/[slug]`
5. `user/[username]`

### Priority 1B

1. `playlist/[slug]`
2. comments entry points
3. related-content polish
4. notification/deeplink polish

---

## Non-goals for this spec

- dashboard parity
- upload/release management
- creator analytics parity
- admin/moderation surfaces
- native payment execution

These remain web-first until the launch scope changes.
