/**
 * Push deep-link resolution.
 *
 * The server stores web-style target URLs on each room_notification
 * (e.g. "/albums/{slug}/room"). This maps them to consumer app routes
 * (e.g. "/album/{slug}/room"). Unknown targets fall back to the Rooms tab
 * rather than navigating somewhere surprising.
 */

import { router } from "expo-router";

/**
 * Translates a server target_url into an in-app route, or null when it cannot
 * be confidently mapped.
 */
export function resolvePushRoute(targetUrl?: string | null): string | null {
  if (!targetUrl || typeof targetUrl !== "string") {
    return null;
  }

  const [path] = targetUrl.split("?");

  // /albums/{slug}/room  ->  /album/{slug}/room
  const roomMatch = path.match(/^\/albums\/([^/]+)\/room\/?$/);
  if (roomMatch) {
    return `/album/${roomMatch[1]}/room`;
  }

  // /albums/{slug}  ->  /album/{slug}
  const albumMatch = path.match(/^\/albums\/([^/]+)\/?$/);
  if (albumMatch) {
    return `/album/${albumMatch[1]}`;
  }

  // /discover, /discover?room_id=N  ->  Rooms tab
  if (path.startsWith("/discover") || path.startsWith("/rooms")) {
    return "/rooms";
  }

  return null;
}

/**
 * Navigates to the route a push notification points at, if resolvable.
 */
export function navigateToPushTarget(targetUrl?: string | null): void {
  const route = resolvePushRoute(targetUrl);
  if (route) {
    // Cast: routes are validated by the resolver above.
    router.push(route as never);
  }
}
