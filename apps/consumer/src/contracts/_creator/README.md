# Creator Contracts (Quarantined)

These contract types are for **creator-only** features and should NOT be imported
by the listener-only MicBoxx mobile app. They are preserved here for the future
**MicBoxx Artist** mobile app.

## What belongs here

- Creator analytics types (`CreatorAnalyticsPayload`, etc.)
- Track/album management types (`DashboardTrack`, `DashboardAlbum`, etc.)
- Upload pipeline types (`DashboardUploadOptions`, `DashboardUploadPolicy`)
- Creator commerce/billing types
- Direct messaging types (deferred from listener app)

## Enforcement

The listener app's import boundaries should prevent any file under
`src/contracts/_creator/` from being imported by active source code.
Consider adding an ESLint `no-restricted-imports` rule:

```js
"no-restricted-imports": ["error", {
  patterns: ["@/contracts/_creator/*"]
}]
```
