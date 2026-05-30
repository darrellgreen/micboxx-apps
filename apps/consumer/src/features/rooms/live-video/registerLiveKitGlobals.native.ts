import { NativeModules } from "react-native";

let didRegister = false;

type LiveKitReactNativeModule = {
  registerGlobals: (options?: { autoConfigureAudioSession?: boolean }) => void;
};

export function registerRoomLiveKitGlobals(): void {
  if (didRegister) {
    return;
  }

  if (!NativeModules.LivekitReactNativeModule) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const liveKit = require("@livekit/react-native") as LiveKitReactNativeModule;
    liveKit.registerGlobals({ autoConfigureAudioSession: false });
    didRegister = true;
  } catch {
    // The native module is unavailable in Expo Go or older development builds.
  }
}
