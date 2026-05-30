# MicBoxx Mobile Architecture Plan

Date: 2026-04-08

## Principles

- Reuse contracts, not UI
- Keep Drupal authoritative
- Keep playback isolated from route components
- Keep event vocabulary aligned with web
- Prefer mobile domain modules over generic helpers

## Application layers

### Route layer

Expo Router owns navigation in `src/app`. Route files stay thin and use feature hooks or services.

### Feature layer

Feature modules live under `src/features`:

- `auth`
- `catalog`
- `recommendations`
- `player`
- `library`

Each feature owns:

- data access
- domain hooks
- view models
- storage concerns when needed

### Contract layer

`src/contracts` mirrors stable cross-platform payloads from web and Drupal:

- session user
- public track and album payloads
- artist and playlist payloads
- recommendation response envelope
- commerce and entitlement fragments needed for listener flows

### Platform services

- `expo-secure-store` for auth state
- `AsyncStorage` for queue persistence and listener preferences
- React Query for remote cache policy
- Expo Router deep linking for auth callbacks and public content links

## State boundaries

- Auth session: provider + secure storage
- Remote data: React Query
- Player queue: isolated provider
- Theme tokens: static module, not runtime state

## Initial delivery shape

1. Contract-aware scaffold and docs
2. Listener-first navigation
3. OAuth bootstrap and session persistence
4. Public catalog and search integration
5. Playback engine hardening
6. Commerce and social surfaces
