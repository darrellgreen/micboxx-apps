export type TrackPlayerBundle = never;

export type TrackPlayerRuntimeStatus =
  | "available"
  | "expo-go"
  | "native-module-missing";

export function isExpoGoRuntime(): boolean {
  return false;
}

export function getTrackPlayerRuntimeStatus(): TrackPlayerRuntimeStatus {
  return "native-module-missing";
}

export function getTrackPlayerRuntimeMessage(): string {
  return "MicBoxx uses the Expo audio fallback on web builds.";
}

export function tryGetTrackPlayerBundle(): TrackPlayerBundle | null {
  return null;
}

export function requireTrackPlayerBundle(): TrackPlayerBundle {
  throw new Error(getTrackPlayerRuntimeMessage());
}
