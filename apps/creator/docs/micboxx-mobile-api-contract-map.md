# MicBoxx Mobile API Contract Map

Date: 2026-04-09
Status: Authoritative contract map produced from first-hand reads of `micboxx-server` (Drupal 11), `micboxx-web` (Next.js 16), and `micboxx-mobile` source. Supersedes the shape-level notes in `micboxx-mobile-api-contract-audit.md`; the audit doc's high-level route inventory is still broadly correct, with corrections called out below.

## 1. Architectural ground truth

Drupal is the source of truth. Mobile hits `/v1/*` on the Drupal server directly. The Next.js web app is a parallel client that proxies and reshapes some Drupal responses under `/api/*`; mobile should not route through it except as a documented temporary bridge.

The backend is Drupal 11 (`drupal/recommended-project`) with custom modules under `web/modules/custom`:

- `micboxx_music` — catalog, search, dashboard, admin, auth
- `micboxx_commerce_music` — track, album, and subscription checkout
- `micboxx_analytics_music` — analytics projections
- `fever_core_commerce` — payment webhooks and provider abstraction
- `fever_core_entitlements` — entitlement state
- `fever_core_rewards` and `micboxx_rewards` — recognition/badges
- `core_commerce` — commerce primitives
- `fever_core_analytics` — analytics primitives

Key Drupal contrib modules: `simple_oauth` (OAuth2), `search_api` + `search_api_solr` (search), `s3fs` (media storage), `stripe/stripe-php` (payments), `drupal/jsonapi_extras` (available but not used for the primary `/v1/*` surface — `/v1/*` uses custom controllers returning a `{ data: ... }` envelope).

The web app additionally uses Google Firestore for the entire social layer (likes, follows, comments, DMs, notifications, reports, user blocks) and derived read-model projections (`tracks_meta`, `users_meta`, `recommendationCandidates`, `userTasteProfiles`, `trackSignalRollups`). This is a web-only architectural choice today. See §8 for what mobile should do about it.

## 2. Response envelope

Every `/v1/*` custom endpoint returns JSON with a single top-level `data` key:

```json
{ "data": { ... } }
```

Errors return either an HTTP error status with a Drupal-formatted body or, for custom-thrown API errors, an `error` object. Mobile's fetch layer should:

- Treat non-2xx as failure.
- On success, unwrap `data` once before passing to the rest of the app.
- Never assume `data` is an array — list endpoints return `{ data: { tracks: [...], meta: {...} } }`, not `{ data: [...] }`.

## 3. Authentication

OAuth 2.0 via `drupal/simple_oauth`. No session cookies on the Drupal side — authenticated requests carry `Authorization: Bearer {access_token}`.

### Native flow for mobile

1. Start authorization at `GET /oauth/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri={MOBILE_REDIRECT}&scope={SCOPE}&state={STATE}&code_challenge={PKCE_CHALLENGE}&code_challenge_method=S256` (Drupal native).
2. On success Drupal redirects to `{MOBILE_REDIRECT}?code={CODE}&state={STATE}`. Use an Expo deep-link scheme; register it in `app.json` and handle it with `expo-auth-session` or equivalent.
3. Exchange the code: `POST /oauth/token` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, and `code_verifier`. Response is the standard OAuth2 payload: `{ access_token, refresh_token, expires_in, token_type: "Bearer", scope }`.
4. Hydrate the current user by calling `GET /v1/dashboard/upload-options` with the bearer token. The response includes a `currentUser` shape that should be persisted as the `MicboxxSession.user`. Note: the fields this endpoint returns include `canSellCatalog`, which is **not** in the mobile `MicboxxSessionUser` contract (see §10). Add it.
5. On expiry, refresh via `POST /oauth/token` with `grant_type=refresh_token`.
6. On logout, revoke via `POST /oauth/revoke` (from `drupal/simple_oauth_revoke`). The web-only `/v1/auth/logout-start` + `/v1/auth/logout-complete` popup flow is not needed on mobile — it exists only to coordinate a popup window round-trip with the web SPA.

### Registration and pre-auth endpoints

All accept and return JSON, all are unauthenticated, all return a `{ data: ... }` envelope.

| Method | Path                      | Request                                                                             | Returns                                          | Source                                  |
| ------ | ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| POST   | `/v1/auth/register`       | `{ name, username, email, password, confirmPassword, signupIntent, termsAccepted }` | `{ uid, email, signupIntent, message }` HTTP 201 | `RegistrationController::register`      |
| POST   | `/v1/auth/verify`         | `{ uid, code }`                                                                     | `{ verified, user }`                             | `RegistrationController::verify`        |
| POST   | `/v1/auth/resend-code`    | `{ uid }`                                                                           | `{ sent }`                                       | `RegistrationController::resendCode`    |
| POST   | `/v1/auth/check-username` | `{ username }`                                                                      | `{ available, exists }`                          | `RegistrationController::checkUsername` |
| POST   | `/v1/auth/check-email`    | `{ email }`                                                                         | `{ available, exists }`                          | `RegistrationController::checkEmail`    |

