# MicBoxx Mobile API Contract Audit

Date: 2026-04-08

## Stable contracts already visible in web/server

### Auth

- `POST /oauth/token`
- `POST /oauth/revoke`
- `GET /v1/dashboard/upload-options`
- `POST /v1/auth/register`
- `POST /v1/auth/verify`
- `POST /v1/auth/resend-code`
- `POST /v1/auth/check-username`
- `POST /v1/auth/check-email`

### Public catalog

- `GET /v1/public/tracks`
- `GET /v1/public/tracks/:slug`
- `GET /v1/public/tracks/batch`
- `GET /v1/public/albums`
- `GET /v1/public/albums/:slug`
- `GET /v1/public/playlists`
- `GET /v1/public/playlists/:slug`
- `GET /v1/public/users/:username`
- `GET /v1/public/genres`
- `GET /v1/public/genres/:slug`
- `GET /v1/public/search`
- `GET /v1/public/discover/popular`
- `GET /v1/public/discover/recently-played`

### Recommendation bridge

- `GET /api/recommendations/for-you` from `micboxx-web`

This is acceptable as a transitional mobile dependency, but it should eventually become a first-class platform contract instead of staying web-owned.

### Commerce

- `POST /api/dashboard/commerce/tracks/:trackId/checkout-session`
- `GET /api/dashboard/commerce/tracks/:trackId/purchase-access`
- `POST /api/dashboard/commerce/albums/:albumId/checkout-session`
- `GET /api/dashboard/commerce/albums/:albumId/purchase-access`
- `POST /api/dashboard/commerce/subscription-plans/:planId/checkout-session`
- `GET /api/dashboard/commerce/entitlements/current`

## Gaps to close before deeper mobile rollout

- Stable recommendation endpoint outside the web app
- Native-safe auth callback and logout contract docs
- Playback authorization contract for premium and demo audio switching
- Notification and messaging APIs
- Download authorization and offline license policy

## Recommendation

Treat public catalog, auth, and entitlement payloads as mobile-ready now. Treat recommendations, notifications, messaging, and offline playback as contract-hardening workstreams before large feature expansion.
