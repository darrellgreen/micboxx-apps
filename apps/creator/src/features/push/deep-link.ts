/**
 * Push deep-link resolution (creator app).
 *
 * The server stores web-style target URLs on each room_notification
 * (e.g. "/albums/{id}/room"). This maps them to creator app routes.
 * Unknown targets fall back to null — navigateToPushTarget silently
 * drops unresolvable routes rather than navigating somewhere surprising.
 *
 * Identifier note: the server writes the album's public_id (falling back
 * to slug) via RoomNotificationService::releaseIdentifier(). The creator
 * room screen (rooms/[albumId].tsx) passes the same value to
 * getCreatorRoomDetail(), so the formats are consistent end-to-end.
 */

import { router } from "expo-router";

/**
 * Translates a server target_url into a creator app route, or null when
 * it cannot be confidently mapped.
 */
export function resolvePushRoute(targetUrl?: string | null): string | null {
  if (!targetUrl || typeof targetUrl !== "string") {
    return null;
  }

  const [path] = targetUrl.split("?");

  // /albums/{id}/room  ->  /rooms/{id}
  const roomMatch = path.match(/^\/albums\/([^/]+)\/room\/?$/);
  if (roomMatch) {
    return `/rooms/${roomMatch[1]}`;
  }

  // /albums/{id}  ->  /rooms/{id}  (room screen without explicit /room suffix)
  const albumMatch = path.match(/^\/albums\/([^/]+)\/?$/);
  if (albumMatch) {
    return `/rooms/${albumMatch[1]}`;
  }

  // /discover or /rooms  ->  rooms tab
  if (path.startsWith("/discover") || path.startsWith("/rooms")) {
    return "/(tabs)/rooms";
  }

  // /audience/inbox/{id}  ->  /audience/inbox/{id}
  const inboxThreadMatch = path.match(/^\/audience\/inbox\/([^/]+)\/?$/);
  if (inboxThreadMatch) {
    return `/audience/inbox/${inboxThreadMatch[1]}`;
  }

  // /audience/inbox  ->  /audience/inbox
  if (path === "/audience/inbox" || path === "/audience/inbox/") {
    return "/audience/inbox";
  }

  // /audience/notifications  ->  /audience/notifications  (follow/support events)
  if (path.startsWith("/audience/notifications")) {
    return "/audience/notifications";
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