### Scopes and OAuth config

Scope string is deployment-configurable on Drupal (the web reads it from the `DRUPAL_OAUTH_SCOPE` env var). Mobile will need its own client credentials in Drupal's `simple_oauth` consumer config, plus the mobile redirect URI allow-listed.

## 4. Public catalog

All public catalog endpoints are unauthenticated (`_access: 'TRUE'`) with one exception marked below. Base path: `/v1/public/*`. Source: `micboxx_music/src/Controller/PublicTrackController.php`, `PublicPlaylistController.php`, `PublicArtistController.php`, `PublicSearchController.php`, registered in `micboxx_music/micboxx_music.routing.yml`.

### Tracks

- `GET /v1/public/tracks?page={n}&pageSize={1..24}&genre={slug}&artistUuid={uuid}` — paginated discovery. Default page 1, pageSize 12, max pageSize 24. Returns `{ data: { tracks: PublicTrackSummary[], genres: PublicGenreOption[], meta: { page, pageSize, total, hasMore, filters: { genre, artistUuids } } } }`.
- `GET /v1/public/tracks/{slug}` — track detail. Returns `{ data: { track: PublicTrack, relatedTracks: PublicTrackSummary[] } }`.
- `GET /v1/public/discover/popular?limit={n}` — popular tracks.
- `GET /v1/public/discover/recently-played?limit={n}` — **authenticated** (`_auth: oauth2`). Despite the `/public/` prefix, this requires a bearer token because "recently played" is per-user. Mobile must supply the Authorization header.
- `POST /v1/public/tracks/{trackId}/analytics/play` — record a play start. Body not required. Returns `{ data: { recorded: true, trackId } }`.
- `POST /v1/public/tracks/{trackId}/analytics/event` — record a playback event (progress, seek, pause, completed). Body: `{ eventType, ...meta }`.

### Albums

- `GET /v1/public/albums?page={n}&pageSize={n}` — paginated.
- `GET /v1/public/albums/{slug}` — detail with tracks and related albums. Returns `{ data: { album: PublicAlbum, tracks: PublicTrackSummary[], relatedAlbums: PublicAlbum[] } }`.

### Genres

- `GET /v1/public/genres`
- `GET /v1/public/genres/{slug}`

### Playlists

- `GET /v1/public/playlists?page={n}&pageSize={n}`
- `GET /v1/public/playlists/{slug}` — returns `{ data: { playlist: PublicPlaylist, tracks: (PublicTrackSummary & { position: number })[], relatedPlaylists: PublicPlaylist[] } }`.

### Artists / Users

- `GET /v1/public/users/{username}` — public artist page. Returns `{ data: { artist: PublicArtist & { counts: { tracks, albums, playlists, followers, following } }, tracks: PublicTrackSummary[], albums: PublicAlbum[], playlists: PublicPlaylist[], meta: { hasPublicContent, totals: { tracks, albums, playlists } } } }`.

### Search

- `GET /v1/public/search?q={query}&limit={n}` — Solr-backed grouped search. Returns `{ data: { query, results: { tracks, albums, playlists, artists, genres }, meta: { hasResults, totals } } }`. Individual results are summary shapes, not full detail.

### Recognition / badges

- `GET /v1/public/recognition/{user_uuid}` — public recognition view (`micboxx_rewards` module).

## 5. Creator dashboard

Base path: `/v1/dashboard/*`. Auth: bearer token with `_permission: 'upload tracks'` unless noted. Source: `DashboardTrackController.php`, `DashboardAlbumController.php`, `DashboardPlaylistController.php`.

### Tracks

| Method | Path                                        | Purpose                                               |
| ------ | ------------------------------------------- | ----------------------------------------------------- |
| GET    | `/v1/dashboard/tracks`                      | List current user's tracks (paginated)                |
| GET    | `/v1/dashboard/upload-options`              | Upload form options + hydrates `currentUser` at login |
| POST   | `/v1/dashboard/tracks`                      | Create track (multipart: metadata + source audio)     |
| GET    | `/v1/dashboard/tracks/{track}/status`       | Poll processing state                                 |
| POST   | `/v1/dashboard/tracks/{track}/requeue`      | Retry failed processing                               |
| PATCH  | `/v1/dashboard/tracks/{track}`              | Update metadata (JSON body)                           |
| POST   | `/v1/dashboard/tracks/{track}/artwork`      | Replace artwork (multipart)                           |
| POST   | `/v1/dashboard/tracks/{track}/source-audio` | Replace source audio (multipart)                      |
| POST   | `/v1/dashboard/tracks/{track}/publish`      | Publish                                               |
| POST   | `/v1/dashboard/tracks/{track}/unpublish`    | Unpublish                                             |
| GET    | `/v1/dashboard/analytics/summary`           | Creator analytics dashboard data                      |

