/**
 * @micboxx/api
 *
 * Shared API utilities for the MicBoxx platform.
 * Contains shared API clients, RTK Query hooks, fixtures, and formatting
 * helpers used across both apps.
 */

export * from "./micboxx-api";
export * from "./config";
export * from "./client";
export * from "./features/catalog";
export * from "./features/dashboard";
export * from "./features/recommendations";
export * from "./features/rooms";
export * from "./mock-data";
export {
  formatDuration,
  formatCount,
  formatCompactNumber,
  formatCurrency,
  formatRelativeTime,
} from './formatters';
