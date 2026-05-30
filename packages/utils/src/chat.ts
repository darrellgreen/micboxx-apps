import type { RoomChatMessage } from "@micboxx/contracts";

export const getMessageOpacity = (index: number, total: number, expanded: boolean): number => {
  const distanceFromNewest = total - index - 1;
  if (distanceFromNewest <= 0) return 1;

  const fadeStep = expanded ? 0.09 : 0.16;
  const minimumOpacity = expanded ? 0.28 : 0.16;
  return Math.max(minimumOpacity, 1 - distanceFromNewest * fadeStep);
};

export const shouldCompactWithPrevious = (
  messages: RoomChatMessage[],
  index: number,
): boolean => {
  if (index <= 0) {
    return false;
  }

  const previous = messages[index - 1];
  const current = messages[index];
  if (!previous || !current) {
    return false;
  }

  return previous.senderUid === current.senderUid;
};