Track processing is asynchronous. POST `/v1/dashboard/tracks` returns immediately; Drupal enqueues a `micboxx_music_track_processing` job that transcodes, generates waveforms, and stores assets on S3. Clients must poll `/v1/dashboard/tracks/{track}/status` until `processing === 'ready'`. Returned `status` shape: `{ published, processing: 'pending'|'processing'|'ready'|'failed', error, attempts, processedAt, ready, canRetry, canRequeue, canPublish, canUnpublish, maxAttempts }`.

### Albums

`/v1/dashboard/albums/options`, `/v1/dashboard/albums` (GET, POST), `/v1/dashboard/albums/{album}` (GET, PATCH, DELETE), `/v1/dashboard/albums/{album}/artwork` (POST), `/v1/dashboard/albums/{album}/publish` (POST), `/v1/dashboard/albums/{album}/unpublish` (POST).

### Playlists

`/v1/dashboard/playlists/options`, `/v1/dashboard/playlists` (GET, POST), `/v1/dashboard/playlists/{playlist}` (GET, PATCH, DELETE), `/v1/dashboard/playlists/{playlist}/artwork` (POST), `/v1/dashboard/playlists/{playlist}/publish`/`/unpublish` (POST), plus member management: `POST /v1/dashboard/playlists/{playlist}/members` (add), `DELETE /v1/dashboard/playlists/{playlist}/members/{track}` (remove), `POST /v1/dashboard/playlists/{playlist}/members/reorder` (reorder).

## 6. Commerce

Base path: `/v1/dashboard/commerce/*` for authenticated flows, `/v1/public/commerce/*` for plan browsing. Source: `micboxx_commerce_music/src/Controller/*CheckoutController.php`, `fever_core_commerce` for payment webhooks.

| Method | Path                                                                | Purpose                                      |
| ------ | ------------------------------------------------------------------- | -------------------------------------------- |
| GET    | `/v1/public/commerce/subscription-plans`                            | List available plans (unauthenticated)       |
| POST   | `/v1/dashboard/commerce/tracks/{track}/checkout-quote`              | Generate a track price quote                 |
| POST   | `/v1/dashboard/commerce/tracks/{track}/checkout-session`            | Create a Stripe Checkout session for a track |
| GET    | `/v1/dashboard/commerce/tracks/{track}/purchase-access`             | Check if current user owns the track         |
| POST   | `/v1/dashboard/commerce/albums/{album}/checkout-quote`              | Album price quote                            |
| POST   | `/v1/dashboard/commerce/albums/{album}/checkout-session`            | Album Checkout session                       |
| GET    | `/v1/dashboard/commerce/albums/{album}/purchase-access`             | Album ownership check                        |
| POST   | `/v1/dashboard/commerce/subscription-plans/{plan}/checkout-quote`   | Subscription quote                           |
| POST   | `/v1/dashboard/commerce/subscription-plans/{plan}/checkout-session` | Subscription Checkout session                |
| GET    | `/v1/dashboard/commerce/entitlements/current`                       | Current entitlement state                    |

### Checkout request and response

Checkout requests accept an `Idempotency-Key` header or an `idempotencyKey` body field to deduplicate orders. Mobile should generate a UUIDv4 per checkout attempt and reuse it across retries.

Response envelope (from `TrackCheckoutController::createSession`):

```json
{
  "data": {
    "mode": "track_single" | "album_single" | "subscription_single",
    "reused": false,
    "order": { "id", "uuid", "status", "currency", "totals": {...}, "provider": {...}, "idempotencyKey", "timestamps": {...} },
    "line": { "id", "uuid", "sellableKey", "sellableType", "sellableId", "sellableUuid", "fulfillmentAdapter", "quantity", "currency", "unitPrice", "lineSubtotal", "discountTotal", "lineTotal", "snapshotTitle", "snapshotSku" },
    "sellable": { "key", "type", "id", "uuid", "sku", "title", "currency", "unitAmount", "quantityMode", "fulfillmentAdapter", "sellerAccountId", "metadata" },
    "provider": { "name": "stripe", "enabled": true, "checkoutReady": true, "sessionMode", "reason": null },
    "session": { "id": "cs_...", "url": "https://checkout.stripe.com/...", "status", "paymentStatus", "mode" }
  }
}
```

