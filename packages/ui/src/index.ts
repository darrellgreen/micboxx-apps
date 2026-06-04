/**
 * @micboxx/ui
 *
 * Shared UI primitives for the MicBoxx platform.
 * These components are stateless, theme-aware building blocks
 * used by both the consumer and creator apps.
 */

export { AnimatedPressable } from './animated-pressable';
export { AppBackdrop } from './app-backdrop';
export { AppHeader } from './app-header';
export type { AppHeaderProps, HeaderVariant } from './app-header';
export { Avatar } from './avatar';
export { BottomActionSheet } from './bottom-action-sheet';
export type { BottomActionSheetItem } from './bottom-action-sheet';
export { Button } from './button';
export { AccentHeading, SectionHeading } from './gradient-text';
export { Pill } from './pill';
export { Screen } from './screen';
export { ShimmerPlaceholder } from './shimmer-placeholder';
export { EmptyState, ErrorState, Skeleton } from './state';
export { Surface } from './surface';
export { Heading, BodyText, Subtext } from './typography';
export { VerifiedBadge } from './verified-badge';

// Haptic utilities
export { hapticLight, hapticSelection, hapticSuccess } from './useHaptic';
