import type { Ionicons } from "@expo/vector-icons";

export const CREATOR_TAB_ORDER = [
  "dashboard",
  "catalog",
  "create",
  "analytics",
  "rooms",
] as const;

export type CreatorTabKey = (typeof CREATOR_TAB_ORDER)[number];

export const CREATOR_TAB_ROUTE_NAMES: Record<CreatorTabKey, string> = {
  dashboard: "dashboard/index",
  catalog: "catalog/index",
  create: "create/index",
  analytics: "dashboard/analytics",
  rooms: "rooms/index",
};

export const CREATOR_TAB_META: Record<
  CreatorTabKey,
  {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  dashboard: {
    title: "Home",
    icon: "home-outline",
  },
  catalog: {
    title: "Catalog",
    icon: "albums-outline",
  },
  create: {
    title: "Create",
    icon: "add-outline",
  },
  analytics: {
    title: "Analytics",
    icon: "analytics-outline",
  },
  rooms: {
    title: "Rooms",
    icon: "radio-outline",
  },
};