On mobile, open `session.url` in an in-app browser (`expo-web-browser`) or a custom `<WebView>` with a completion-URL handler. After the user returns to the app, call `purchase-access` to confirm the grant landed.

**Never execute the actual payment from the mobile client** — Drupal drives the entire Stripe flow and finalizes via the webhook at `/v1/commerce/payments/{provider}/webhook`. Mobile's job is to request a session, hand off to Checkout, and confirm access afterward.

Prices ship as decimal strings (e.g. `"9.99"`), not floats. Do not coerce to `number` for display — parse with a decimal library or format the string directly.

## 7. Admin moderation

`/v1/admin/*`. Auth: `_permission: 'administer tracks'` or `'administer albums'`. Source: `AdminModerationController.php`. Tracks: `GET /v1/admin/tracks`, `POST /v1/admin/tracks/{track}/publish`, `POST /v1/admin/tracks/{track}/unpublish`. Albums: mirror those. Users: `GET /v1/admin/users`, `POST /v1/admin/users/{user}/block`, `POST /v1/admin/users/{user}/unblock`.

Not mobile-critical for v1 but worth including for parity with web admin tools if the mobile app ever grows an admin surface.

## 8. What does NOT exist in Drupal today

These are features that either exist only on the web (backed by Firestore) or do not exist at all. Mobile needs explicit decisions for each, because the "just hit `/v1/*`" rule cannot apply to things that have no `/v1/*` endpoint.

### Recommendations

Drupal has `/v1/public/discover/popular` and `/v1/public/discover/recently-played`, but the personalized "For You" surface lives only on the web as `GET /api/recommendations/for-you`, and its implementation uses Firestore (`recommendationCandidates/{uid}/tracks`) as input, Drupal as a track-detail source, and a web server to mix lanes.

Mobile has three options:

1. **Temporary bridge.** Mobile calls the web's `GET /api/recommendations/for-you` with its Drupal bearer token. The web route currently reads the session from a cookie, so this would need a bearer-token auth path added to the Next.js route — the exact same pattern we just applied to `POST /api/social/auth/token`. Cheap and consistent with the social-auth decision; entrenches the web dependency but matches existing precedent.
2. **Native `/v1/public/discover/for-you` on Drupal** that consumes the same Firestore collections directly from PHP, or ports the recommendation logic to Drupal entirely. Cleaner, but requires new server work in `micboxx_music`.
3. **Ship without personalized recommendations** on mobile v1. Use `discover/popular` and genre browses for the "For You" surface, add personalization later.

Leaning option 1 by analogy to the social-auth decision, but not yet committed. Ticket it before wiring the mobile recommendations UI. The `For You` contract envelope is the same in all three cases, so mobile can wire the UI against the shape now.

### Social layer (likes, follows, comments, DMs, notifications)

Drupal has **no** endpoints for these. The web implements them entirely in Firestore, with the Next.js API route `POST /api/social/auth/token` minting a Firebase custom token from the web's Drupal-backed session cookie so browser code can write to Firestore under strict rules.

**Decision (2026-04-09): mobile will reuse the existing web route by expanding it to accept a Drupal bearer token in addition to the session cookie.** No new Drupal endpoint, no Firebase admin credentials on the mobile side, no port of the social layer to Drupal. Drupal stays the source of truth for identity, the web stays the sole minter of Firebase custom tokens, Firestore stays the social data store, and the `firestore.rules` ownership checks continue to gate everything.

Concretely:

- `POST https://{WEB_BASE_URL}/api/social/auth/token` now accepts **either** the existing `micboxx-session` cookie (web SPA path, unchanged) **or** an `Authorization: Bearer {drupal_access_token}` header (new mobile path).
- The bearer path validates the token by calling Drupal's `GET /v1/dashboard/upload-options` via `getDashboardBootstrapUser(bearer)`. That throws on any auth failure, which the route translates to `401 { error: { code: "not_authenticated" } }`. On success it pulls the Drupal user UUID out of the bootstrap response and mints a Firebase custom token with `createFirebaseSocialCustomToken(uuid)`, returning `{ data: { token, uid } }`. Firebase issuance failures surface as `503 { error: { code: "firebase_token_issuance_failed" } }`.
- The cookie path is untouched — no regression risk for the web SPA.
- Mobile calls this route once per app session (and whenever the Drupal access token rotates), hands the returned custom token to `signInWithCustomToken()` in the Firebase client SDK, and then reads/writes Firestore under the existing rules.
- The mobile fetch layer's base URL points to Drupal for `/v1/*`, but the Firebase-token request goes to the **web** base URL. Both must be configurable — see §15 item 4.

