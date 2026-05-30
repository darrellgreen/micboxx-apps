import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TrackWaveform } from "@/features/player/components/TrackWaveform";
import { formatDuration } from "@/lib/formatters";
import { tokens } from "@micboxx/theme";

interface PlayerTransportProps {
  playing: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSkipPrevious: () => void;
  onSkipNext: () => void;
  onCycleRepeat: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  repeatMode: "off" | "queue" | "track";
  waveformDarkUrl?: string | null;
  waveformLightUrl?: string | null;
  waveformFallbackUrl?: string | null;
}

export function PlayerTransport({
  playing,
  progress,
  currentTime,
  duration,
  onTogglePlay,
  onSkipPrevious,
  onSkipNext,
  onCycleRepeat,
  hasPrevious,
  hasNext,
  repeatMode,
  waveformDarkUrl,
  waveformLightUrl,
  waveformFallbackUrl,
}: PlayerTransportProps) {
  const repeatActive = repeatMode !== "off";

  return (
    <View>
      <View style={s.waveformSection}>
        <TrackWaveform
          darkWaveformUrl={waveformDarkUrl}
          lightWaveformUrl={waveformLightUrl}
          fallbackWaveformUrl={waveformFallbackUrl}
          progressPercent={progress}
          height={52}
          accentColor={tokens.colors.accent}
        />
        <View style={s.timeRow}>
          <Text style={s.timeText}>{formatDuration(currentTime)}</Text>
          <Text style={s.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <View style={s.transportRow}>
        <Pressable
          onPress={onCycleRepeat}
          style={[s.transportBtn, repeatActive && s.transportBtnActive]}
        >
          <View>
            <Ionicons
              name="repeat"
              size={24}
              color={
                repeatActive
                  ? tokens.colors.accent
                  : tokens.colors.textPrimary
              }
            />
            {repeatMode === "track" ? <Text style={s.repeatBadge}>1</Text> : null}
          </View>
        </Pressable>
        <Pressable
          onPress={onSkipPrevious}
          disabled={!hasPrevious}
          style={[s.transportBtn, !hasPrevious && s.transportBtnDisabled]}
        >
          <Ionicons
            name="play-skip-back"
            size={28}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
        <Pressable onPress={onTogglePlay} style={s.playBtn}>
          <LinearGradient
            colors={[tokens.colors.brandSecondary, tokens.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.playBtnGradient}
          >
            <Ionicons
              name={playing ? "pause" : "play"}
              size={32}
              color="#fff"
              style={playing ? undefined : { marginLeft: 3 }}
            />
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onSkipNext}
          disabled={!hasNext}
          style={[s.transportBtn, !hasNext && s.transportBtnDisabled]}
        >
          <Ionicons
            name="play-skip-forward"
            size={28}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  waveformSection: {
    width: "100%",
    paddingHorizontal: 20,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 8,
  },
  transportBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  transportBtnActive: {
    backgroundColor: "rgba(0,179,166,0.12)",
    borderRadius: 24,
  },
  transportBtnDisabled: {
    opacity: 0.35,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
  },
  playBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatBadge: {
    position: "absolute",
    right: -6,
    bottom: -2,
    color: tokens.colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
});
