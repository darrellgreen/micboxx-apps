import { useEffect, useState } from "react";
import type { MicboxxSession, PublicTrackSummary } from "@micboxx/contracts";
import { fetchRecentlyPlayed } from "@/features/account/api";

export function useRecentlyPlayed(accessToken: string, session?: MicboxxSession | null) {
  const [tracks, setTracks] = useState<PublicTrackSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRecentlyPlayed(6, accessToken, session)
      .then((t) => { if (!cancelled) { setTracks(t); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, session]);

  return { tracks, loading };
}
