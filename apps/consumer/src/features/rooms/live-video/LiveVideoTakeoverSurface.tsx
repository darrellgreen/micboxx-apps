import { StyleSheet, Text, View } from "react-native";

import type { LiveVideoTakeoverSurfaceProps } from "./types";

export function LiveVideoTakeoverSurface({
  artistName,
}: LiveVideoTakeoverSurfaceProps) {
  return (
    <View pointerEvents="none" style={styles.surface}>
      <Text style={styles.status}>{artistName} is live</Text>
      <Text style={styles.detail}>Live video requires a native development build.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05070a",
    paddingHorizontal: 24,
  },
  status: {
    color: "#f4f5f7",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  detail: {
    color: "rgba(244,245,247,0.66)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
});
