import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { AppState } from "react-native";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type {
    ArtistPresenceState,
    RoomMomentState,
    RoomPresenceSummary,
    RoomPresenceSummaryEntry,
} from "@/features/rooms/types";

export interface CreatorRoomRuntimeState {
  presenceSummary: RoomPresenceSummary;
  activeMoment: RoomMomentState | null;
  artistPresence: ArtistPresenceState | null;
}

export const emptyCreatorRoomRuntimeState: CreatorRoomRuntimeState = {
  presenceSummary: {
    activeCount: 0,
    topAvatars: [],
    updatedAt: null,
  },
  activeMoment: null,
  artistPresence: null,
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toPresenceEntry(value: unknown): RoomPresenceSummaryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const uid = readString(record.uid);
  if (!uid) {
    return null;
  }

  return {
    uid,
    displayName: readString(record.displayName) ?? "Listener",
    avatarUrl: readString(record.avatarUrl),
    lastSeenAt: readNumber(record.lastSeenAt),
  };
}

function isRoomMomentState(value: unknown): value is RoomMomentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<RoomMomentState>;
  return typeof record.momentId === "string" &&
    typeof record.roomId === "string" &&
    record.status === "active" &&
    typeof record.type === "string" &&
    typeof record.presentation === "string" &&
    typeof record.source === "object" &&
    record.source !== null &&
    typeof record.startedAt === "number";
}

function isMomentExpired(moment: RoomMomentState): boolean {
  return typeof moment.expiresAt === "number" &&
    moment.expiresAt <= Math.floor(Date.now() / 1000);
}

export function subscribeToCreatorRoomRuntime(
  roomId: number | string | null,
  onUpdate: (patch: Partial<CreatorRoomRuntimeState>) => void,
): Unsubscribe {
  if (!roomId || !isFirebaseConfigured()) {
    onUpdate(emptyCreatorRoomRuntimeState);
    return () => {};
  }

  const db = getFirebaseClientDb();
  const roomIdText = String(roomId);

  let unsubscribes: Unsubscribe[] = [];

  const detachSnapshots = () => {
    if (unsubscribes.length === 0) {
      return;
    }

    unsubscribes.forEach((unsubscribe) => unsubscribe());
    unsubscribes = [];
  };

  const attachSnapshots = () => {
    if (unsubscribes.length > 0) {
      return;
    }

    unsubscribes = [
      onSnapshot(
        doc(db, "rooms", roomIdText, "state", "presence_summary"),
        (snapshot) => {
          if (!snapshot.exists()) {
            onUpdate({ presenceSummary: emptyCreatorRoomRuntimeState.presenceSummary });
            return;
          }

          const data = snapshot.data();
          const topAvatarsRaw = Array.isArray(data.topAvatars) ? data.topAvatars : [];
          const topAvatars = topAvatarsRaw
            .map(toPresenceEntry)
            .filter((entry): entry is RoomPresenceSummaryEntry => entry !== null);

          onUpdate({
            presenceSummary: {
              activeCount: readNumber(data.activeCount) ?? topAvatars.length,
              topAvatars,
              updatedAt: readNumber(data.updatedAt),
            },
          });
        },
        () => onUpdate({ presenceSummary: emptyCreatorRoomRuntimeState.presenceSummary }),
      ),
      onSnapshot(
        doc(db, "rooms", roomIdText, "state", "active_moment"),
        (snapshot) => {
          if (!snapshot.exists()) {
            onUpdate({ activeMoment: null });
            return;
          }

          const data = snapshot.data();
          if (!isRoomMomentState(data) || isMomentExpired(data)) {
            onUpdate({ activeMoment: null });
            return;
          }

          onUpdate({ activeMoment: data });
        },
        () => onUpdate({ activeMoment: null }),
      ),
      onSnapshot(
        doc(db, "rooms", roomIdText, "state", "artist_presence"),
        (snapshot) => {
          if (!snapshot.exists()) {
            onUpdate({ artistPresence: null });
            return;
          }

          const data = snapshot.data();
          onUpdate({
            artistPresence: {
              roomId: readString(data.roomId) ?? roomIdText,
              actorUid: readNumber(data.actorUid),
              sessionId: readString(data.sessionId),
              isActive: data.isActive === true,
              enteredAt: readNumber(data.enteredAt),
              lastSeenAt: readNumber(data.lastSeenAt),
              expiresAt: readNumber(data.expiresAt),
              leftAt: readNumber(data.leftAt),
            },
          });
        },
        () => onUpdate({ artistPresence: null }),
      ),
    ];
  };

  const handleAppStateChange = (nextState: string) => {
    if (nextState === "active") {
      attachSnapshots();
      return;
    }

    detachSnapshots();
    onUpdate(emptyCreatorRoomRuntimeState);
  };

  onUpdate(emptyCreatorRoomRuntimeState);

  if (AppState.currentState === "active") {
    attachSnapshots();
  }

  const subscription = AppState.addEventListener("change", handleAppStateChange);

  return () => {
    subscription.remove();
    detachSnapshots();
  };
}
