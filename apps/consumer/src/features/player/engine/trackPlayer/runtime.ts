import Constants from "expo-constants";

export type TrackPlayerBundle = typeof import("react-native-track-player");

export type TrackPlayerRuntimeStatus =
  | "available"
  | "expo-go"
  | "native-module-missing";

let cachedBundle: TrackPlayerBundle | null | undefined;

export function isExpoGoRuntime(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

export function getTrackPlayerRuntimeStatus(): TrackPlayerRuntimeStatus {
  if (isExpoGoRuntime()) {
    return "expo-go";
  }

  return tryGetTrackPlayerBundle() ? "available" : "native-module-missing";
}

export function getTrackPlayerRuntimeMessage(): string {
  const status = getTrackPlayerRuntimeStatus();

  if (status === "expo-go") {
    return "MicBoxx playback requires a development build or production build. Expo Go does not include react-native-track-player.";
  }

  if (status === "native-module-missing") {
    return "MicBoxx playback could not find the react-native-track-player native module. Rebuild the native app after installing dependencies.";
  }

  return "";
}

export function tryGetTrackPlayerBundle(): TrackPlayerBundle | null {
  if (cachedBundle !== undefined) {
    return cachedBundle;
  }

  if (isExpoGoRuntime()) {
    cachedBundle = null;
    return cachedBundle;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module: TrackPlayerBundle = require("react-native-track-player");
    cachedBundle = module;
    return cachedBundle;
  } catch {
    cachedBundle = null;
    return cachedBundle;
  }
}

export function requireTrackPlayerBundle(): TrackPlayerBundle {
  const bundle = tryGetTrackPlayerBundle();

  if (bundle) {
    return bundle;
  }

  throw new Error(getTrackPlayerRuntimeMessage());
}
