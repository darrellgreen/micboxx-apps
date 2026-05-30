import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS !== "web";

/** Barely-perceptible tap — buttons, cards, toggles. */
export function hapticLight() {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Picker / tab switch click. */
export function hapticSelection() {
  if (enabled) void Haptics.selectionAsync();
}

/** Positive confirmation — like, dismiss, purchase. */
export function hapticSuccess() {
  if (enabled)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
