import { tokens } from "@micboxx/theme";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  uri?: string | null;
  displayName: string;
  size?: number;
}

export function Avatar({ uri, displayName, size = 44 }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        contentFit="cover"
        transition={160}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: tokens.colors.bgApp,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
  },
  fallback: {
    backgroundColor: tokens.colors.accentStrong,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: tokens.colors.textPrimary,
    fontWeight: "700",
  },
});
