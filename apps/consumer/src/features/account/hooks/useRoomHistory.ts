import { useEffect, useState } from "react";
import { getMyRoomHistory, type RoomHistoryEntry } from "@micboxx/api";
import {
  getCachedRoomHistory,
  setCachedRoomHistory,
} from "@/features/account/profile-cache";

export function useRoomHistory(accessToken: string, userUuid: string) {
  const [rooms, setRooms] = useState<RoomHistoryEntry[]>(
    () => getCachedRoomHistory(userUuid) ?? [],
  );
  const [loading, setLoading] = useState(
    () => getCachedRoomHistory(userUuid) === null,
  );

  useEffect(() => {
    let cancelled = false;
    const cachedRooms = getCachedRoomHistory(userUuid);
    if (cachedRooms) {
      setRooms(cachedRooms);
    }
    setLoading(cachedRooms === null);

    getMyRoomHistory({ accessToken, limit: 10 })
      .then((res) => {
        if (!cancelled) {
          setCachedRoomHistory(userUuid, res.rooms);
          setRooms(res.rooms);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, userUuid]);

  return { rooms, loading };
}
