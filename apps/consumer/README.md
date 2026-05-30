# MicBoxx Mobile

MicBoxx mobile is the native listening and discovery client for the same platform contracts used by `../micboxx-web` and `../micboxx-server`.

The app is scaffolded with Expo SDK 54, Expo Router, React Native 0.81, and React 19. The codebase is organized around mobile domain slices instead of web UI parity:

- `src/app`: file-based routes and navigation shells
- `src/contracts`: shared platform contract types derived from MicBoxx web/server surfaces
- `src/features`: auth, catalog, recommendations, and player domain modules
- `src/components`: reusable UI primitives and media cards
- `docs`: product scope, architecture, API audit, playback, and navigation docs

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

If environment values are missing, the app falls back to local fixture data so navigation and layout still work.

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

Use fixture mode when you need a stable local route-validation surface that does not depend on live API data:

```bash
npm run web:fixtures
```

For the launch verification pass, use the pinned localhost route:

```bash
npm run verify:web
```

That boots the app in fixture mode on `http://localhost:3016` for repeatable route-by-route checks.

## Notes

- OAuth is structured for native PKCE against Drupal, with secure token storage via `expo-secure-store`.
- Recommendations are expected to come from the MicBoxx web recommendation surface until Drupal exposes a stable mobile-first contract.
- Playback architecture is intentionally separated from screen code so background audio, queue persistence, lock screen controls, and downloads can evolve without rewriting the UI tree.
