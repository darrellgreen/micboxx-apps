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
npm run dev:consumer

# Start the creator app
npm run dev:creator
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
