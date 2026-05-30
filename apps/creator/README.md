# MicBoxx Creators

MicBoxx Creators is the native creator operations client for the same platform contracts used by `../micboxx-web` and `../micboxx-server`.

The app is scaffolded with Expo SDK 54, Expo Router, React Native 0.81, and React 19. The codebase is organized around mobile domain slices instead of web UI parity:

- `src/app`: file-based routes and navigation shells
- `src/contracts`: shared platform contract types derived from MicBoxx web/server surfaces
- `src/features`: auth, bootstrap, dashboard, catalog, create, audience, account, and shared social modules
- `src/components`: reusable UI primitives and shared media components kept from the mobile fork
- `docs`: scaffold and verification notes

## Environment

Create a local `.env` from `.env.example` and fill in the Drupal and optional web proxy values:

```bash
cp .env.example .env
```

Required for live API calls:

- `EXPO_PUBLIC_DRUPAL_BASE_URL`
- `EXPO_PUBLIC_DRUPAL_OAUTH_CLIENT_ID`
- `EXPO_PUBLIC_DRUPAL_OAUTH_SCOPE`

Optional but useful during rollout:

- `EXPO_PUBLIC_MICBOXX_WEB_BASE_URL`
- `EXPO_PUBLIC_CREATOR_FIXTURE_SCENARIO`

If live Drupal auth values are missing, the app falls back to creator fixture data so routing, onboarding, catalog, create, account, and audience flows can still be verified locally.

## Runtime

MicBoxx mobile is currently validated on Node `24.14.0`.

- Repo pinning files: `.nvmrc` and `.node-version`
- Supported local range: Node `24.x`
- Unsupported for local Expo work: Node `25.x`

If you use `nvm`, switch into the pinned runtime before running Expo:

```bash
nvm use
```

The repo also guards Expo commands and will fail fast on unsupported Node versions instead of failing later inside Expo.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm run ios
```

## Verification

Use fixture mode when you need a stable local creator-validation surface that does not depend on live API data:

```bash
npm run web:fixtures
```

For the pinned localhost verification route:

```bash
npm run verify:web
```

That boots the app in fixture mode on `http://localhost:3016` using the default `creator_ready` fixture scenario.

Scenario-specific verification commands:

```bash
npm run verify:web:creator-ready
npm run verify:web:needs-profile
npm run verify:web:needs-album
npm run verify:web:needs-track
npm run verify:web:non-creator
npm run verify:web:failed-processing
```

These let you verify creator-only routing, onboarding gates, album-first create behavior, non-creator blocking, and failed-processing recovery without touching live auth.

## Notes

- OAuth remains native PKCE against Drupal, with secure token storage via `expo-secure-store`.
- Creator fixture mode is meant to verify everything except live OAuth correctness; use live env values when you need to manually prove auth callback and session restoration.
- The app currently keeps some shared mobile/player substrate from the fork for compatibility, even though the creator shell is not playback-first.
