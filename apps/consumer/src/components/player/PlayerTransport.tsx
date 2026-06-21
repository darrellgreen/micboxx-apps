import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { TrackWaveform } from "@/features/player/components/TrackWaveform";
import { formatDuration } from "@micboxx/api";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, BodyText } from "@micboxx/ui";

const PLAYER_WAVEFORM_MAX_WIDTH = 460;

interface PlayerTransportProps {
  playing: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSkipPrevious: () => void;
  onSkipNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
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
  hasPrevious,
  hasNext,
  waveformDarkUrl,
  waveformLightUrl,
  waveformFallbackUrl,
}: PlayerTransportProps) {
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
          <BodyText size="sm" weight="semibold" color="accent">{formatDuration(currentTime)}</BodyText>
          <BodyText size="sm" weight="semibold" color="accent">{formatDuration(duration)}</BodyText>
        </View>
      </View>

      <View style={s.transportRow}>
        <AnimatedPressable
          onPress={onSkipPrevious}
          disabled={!hasPrevious}
          style={[s.transportBtn, !hasPrevious && s.transportBtnDisabled]}
          haptic="selection"
        >
          <Ionicons
            name="play-skip-back"
            size={28}
            color={tokens.colors.textPrimary}
          />
        </AnimatedPressable>

        <AnimatedPressable onPress={onTogglePlay} style={s.playBtn} haptic="selection" scaleValue={0.92}>
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
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onSkipNext}
          disabled={!hasNext}
          style={[s.transportBtn, !hasNext && s.transportBtnDisabled]}
          haptic="selection"
        >
          <Ionicons
            name="play-skip-forward"
            size={28}
            color={tokens.colors.textPrimary}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  waveformSection: {
    width: "100%",
    maxWidth: PLAYER_WAVEFORM_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 16, // Better spacing around playback controls
  },
  transportBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  transportBtnDisabled: {
    opacity: 0.3,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: tokens.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  playBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
