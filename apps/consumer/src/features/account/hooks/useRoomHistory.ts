import { useEffect, useState } from "react";
import { getMyRoomHistory, type RoomHistoryEntry } from "@micboxx/api";

export function useRoomHistory(accessToken: string) {
  const [rooms, setRooms] = useState<RoomHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyRoomHistory({ accessToken, limit: 10 })
      .then((res) => { if (!cancelled) { setRooms(res.rooms); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  return { rooms, loading };
}
