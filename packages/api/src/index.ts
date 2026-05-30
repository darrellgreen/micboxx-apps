/**
 * @micboxx/api
 *
 * Shared API utilities for the MicBoxx platform.
 * Contains formatting helpers used across both apps.
 *
 * Note: The core apiFetch() client remains in each app's src/lib/api/client.ts
 * because it depends on app-specific environment configuration.
 */

export {
  formatDuration,
  formatCount,
  formatCompactNumber,
  formatCurrency,
  formatRelativeTime,
} from './formatters';
