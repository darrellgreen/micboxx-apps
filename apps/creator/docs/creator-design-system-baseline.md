# MicBoxx Creator Design System Baseline

## Product Tone

- Deliberate, structured, and operational
- Dense over airy
- Minimal decoration
- Accent color only for explicit actions

## Strict Token System

### Radius

- `container`: `10`
- `section`: `8`
- `control`: `6`
- `pill`: `12` (only for compact status treatments)
- `round`: `999` (avatars only)

### Spacing

- `xxxs`: `2`
- `xxs`: `4`
- `xs`: `6`
- `sm`: `8`
- `md`: `12`
- `lg`: `16`
- `xl`: `20`
- `2xl`: `24`

### Surfaces

- `primary`: hero/critical action blocks only
- `section`: default section containers
- `inline`: list rows and settings rows

## Surface Rules

- One primary surface per screen max
- Section surfaces group related info with low visual noise
- Inline surfaces handle most content rows and controls
- Avoid card stacks for rows that are essentially settings or status entries

## Navigation Rules

- Bottom nav is anchored and flat
- No ambient glow
- Center action is a compact structural control

## Typography Rules

- Tighten heading and body sizes by default
- Use direct labels:
  - `Audience`
  - `Inbox & alerts`
  - `Recent activity`

## Applied In App

- Global tokens updated in `src/theme/tokens.ts`
- Shared shells/primitives updated in:
  - `src/shared/ui/layout.tsx`
  - `src/shared/ui/dashboard-primitives.tsx`
  - `src/shared/navigation/creator-tab-bar.tsx`
- Key tabs migrated to baseline:
  - `Dashboard`
  - `Audience`
  - `Catalog`
  - `Account`
  - `Review & publish`