Rejected alternatives (recorded for future reference):

1. **New Drupal endpoint (`POST /v1/social/auth/firebase-token`).** Would duplicate the web's Firebase Admin SDK work inside Drupal as either a PHP `kreait/firebase-php` dependency or an HTTP shell-out, plus a new custom controller, route, permission, service-account secret in `settings.php`, and tests. Pure cost, zero behavioral benefit — the web already has a working, tested minter.
2. **Port the social layer to Drupal.** `likes`, `follows`, `comments`, `messages`, `reports`, `blocks` become `/v1/*` endpoints backed by Drupal entities. More consistent with the "Drupal is source of truth" rule, but a large amount of server work and loses the real-time listeners Firestore provides. Re-visit post-v1 if Firestore ops cost or latency becomes a problem.
3. **Ship mobile without the social layer.** Likes, follows, comments, DMs, notifications are absent from mobile v1. Ruled out — the social layer is core to the product.

### Firestore schema reference

The rules in `micboxx-web/firestore.rules` are the canonical source. Key collections and doc-ID conventions mobile needs to know:

- `trackLikes/{trackId}_{userUid}` — single underscore, ownership by `ownerUid`, allowed fields: `trackId, ownerUid, trackOwnerUid, createdAt, actorUsername, actorDisplayName, trackTitle, trackHref`.
- `trackFavorites/{trackId}_{userUid}` — same shape as likes.
- `follows/{followerUid}_{followeeUid}` — single underscore, allowed fields: `followerUid, followeeUid, createdAt, actorUsername, actorDisplayName, actorHref`. Cannot self-follow.
- `trackComments/{commentId}` — `{ authorUid, authorUsername, authorDisplayName, trackId, subjectType: 'music.track', subjectKey: 'music.track:{trackId}', trackOwnerUid, trackTitle, trackHref, body (≤2000 chars), status: 'active'|'deleted', createdAt, updatedAt, editedAt?, deletedAt? }`. Author can soft-delete by flipping status; no hard delete.
- `conversations/{conversationId}` — **double underscore** ID format `uidA__uidB` with `uidA < uidB` lexicographically. Fields: `type: 'direct', participantUids: [uidA, uidB], participantUsernames, participantDisplayNames, participantHrefs, createdAt, updatedAt`. Creation blocked if either side has blocked the other.
- `conversations/{conversationId}/messages/{messageId}` — `{ senderUid, senderUsername, senderDisplayName, body (≤4000 chars), status: 'active', createdAt, updatedAt }`. Senders cannot edit or delete.
- `userConversations/{userUid}/items/{conversationId}` — per-user inbox rollups. Owner can only update `unreadCount`, `lastReadAt`, `updatedAt`, and `unreadCount` must go to 0 (client acknowledges reads).
- `userBlocks/{userUid}/targets/{blockedUid}` — block list, owner-writable.
- `socialReports/{reportId}` — abuse reports. `targetType in ['track_comment','direct_message']`, `reasonKey in ['harassment','spam','hate','sexual_content','copyright','other']`, `status: 'open'` at create. Only the reporter can read.
- `notifications/{notificationId}` — server-written, owner-readable, owner can only update `isRead`, `readAt`, `seenAt`, `updatedAt`.
- `tracks_meta/{trackId}`, `users_meta/{userUid}`, `trackSignalRollups/{trackId}` — **globally readable** aggregated counts. Use these for display, not for ownership checks.
- `userTasteProfiles/{uid}` — owner-readable only, server-written.
- `recommendationCandidates/{uid}/tracks/{trackId}` — owner-readable only, server-written. Input to the recommendations lane mixer.

All timestamps in Firestore are Firestore `Timestamp` objects at rest; the web reads them as ISO strings via `firebase-admin`. Mobile using the Firebase client SDK will get `Timestamp` instances and needs to convert to `Date`/ISO for the existing contract types.

### Notifications (separately)

There are no Drupal endpoints for notifications. The web reads `notifications/{notificationId}` from Firestore directly. Mobile uses the same bridge as the rest of the social layer — after `signInWithCustomToken()` succeeds, it listens to the Firestore `notifications` collection filtered by `ownerUid == currentUid`. No additional server work needed.

## 9. Phantom routes (bugs in the current state)

- **`GET /v1/public/tracks/batch`** — called by `micboxx-web/src/lib/drupal-public.ts:476` but does not exist in any `routing.yml` in `micboxx-server/web/modules/custom/`. The only `batch` references on the server are private helper methods inside controllers. This is a web bug — either that code path never runs, or it fails at runtime. Mobile should **not** use this endpoint. If batch track lookup is needed, iterate single GETs or add the route on the server.
- The existing `docs/micboxx-mobile-api-contract-audit.md` lists this route in the "stable contracts" section. That line is wrong; this document supersedes it.

