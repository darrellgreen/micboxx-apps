import { addDoc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseClientDb } from "@/config/firebase";
import type { MicboxxSessionUser } from "@micboxx/contracts";
import {
    buildDirectConversationPayload,
    buildDirectMessagePayload,
    getConversationMessagesCollection,
    getConversationRef,
    getDirectConversationId,
    getUserConversationItemRef,
} from "@/features/social/firestore";

export async function getOrCreateConversation(
  currentUser: Pick<MicboxxSessionUser, "uuid" | "username" | "displayName">,
  otherUser: Pick<MicboxxSessionUser, "uuid" | "username" | "displayName">,
): Promise<string> {
  if (!currentUser.uuid || !otherUser.uuid) {
    throw new Error("Both users need a valid uuid to start a conversation.");
  }

  if (currentUser.uuid === otherUser.uuid) {
    throw new Error("You cannot start a direct message with yourself.");
  }

  const db = getFirebaseClientDb();
  const conversationId = getDirectConversationId(
    currentUser.uuid,
    otherUser.uuid,
  );
  const conversationRef = getConversationRef(db, conversationId);
  const conversationSnapshot = await getDoc(conversationRef);

  if (!conversationSnapshot.exists()) {
    await setDoc(
      conversationRef,
      buildDirectConversationPayload({ currentUser, otherUser }),
      { merge: true },
    );
  }

  return conversationId;
}

export async function sendDirectMessage({
  conversationId,
  sender,
  body,
}: {
  conversationId: string;
  sender: Pick<MicboxxSessionUser, "uuid" | "username" | "displayName">;
  body: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Message body cannot be empty.");
  }

  const db = getFirebaseClientDb();
  return addDoc(
    getConversationMessagesCollection(db, conversationId),
    buildDirectMessagePayload({
      senderUid: sender.uuid,
      senderUsername: sender.username,
      senderDisplayName: sender.displayName,
      body: trimmedBody,
    }),
  );
}

export async function markConversationRead(
  userUid: string,
  conversationId: string,
) {
  if (!userUid || !conversationId) {
    return;
  }

  const db = getFirebaseClientDb();
  await setDoc(
    getUserConversationItemRef(db, userUid, conversationId),
    {
      unreadCount: 0,
      lastReadAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
