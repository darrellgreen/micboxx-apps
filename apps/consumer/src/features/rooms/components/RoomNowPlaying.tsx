import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RoomClockState, RoomClockTrackEntry } from "@micboxx/contracts";
import { TrackWaveform } from "@/features/player/components/TrackWaveform";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { tokens } from "@/theme/tokens";

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RoomNowPlaying({
  clockState,
  releaseTitle,
  artistName,
  artworkUrl,
  awakenedAt,
  presenceCount,
}: {
  clockState: RoomClockState | null;
  releaseTitle?: string | null;
  artistName?: string | null;
  artworkUrl?: string | null;
  awakenedAt?: number | null;
  presenceCount?: number;
}) {
  const { currentItem } = useNowPlaying();
  const fallbackTrack = clockState?.track_map.find((entry) => entry.index === clockState.track_index)
    ?? clockState?.track_map[clockState.track_index]
    ?? null;
  const [liveClock, setLiveClock] = useState(() =>
    calculateLiveTrackPosition(clockState, fallbackTrack),
  );

  useEffect(() => {
    const updateLiveClock = () => {
      setLiveClock(calculateLiveTrackPosition(clockState, fallbackTrack));
    };

    updateLiveClock();
    const intervalId = setInterval(updateLiveClock, 1000);
    return () => clearInterval(intervalId);
  }, [clockState, fallbackTrack]);

  const displayTrack = liveClock.trackEntry ?? fallbackTrack;
  const roomTrackIdCandidates = new Set<string>();
  if (displayTrack?.track_id != null) {
    roomTrackIdCandidates.add(String(displayTrack.track_id));
  }
  if (displayTrack?.track_ref_id != null) {
    roomTrackIdCandidates.add(String(displayTrack.track_ref_id));
  }

  const isRoomTrackActiveInPlayer = !!(
    roomTrackIdCandidates.size > 0
    && currentItem?.id
    && roomTrackIdCandidates.has(String(currentItem.id))
  );
  const playbackDuration = Math.max(1, liveClock.trackDuration);
  const playbackPosition = Math.max(0, Math.min(playbackDuration, liveClock.trackPosition));
  const progress = Math.max(0, Math.min(1, playbackPosition / playbackDuration));
  const activeTrackTitle = displayTrack?.title ?? currentItem?.title ?? null;
  const artistLabel = artistName?.trim() || "Artist";

  return (
    <View style={styles.stage}>
      <View style={styles.coverZone}>
        <View style={styles.coverShadow} />
        <View style={styles.coverFrame}>
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <View style={styles.coverFallback} />
          )}
        </View>
      </View>

      <Text numberOfLines={2} style={styles.releaseTitle}>
        {releaseTitle ?? "Release Room"}
      </Text>
      <Text numberOfLines={1} style={styles.artistLine}>
        <Text style={styles.artistName}>{artistLabel}</Text>
        <Text> · Single</Text>
      </Text>

      <View style={styles.waveformWrap}>
        <Text style={styles.eyebrow}>Now playing in the room</Text>
        <TrackWaveform
          darkWaveformUrl={isRoomTrackActiveInPlayer ? currentItem?.waveformDarkUrl : null}
          lightWaveformUrl={isRoomTrackActiveInPlayer ? currentItem?.waveformLightUrl : null}
          fallbackWaveformUrl={isRoomTrackActiveInPlayer ? currentItem?.waveformFallbackUrl : null}
          progressPercent={progress}
          height={52}
          accentColor={tokens.colors.accent}
        />
        <Text numberOfLines={1} style={styles.trackTitle}>
          {activeTrackTitle ?? "Waiting for room clock"}
        </Text>
        <Text style={styles.clockLine}>
          {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
          {awakenedAt ? ` · Last visited ${formatTimeSince(awakenedAt)}` : ""}
          {typeof presenceCount === "number"
            ? ` · ${presenceCount <= 1 ? "Just you here" : `${presenceCount} here`}`
            : ""}
        </Text>
      </View>
    </View>
  );
}

function formatTimeSince(unixTimestamp: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixTimestamp);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function calculateLiveTrackPosition(
  clockState: RoomClockState | null,
  fallbackTrack: RoomClockTrackEntry | null,
): { trackPosition: number; trackDuration: number; trackEntry: RoomClockTrackEntry | null } {
  if (
    !clockState
    || clockState.total_duration_seconds <= 0
    || !Array.isArray(clockState.track_map)
    || clockState.track_map.length === 0
  ) {
    const fallbackDuration = fallbackTrack?.duration_seconds ?? fallbackTrack?.duration ?? 0;
    const fallbackPosition = Math.max(0, Math.min(fallbackDuration, clockState?.track_position_seconds ?? 0));
    return {
      trackPosition: fallbackPosition,
      trackDuration: fallbackDuration,
      trackEntry: fallbackTrack,
    };
  }

  const nowSeconds = Date.now() / 1000;
  const elapsedSinceSnapshot = Math.max(0, nowSeconds - clockState.server_time);
  const releasePosition =
    (clockState.release_position_seconds + elapsedSinceSnapshot) % clockState.total_duration_seconds;

  const trackEntry =
    clockState.track_map.find(
      (entry) => releasePosition >= entry.starts_at && releasePosition < entry.ends_at,
    )
    ?? fallbackTrack
    ?? null;

  if (!trackEntry) {
    return { trackPosition: 0, trackDuration: 0, trackEntry: null };
  }

  const duration = trackEntry.duration_seconds ?? trackEntry.duration ?? 0;
  const position = Math.max(0, Math.min(duration, releasePosition - trackEntry.starts_at));

  return {
    trackPosition: position,
    trackDuration: duration,
    trackEntry,
  };
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  coverZone: {
    width: 156,
    height: 156,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  coverShadow: {
    position: "absolute",
    width: 144,
    height: 144,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.42)",
    transform: [{ translateY: 18 }, { scale: 1.04 }],
  },
  coverFrame: {
    width: 138,
    height: 138,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.62,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 22 },
    elevation: 12,
  },
  coverFallback: {
    flex: 1,
    backgroundColor: tokens.colors.accentDim,
  },
  releaseTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 42,
    lineHeight: 43,
    fontWeight: "400",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.42)",
    textShadowRadius: 18,
  },
  artistLine: {
    marginTop: 12,
    marginBottom: 22,
    color: "rgba(238,238,242,0.54)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  artistName: { color: tokens.colors.accentLight, fontWeight: "800" },
  waveformWrap: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    color: "rgba(238,238,242,0.42)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  clockLine: {
    color: "rgba(238,238,242,0.46)",
    fontSize: 11,
    textAlign: "center",
  },
});
