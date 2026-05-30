# MicBoxx Mobile Playback Architecture Spec

Date: 2026-04-08

## Why playback is architectural

Playback affects:

- background behavior
- queue persistence
- entitlement checks
- interruptions
- battery and network policy
- future download behavior
- lock screen and transport controls

## V1 playback model

- Single shared player provider
- Persistent queue state
- Route-independent mini player
- Track payload normalized to a player-safe shape
- Demo and full-access URLs preserved in the contract model

## Queue rules

- Track detail starts track-first queue with related tracks
- Album detail starts album queue
- User profile starts creator mix queue
- Playlist detail starts playlist queue

## Authorization rules

- Respect `locked`, `isSubscriberOnly`, `requiredCapability`, and `planKey`
- Do not assume full audio exists if premium gating is active
- Prefer platform contract fields over mobile-derived heuristics

## Future hardening

- Background playback service integration
- Audio focus and interruption handling
- Lock screen metadata and controls
- Download manager
- Offline entitlement validation