## 10. Mobile contract diff

`src/contracts/micboxx.ts` is broadly correct for the shapes it covers, but is missing whole domains and has a few small drift issues.

### Matches (keep as-is)

`MicboxxSessionUser`, `MicboxxSession`, `PublicTrackAccess`, `PublicTrackCommerce`, `PublicArtistSummary` (at the summary level), `PublicTrackSummary`, `PublicAlbumSummary` (at the summary level), `PublicPlaylist` (field set), `PublicSearchResults`, `PublicTrackPage`, `PublicAlbumPage`, `PublicArtistPage`, `PublicPlaylistPage`, `PublicTrackList`.

### Drift to fix

1. **`PublicTrack.assets` is missing `waveforms`.** The real server response includes `assets.waveforms: { light: string | null, dark: string | null, day: string | null }`. Mobile needs these if it ever shows waveform scrubbers or themed audio visualizations.

   ```ts
   assets: {
     artworkUrl: string | null;
     audioUrl: string | null;
     fullAudioUrl?: string | null;
     premiumAudioUrl?: string | null;
     demoAudioUrl: string | null;
     waveforms: {                // add
       light: string | null;
       dark: string | null;
       day: string | null;
     };
   };
   ```

2. **`PublicAlbumSummary` is missing `timestamps` and `uuid`.** The server returns `{ createdAt, updatedAt }` on every album and the album `uuid`. Add them:

   ```ts
   export interface PublicAlbumSummary {
     id: number;
     uuid: string; // add
     // ...existing...
     timestamps: {
       // add
       createdAt: string;
       updatedAt: string;
     };
   }
   ```

3. **`PublicPlaylist` is missing `timestamps`.** Same fix shape.

4. **`MicboxxSessionUser.permissions` is missing `canSellCatalog`.** The web's `DashboardCurrentUser` (what `/v1/dashboard/upload-options` actually returns for the current user hydration) includes `canSellCatalog: boolean`. Mobile will need it for any "sell your track" surfacing.

5. **`ForYouResponse` is correct.** Earlier confusion: the web agent's report quoted the internal `ForYouResult` type from `src/lib/recommendations.ts`, which has `personalized` and `servedBatchId` at the root. The actual wire format at `GET /api/recommendations/for-you/route.ts` line 26–46 re-shapes it into `{ data: { items, nextCursor, surface, meta: { algorithmVersion, totalItems, personalized, servedBatchId } } }`, which is exactly what the mobile contract expects. No change needed. Be aware of this split whenever reading web code: **internal lib types ≠ wire format** in several places.

### Entire domains missing

Add these to `src/contracts/micboxx.ts` (or split into `src/contracts/commerce.ts`, `src/contracts/dashboard.ts`, `src/contracts/social.ts` for cleanliness):

**Commerce** — import or mirror these from `micboxx-web/src/lib/micboxx-commerce.ts`:

`CommerceProviderState`, `CommerceOrderPayload`, `CommerceOrderLinePayload`, `CommerceSellablePayload`, `CommerceCheckoutSessionPayload`, `TrackCheckoutSessionResponse`, `AlbumCheckoutSessionResponse`, `SubscriptionCheckoutSessionResponse`, `TrackPurchaseAccessState`, `AlbumPurchaseAccessState`, `PublicSubscriptionPlan`, `EntitlementPlanState`, `EntitlementPeriodState`, `EntitlementState`.

**Creator dashboard** — from `micboxx-web/src/lib/drupal-dashboard.ts`:

`DashboardCurrentUser`, `DashboardTrack`, `DashboardAlbum`, `DashboardPlaylist`, `DashboardAlbumTrack`, `DashboardPlaylistTrack`.

**Registration / pre-auth** — there are no shared types today, but the request bodies and responses in §3 are stable enough to declare.

**Social (only if option 1 from §8 is chosen)** — from `micboxx-web/src/lib/firebase-social.ts`:

`TrackComment`, `SocialNotification`, `DirectConversation`, `DirectMessage`, `SocialReport`, plus the enum unions `TrackCommentStatus`, `SocialNotificationType`, `DirectMessageStatus`, `SocialReportTargetType`, `SocialReportStatus`, `SocialReportReasonKey`.

## 11. Playback authorization

The existing audit doc lists "playback authorization for premium and demo audio switching" as a gap. The **contract** is not a gap — it's already on the track response:

