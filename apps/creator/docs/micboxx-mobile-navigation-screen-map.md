# MicBoxx Mobile Navigation And Screen Map

Date: 2026-04-08

## Primary tabs

- `Home`
- `Search`
- `Library`
- `You`

## Shared stack routes

- `track/[slug]`
- `album/[slug]`
- `user/[username]`
- `playlist/[slug]`
- `sign-in`

## Tab intent

### Home

- Listener-first recommendations
- Trending and new releases
- Recently played entry points

### Search

- Query input
- Tracks
- Albums
- Users / creators
- Playlists

### Library

- Saved playlists
- Recently played
- Downloads placeholder

### You

- Session state
- Account summary
- Listener settings
- Access and plan status later

## Navigation rules

- Tabs remain listener-centric
- Detail routes live above tabs in the root stack
- Mini player remains global and route-independent
- Auth is modal-capable but not web-dashboard-shaped
