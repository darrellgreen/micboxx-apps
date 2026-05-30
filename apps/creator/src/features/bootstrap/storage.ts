import AsyncStorage from "@react-native-async-storage/async-storage";

function keyFor(userUuid: string, suffix: string) {
  return `micboxx.creators.${suffix}.${userUuid}`;
}

export async function readCreatorIntroSeen(userUuid: string): Promise<boolean> {
  if (!userUuid) {
    return false;
  }

  return (await AsyncStorage.getItem(keyFor(userUuid, "intro_seen"))) === "1";
}

export async function writeCreatorIntroSeen(userUuid: string): Promise<void> {
  if (!userUuid) {
    return;
  }

  await AsyncStorage.setItem(keyFor(userUuid, "intro_seen"), "1");
}

export async function readCreatorOnboardingComplete(
  userUuid: string,
): Promise<boolean> {
  if (!userUuid) {
    return false;
  }

  return (
    (await AsyncStorage.getItem(keyFor(userUuid, "onboarding_complete"))) ===
    "1"
  );
}

export async function writeCreatorOnboardingComplete(
  userUuid: string,
): Promise<void> {
  if (!userUuid) {
    return;
  }

  await AsyncStorage.setItem(keyFor(userUuid, "onboarding_complete"), "1");
}