- `PublicTrack.playback.mode` — current playback mode
- `PublicTrack.playback.isDemoOnly` — true when only a demo clip is available
- `PublicTrack.playback.locked` — true when the full track is gated
- `PublicTrack.playback.hasPremiumPlayback` — true when there's a premium variant
- `PublicTrack.assets.audioUrl` — default audio URL based on the requesting user's access
- `PublicTrack.assets.fullAudioUrl` — full-length audio when the user has access
- `PublicTrack.assets.premiumAudioUrl` — premium variant (subscriber-only)
- `PublicTrack.assets.demoAudioUrl` — fallback demo clip
- `PublicTrack.access` — `{ locked, requiredCapability, planKey }` — what the user would need to unlock

Drupal decides which URL to populate based on the requesting user's entitlements. A signed-out user gets the demo URL in `audioUrl`; a subscriber gets the full URL in `audioUrl` (and possibly `premiumAudioUrl`).

What is a gap: the mobile **client-side flow** for choosing which URL to play, what to do on a 401, and how to reconcile with locally cached queues after an entitlement change. That is a mobile-domain concern, not a server-contract concern — design it in the player feature module, not in the contracts layer.

## 12. Analytics / telemetry

Public play events: `POST /v1/public/tracks/{trackId}/analytics/play` and `/analytics/event`. Mobile's existing analytics stubs in the player provider should fire these. The event-body shape is not strictly typed on the server — it accepts a JSON object with at least `eventType`. Agree on the mobile event vocabulary in the playback spec and mirror what the web sends.

Internal sync endpoints `POST /v1/internal/public-stats/track` and `/artist` are **not** for client use — they carry no auth and are meant for internal cron/queue consumers. Do not call from mobile.

## 13. Gotchas and conventions

- **Decimal prices are strings.** `"9.99"`, not `9.99`. Do not JSON.parse into a number path.
- **Durations are integers in seconds**, not milliseconds.
- **Timestamps on the wire are ISO 8601 strings in GMT** (from Drupal `DateTimePlus::formatTimezone()`). Parse with `new Date()` but don't assume local TZ.
- **Pagination shape is `{ page, pageSize, total, hasMore, filters }`** on list endpoints, nested under `meta`. Some endpoints also include a `filters` block echoing applied query params.
- **Identifiers come in three flavors:** numeric `id` (Drupal entity id), string `uuid` (stable across migrations), and string `slug` (URL-safe). Use `uuid` for any cross-collection reference (e.g., artist UUIDs for filtering). Use `slug` for user-facing URLs. `id` is Drupal-internal and can change under certain migrations.
- **Artist lookup is by `username`, not `uuid`** (`/v1/public/users/{username}`). Consistent with Drupal account naming.
- **Search requires Solr.** Local dev that skips Solr will fall back to filtered database queries with reduced relevance.
- **`_auth: oauth2` is the Drupal way to require a bearer token**, not middleware. If a route omits this option, Drupal will not attempt token validation even if the route otherwise checks permissions. `discover/recently-played` is the only public-prefixed route with this flag — watch for it.
- **Next.js 16 App Router `params` is async.** If mobile ever debugs the web proxy routes, note that `{ params }: { params: Promise<{ trackId: string }> }` is the real signature — the older sync-params shape will not work. This matches the `AGENTS.md` warning in `micboxx-web`.
- **The route layer pattern `{ data: {...} }` envelope is per-module.** JSON:API (`jsonapi_extras`) is installed but not used for the primary `/v1/*` surface. Do not accidentally hit `/jsonapi/*` routes expecting the same shapes.

## 14. Recommended mobile fetch layer shape

Given the above, a clean mobile data-access layout:

```
src/services/
  micboxxClient.ts        // thin fetch wrapper: base URL, bearer header, { data } unwrap, error envelope
  auth.ts                 // OAuth2 PKCE: authorize(), exchangeCode(), refresh(), revoke()
  publicCatalog.ts        // wraps /v1/public/*
  dashboard.ts            // wraps /v1/dashboard/*
  commerce.ts             // wraps /v1/dashboard/commerce/* and /v1/public/commerce/*
  analytics.ts            // wraps /v1/public/tracks/{id}/analytics/*
  // recommendations.ts   // deferred — see §8
  // social.ts            // deferred — see §8
```

Each service module imports typed shapes from `src/contracts/*` and returns already-unwrapped `data`. RTK Query (already wired) or React Query (mentioned in the architecture plan) calls these services.

## 15. Decisions needed before mobile implementation proceeds

