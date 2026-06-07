# MicBoxx Apps

Monorepo for MicBoxx mobile applications, built with Expo SDK 54, React Native 0.81, and React 19.

## Structure

```
micboxx-apps/
├── apps/
│   ├── consumer/      # MicBoxx listener/consumer app (com.micboxx.mobile)
│   └── creator/       # MicBoxx creator/artist app (com.micboxx.creators)
├── packages/          # Shared internal packages (Phase 2)
└── ...
```

## Apps

| App | Directory | Bundle ID | Description |
|---|---|---|---|
| **Consumer** | `apps/consumer/` | `com.micboxx.mobile` | Music discovery, streaming, social features |
| **Creator** | `apps/creator/` | `com.micboxx.creators` | Artist dashboard, catalog management, uploads, analytics |

## Getting Started

```bash
# Install all workspace dependencies
npm install

# Start the consumer app
npm run start:consumer

# Start the creator app
npm run start:creator
```

## Requirements

- Node.js 24.x (see `.nvmrc`)
- Expo CLI (`npx expo`)
- EAS CLI for builds (`npx eas-cli`)

## Workspaces

This monorepo uses [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces). All apps and packages are linked automatically on `npm install`.

### Running workspace commands

```bash
# Run a script in a specific workspace
npm run <script> --workspace=@micboxx/consumer
npm run <script> --workspace=@micboxx/creator

# Run across all workspaces
npm run <script> --workspaces --if-present
```

## Production Builds

Production builds are run through EAS from the app directory, with a root
wrapper that typechecks the target workspace first and pins the production
profile/platform explicitly.

```bash
# Consumer app
npm run build:consumer:ios
npm run build:consumer:android
npm run build:consumer

# Creator app
npm run build:creator:ios
npm run build:creator:android
npm run build:creator
```

The platform-specific commands are safest for store release work. The commands
without a platform suffix use EAS `--platform all`.

Before release, make sure each app has production EAS environment values for:

- `EXPO_PUBLIC_DRUPAL_BASE_URL`
- `EXPO_PUBLIC_DRUPAL_OAUTH_CLIENT_ID`
- `EXPO_PUBLIC_DRUPAL_OAUTH_SCOPE`
- any app-specific Firebase, Sentry, LiveKit, or OAuth callback secrets managed
  outside this repository
