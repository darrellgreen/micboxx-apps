import { useEffect, useState } from "react";
import type { MicboxxSession, PublicTrackSummary } from "@micboxx/contracts";
import { fetchRecentlyPlayed } from "@/features/account/api";
import {
  getCachedRecentlyPlayed,
  setCachedRecentlyPlayed,
} from "@/features/account/profile-cache";

export function useRecentlyPlayed(
  accessToken: string,
  userUuid: string,
  session?: MicboxxSession | null,
) {
  const [tracks, setTracks] = useState<PublicTrackSummary[]>(
    () => getCachedRecentlyPlayed(userUuid) ?? [],
  );
  const [loading, setLoading] = useState(
    () => getCachedRecentlyPlayed(userUuid) === null,
  );

  useEffect(() => {
    let cancelled = false;
    const cachedTracks = getCachedRecentlyPlayed(userUuid);
    if (cachedTracks) {
      setTracks(cachedTracks);
    }
    setLoading(cachedTracks === null);

    fetchRecentlyPlayed(6, accessToken, session)
      .then((t) => {
        if (!cancelled) {
          setCachedRecentlyPlayed(userUuid, t);
          setTracks(t);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, session, userUuid]);

  return { tracks, loading };
}
