export type WaveformDisplayMode = "faux" | "real";

export const DEFAULT_WAVEFORM_DISPLAY_MODE: WaveformDisplayMode = "faux";

export function shouldUseRealWaveformsByDefault() {
  return DEFAULT_WAVEFORM_DISPLAY_MODE === "real";
}