1. **Recommendations strategy.** Bridge via web, add Drupal endpoint, or defer. See §8. **Status:** open. Leaning "bridge via web" for symmetry with the social-auth decision.
2. **Social layer strategy.** See §8. **Status: decided 2026-04-09.** Mobile uses the existing web route `POST /api/social/auth/token` — the route has been expanded to accept `Authorization: Bearer {drupal_access_token}` in addition to the session cookie. Mobile exchanges the custom token for a Firebase session via `signInWithCustomToken()` and works directly against Firestore under the existing rules.
3. **Notifications strategy.** Tied to #2. **Status: decided 2026-04-09.** Same bridge — mobile reads `notifications/{notificationId}` from Firestore directly once signed in, same as the web client.
4. **Mobile OAuth client and environment.** Partially resolved 2026-04-09.
   - Production Drupal base URL: **`https://api.micboxx.com`** (confirmed). Mobile hits `/v1/*` here.
   - Production web base URL: **`https://www.micboxx.com`** (confirmed). Mobile hits `/api/social/auth/token` here.
   - **Status:** the mobile consumer now exists in Drupal `simple_oauth`. Keep the client ID/env wiring below aligned with the live server-side configuration so mobile can continue using the PKCE flow end to end.

   Drupal `simple_oauth` consumer to create (action for Darrell):

   | Field            | Value                                                                                                                                                                          |
   | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | Label            | `MicBoxx Mobile`                                                                                                                                                               |
   | Client ID        | `micboxx-mobile` (or any stable slug — mobile will read it from env)                                                                                                           |
   | Client Secret    | **none** — public client, PKCE-only                                                                                                                                            |
   | Is confidential? | **unchecked**                                                                                                                                                                  |
   | Scopes           | `micboxx:dashboard` (same as web) plus whatever user scope(s) the web consumer uses                                                                                            |
   | Grant types      | `authorization_code`, `refresh_token`                                                                                                                                          |
   | Redirect URIs    | `micboxx://auth/callback` on the consumer; Expo Go returns through `/v1/auth/mobile-callback`, which reads `appReturnUri` from OAuth `state` and hands back to the running app |
   | PKCE             | **required** — confirm `simple_oauth.settings` enforces PKCE for public clients, or enforce it on this specific consumer                                                       |
   | User             | a service user account with the minimum roles needed to own the consumer (not tied to a real human)                                                                            |

   Once the consumer is created, paste the `client_id` into the mobile `.env` / EAS secrets and the PKCE flow is ready to go.

5. **Contract diffs.** Apply the fixes in §10 so the contract file is source-of-truth-accurate before any service layer is written against it. **Status:** open.
6. **Secret rotation.** The `micboxx-web/.env.local` file checked into the local dev environment contains **live** Stripe keys (`sk_live_...`, `pk_live_...`, `whsec_...`) and a real Firebase Admin service-account private key (`micboxx-98bb6` project). Those are production credentials and should not be in a dev env file. Rotate them before the mobile app ships, and move them to a secret store Drupal/Next.js/mobile read from at runtime. Mobile must never ship the Firebase Admin key — that's the entire reason the custom-token minter stays server-side.

## 16. Source citations

- Routing: `micboxx-server/web/modules/custom/micboxx_music/micboxx_music.routing.yml`, `.../micboxx_commerce_music/micboxx_commerce_music.routing.yml`, `.../fever_core_commerce/fever_core_commerce.routing.yml`, `.../micboxx_rewards/micboxx_rewards.routing.yml`, `.../fever_core_rewards/fever_core_rewards.routing.yml`
- Controllers: `micboxx-server/web/modules/custom/micboxx_music/src/Controller/` — `PublicTrackController.php`, `PublicArtistController.php`, `PublicPlaylistController.php`, `PublicSearchController.php`, `DashboardTrackController.php`, `DashboardAlbumController.php`, `DashboardPlaylistController.php`, `AdminModerationController.php`, `RegistrationController.php`, `OAuthLogoutController.php`, `InternalPublicStatsSyncController.php`
- Commerce controllers: `micboxx-server/web/modules/custom/micboxx_commerce_music/src/Controller/TrackCheckoutController.php`, `AlbumCheckoutController.php`, `SubscriptionCheckoutController.php`
- Web API layer: `micboxx-web/src/lib/drupal-public.ts`, `drupal-dashboard.ts`, `drupal-oauth.ts`, `drupal-registration.ts`, `micboxx-commerce.ts`, `firebase-social.ts`, `recommendations.ts`, `micboxx-session-token.ts`, `micboxx-session.ts`
- Web API routes: `micboxx-web/src/app/api/**`
- Firestore rules: `micboxx-web/firestore.rules`
- Mobile contracts: `micboxx-mobile/src/contracts/micboxx.ts`
- Existing mobile docs: `micboxx-mobile/docs/micboxx-mobile-api-contract-audit.md`, `micboxx-mobile-architecture-plan.md`
