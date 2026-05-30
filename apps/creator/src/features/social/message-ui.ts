import type {
  DirectConversation,
  UserConversationInboxItem,
} from "@micboxx/contracts";

export type ConversationFilter =
  | "all"
  | "following"
  | "fans"
  | "creators"
  | "archived";

export function formatMessageRelativeDate(value: string | null) {
  if (!value) {
    return "Now";
  }

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return "Now";
  }

  const diffMs = Date.now() - target.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.round(diffMs / minute))}m`;
  }

  if (diffMs < day) {
    return `${Math.max(1, Math.round(diffMs / hour))}h`;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (target.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(target);
}

export function formatInboxPreview(item: UserConversationInboxItem) {
  return item.lastMessagePreview || "No messages yet.";
}

export function getConversationLabel(item: UserConversationInboxItem) {
  return (
    item.otherParticipantDisplayName ??
    item.otherParticipantUsername ??
    "Unknown member"
  );
}

export function resolveParticipantRole(
  item:
    | UserConversationInboxItem
    | {
        username?: string | null;
        displayName?: string | null;
      }
    | null,
) {
  let label = "";

  if (item && "otherParticipantUsername" in item) {
    label = `${item.otherParticipantUsername ?? ""} ${
      item.otherParticipantDisplayName ?? ""
    }`;
  } else if (item) {
    label = `${item.username ?? ""} ${item.displayName ?? ""}`;
  }

  if (/(artist|dj|producer|prod|band|label|official|music)/i.test(label)) {
    return "Creator";
  }

  return "Listener";
}

export function buildIdentityTokens(
  item: UserConversationInboxItem | null,
  role: string,
) {
  const normalized = (item?.lastMessagePreview ?? "").toLowerCase();
  const nextTokens: string[] = [role];

  if (/(purchased|purchase|bought|checkout|order|paid)/.test(normalized)) {
    nextTokens.push("Purchased release");
  } else if (/(playlist|queue|mix)/.test(normalized)) {
    nextTokens.push("Shared playlist");
  } else if (/(track|song|album|release)/.test(normalized)) {
    nextTokens.push("Release context");
  } else if (role === "Creator") {
    nextTokens.push("Collaboration thread");
  } else {
    nextTokens.push("Following you");
  }

  return nextTokens;
}

export function getRelationshipCue(
  item: UserConversationInboxItem | null,
  role: string,
) {
  return (
    buildIdentityTokens(item, role)[1] ??
    (role === "Creator" ? "Collaboration thread" : "Following you")
  );
}

export function buildInboxMetaLine(item: UserConversationInboxItem) {
  const role = resolveParticipantRole(item);
  const nextTokens = buildIdentityTokens(item, role).slice(0, 2);

  if (item.unreadCount > 0) {
    nextTokens.push(`Unread ${item.unreadCount}`);
  }

  return nextTokens.join(" · ");
}

export function buildRelationshipSignals(input: {
  item: UserConversationInboxItem | null;
  role: string;
  unreadCount: number;
}) {
  const signals = [...buildIdentityTokens(input.item, input.role).slice(1)];

  if (input.role === "Creator") {
    signals.unshift("Verified creator");
  } else {
    signals.unshift("Audience connection");
  }

  if (input.unreadCount > 0) {
    signals.push("Needs reply");
  }

  return Array.from(new Set(signals)).slice(0, 4);
}

export function buildCatalogContextCopy(
  preview: string | null | undefined,
  role: string,
) {
  const normalized = (preview ?? "").toLowerCase();
  const items: string[] = [];

  if (/(purchased|purchase|bought|checkout|order|paid)/.test(normalized)) {
    items.push("Purchased release context");
  }

  if (/(playlist|queue|mix)/.test(normalized)) {
    items.push("Shared playlist context");
  }

  if (/(track|song)/.test(normalized)) {
    items.push("Track discussion");
  }

  if (/(album|release)/.test(normalized)) {
    items.push("Release discussion");
  }

  if (items.length === 0) {
    items.push(
      role === "Creator" ? "Collaboration context" : "Listener discovery context",
    );
  }

  items.push(
    "Follower, subscriber, and purchase signals can surface here as the relationship grows.",
  );
  return items.slice(0, 4);
}

export function filterInboxItems(
  items: UserConversationInboxItem[],
  filter: ConversationFilter,
  searchValue: string,
) {
  const search = searchValue.trim().toLowerCase();

  return items.filter((item) => {
    const role = resolveParticipantRole(item);
    const relationshipCue = getRelationshipCue(item, role);
    const haystack = `${item.otherParticipantDisplayName ?? ""} ${
      item.otherParticipantUsername ?? ""
    } ${item.lastMessagePreview ?? ""}`.toLowerCase();

    if (search && !haystack.includes(search)) {
      return false;
    }

    switch (filter) {
      case "following":
        return relationshipCue === "Following you";
      case "creators":
        return role === "Creator";
      case "fans":
        return role === "Listener";
      case "archived":
        return false;
      case "all":
      default:
        return true;
    }
  });
}

export function getEmptyInboxCopy(
  filter: ConversationFilter,
  hasSearch: boolean,
) {
  if (hasSearch) {
    return {
      title: "No conversations found",
      body: "Try a different name or filter.",
    };
  }

  switch (filter) {
    case "following":
      return {
        title: "No following conversations yet",
        body: "Conversations with people already following your work will appear here.",
      };
    case "archived":
      return {
        title: "No archived conversations",
        body: "Archived threads will appear here when that feature is enabled.",
      };
    case "creators":
      return {
        title: "No creator conversations yet",
        body: "Creator connections will appear here once they start messaging.",
      };
    case "fans":
      return {
        title: "No fan conversations yet",
        body: "Listener and audience conversations will appear here as your network grows.",
      };
    case "all":
    default:
      return {
        title: "No conversations yet",
        body: "Messages appear here when listeners, creators, or collaborators connect with you.",
      };
  }
}

export function getOtherParticipantFromConversation(
  conversation: DirectConversation | null,
  viewerUid: string | null | undefined,
) {
  if (!conversation || !viewerUid) {
    return null;
  }

  const index = conversation.participantUids.findIndex((uid) => uid !== viewerUid);
  if (index < 0) {
    return null;
  }

  return {
    uuid: conversation.participantUids[index] ?? "",
    username: conversation.participantUsernames[index] ?? null,
    displayName: conversation.participantDisplayNames[index] ?? null,
  };
}
