import { Image } from "expo-image";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

import {
  DEFAULT_WAVEFORM_DISPLAY_MODE,
  type WaveformDisplayMode,
} from "@/features/player/config/waveforms";
import { StylizedWaveform } from "@/features/player/components/StylizedWaveform";

interface TrackWaveformProps {
  darkWaveformUrl?: string | null;
  lightWaveformUrl?: string | null;
  fallbackWaveformUrl?: string | null;
  progressPercent: number;
  height?: number;
  accentColor?: string;
  mode?: WaveformDisplayMode;
}

export function TrackWaveform({
  darkWaveformUrl,
  lightWaveformUrl,
  fallbackWaveformUrl,
  progressPercent,
  height = 44,
  accentColor = "#B9FF5D",
  mode = DEFAULT_WAVEFORM_DISPLAY_MODE,
}: TrackWaveformProps) {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const baseWaveformUrl = darkWaveformUrl ?? fallbackWaveformUrl ?? lightWaveformUrl ?? null;
  const activeWaveformUrl = lightWaveformUrl ?? fallbackWaveformUrl ?? darkWaveformUrl ?? null;
  const clampedProgress = Math.max(0, Math.min(1, progressPercent));
  const playedWidth = layoutWidth * clampedProgress;
  const useFauxWaveform =
    mode !== "real" || !baseWaveformUrl || !activeWaveformUrl;

  function onLayout(event: LayoutChangeEvent) {
    setLayoutWidth(event.nativeEvent.layout.width);
  }

  if (useFauxWaveform) {
    return (
      <StylizedWaveform
        progress={clampedProgress}
        height={height}
        activeColor={accentColor}
      />
    );
  }

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      <Image source={{ uri: baseWaveformUrl }} style={styles.waveform} contentFit="fill" />
      <View style={[styles.playedMask, { width: playedWidth }]}>
        <Image source={{ uri: activeWaveformUrl }} style={styles.waveform} contentFit="fill" />
      </View>
      <View style={[styles.playhead, { left: playedWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
  },
  waveform: {
    ...StyleSheet.absoluteFillObject,
  },
  playedMask: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  playhead: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  barFallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    overflow: "hidden",
  },
  fallbackBar: {
    width: 4,
    borderRadius: 999,
    alignSelf: "center",
  },
});
