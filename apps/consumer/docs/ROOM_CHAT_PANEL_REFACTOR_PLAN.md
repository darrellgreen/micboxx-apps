# Mobile RoomChatPanel Refactor Plan

Date: 2026-05-24
Status: Planning only (no runtime behavior changes in this step)

## Objective

Improve Room chat rendering performance and maintainability with minimal fragmentation by refactoring [src/features/rooms/components/RoomChatPanel.tsx](src/features/rooms/components/RoomChatPanel.tsx) into exactly three units.

## Strict Scope

Create only:

1. ChatBubble.tsx
2. useRoomChatList.ts
3. chat-utils.ts

Keep small UI details and styles inside ChatBubble.tsx. Do not split into additional micro-components in this pass.

## Current Structure (Single File)

Current file [src/features/rooms/components/RoomChatPanel.tsx](src/features/rooms/components/RoomChatPanel.tsx) contains:

- Bubble rendering and enter animation logic
- Scroll expand/collapse interactions
- Keyboard listeners and composer positioning
- Utility helpers (toMillis, formatTime, getInitials, getAvatarBackground, getMessageOpacity)
- Full screen and card variants

## Target Refactor

### 1) ChatBubble.tsx

Move bubble presentation and animation from RoomChatPanel into a memoized component.

Export:

- ChatBubble (React.memo)

Props:

- item: RoomChatMessage
- currentUserUuid: string | null
- opacity?: number
- compactWithPrevious?: boolean

Important prop rule:

- Treat this prop list as a baseline, not a hard cap.
- Final ChatBubble props must be the minimum required to preserve current behavior exactly.
- If existing behavior depends on additional bubble-level inputs (for example role/badge rendering, moderation state, or interaction handlers), keep those props rather than dropping behavior.

Keep inside this file:

- bubble-level inline UI concerns
- avatar rendering
- verified badge placement
- timestamp text rendering
- row-level enter animation ownership

Memoization guidance:

- Use React.memo() for ChatBubble.
- Do not over-claim memoization gains when volatile props change frequently (for example opacity during scroll-driven updates).
- Avoid passing broad changing parent state into every ChatBubble unless required for parity.

### 2) useRoomChatList.ts

Extract list interaction and layout behavior from RoomChatPanel.

Responsibilities:

- expanded/collapsed state
- drag start/end handlers
- touch handlers for expand gesture
- keyboard show/hide subscriptions and height state
- auto-scroll behavior when message count changes
- derived layout values used by composer/list masks

Expose a focused return object for RoomChatPanel composition.

Ownership rule:

- Keep list-level and global interaction behavior in this hook (scroll, gesture, keyboard, layout derivations).
- Keep row-local animation and rendering in ChatBubble.tsx.

### 3) chat-utils.ts

Move pure helper functions:

- toMillis
- formatTime
- getInitials
- getAvatarBackground
- getMessageOpacity

Constraints:

- pure functions only
- no React or RN imports
- easy unit-test surface

## Execution Order

1. Add chat-utils.ts and switch RoomChatPanel imports to helpers.
2. Add ChatBubble.tsx and replace inline bubble function in RoomChatPanel.
3. Add useRoomChatList.ts and migrate list/keyboard/gesture logic from RoomChatPanel.
4. Keep RoomChatPanel as orchestration shell and preserve public props.
5. Verify both layout variants preserve behavior and visuals:
  - card variant
  - overlay/fullscreen variant

## Validation Plan

- Type check: npm run typecheck
- Runtime checks:
  - message list renders and groups same as before
  - expand/collapse gestures unchanged
  - keyboard docking behavior unchanged
  - send flow unchanged
  - reactions/sign-in/support controls unchanged
  - card and overlay variants remain behaviorally equivalent to pre-refactor output

Refactor guardrail:

- Refactor only. Do not redesign chat UI, composer, reactions, support controls, Room Moments, or keyboard behavior.

## Explicit Non-Goals

- No Room Moment behavior changes
- No audio ducking or player volume API changes
- No LiveKit or room orchestration changes
- No additional component fragmentation beyond the 3 planned units

## Codex Execution Prompt

Implement the wider Rooms refactor prep in two isolated planning-backed chunks.

Chunk 1: Room chat read model planning-to-implementation prep.
- Add a dedicated RoomChatReadModelService plan/implementation boundary.
- Keep room_event as the immutable audit ledger.
- Add room_chat_messages as an indexed operational read model.
- Preserve all existing RoomChatController API response shapes and permission gates.
- Do not alter Room Moment behavior, Firestore client behavior, LiveKit, presence, or audio.

Chunk 2: Mobile RoomChatPanel refactor.
- Split RoomChatPanel.tsx into exactly:
  1. ChatBubble.tsx
  2. useRoomChatList.ts
  3. chat-utils.ts
- Preserve visual behavior, gestures, keyboard behavior, composer behavior, reactions, sign-in gates, and support controls.
- Do not create additional micro-components.
- Do not redesign UI.

Before coding, verify current file contents and report any behavior that would require adjusting the proposed props or service boundaries.
