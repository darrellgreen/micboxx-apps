import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getArtistPage } from "@micboxx/api";
import type { PublicArtistSummary } from "@micboxx/contracts";
import { getFirebaseClientDb } from "@/config/firebase";
import { useSocialSessionGate } from "@/features/social/hooks/useSocialSessionGate";

export function useFollowedUsers() {
  const [artists, setArtists] = useState<PublicArtistSummary[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  const { viewerUid, configured, socialReady } = useSocialSessionGate({ hasContext: true });

  // Following: docs where followerUid == viewerUid
  useEffect(() => {
    if (!configured || !socialReady || !viewerUid) {
      setArtists([]);
      setFollowingCount(0);
      setArtistsLoading(false);
      return;
    }

    setArtistsLoading(true);
    const db = getFirebaseClientDb();
    const q = query(collection(db, "follows"), where("followerUid", "==", viewerUid));

    return onSnapshot(
      q,
      (snapshot) => {
        setFollowingCount(snapshot.size);

        const followeeUids = snapshot.docs
          .map((d) => d.data().followeeUid as string | undefined)
          .filter((uid): uid is string => Boolean(uid));

        if (followeeUids.length === 0) {
          setArtists([]);
          setArtistsLoading(false);
          return;
        }

        Promise.all(
          followeeUids.map((uid) =>
            getArtistPage(uid)
              .then((page) => page.artist)
              .catch(() => null),
          ),
        ).then((resolved) => {
          setArtists(resolved.filter((a): a is Exclude<typeof a, null> => a !== null));
          setArtistsLoading(false);
        });
      },
      () => {
        setArtists([]);
        setArtistsLoading(false);
      },
    );
  }, [configured, socialReady, viewerUid]);

  // Followers: docs where followeeUid == viewerUid
  useEffect(() => {
    if (!configured || !socialReady || !viewerUid) {
      setFollowerCount(0);
      return;
    }

    const db = getFirebaseClientDb();
    const q = query(collection(db, "follows"), where("followeeUid", "==", viewerUid));

    return onSnapshot(
      q,
      (snapshot) => { setFollowerCount(snapshot.size); },
      () => { setFollowerCount(0); },
    );
  }, [configured, socialReady, viewerUid]);

  return { artists, artistsLoading, followerCount, followingCount };
}
