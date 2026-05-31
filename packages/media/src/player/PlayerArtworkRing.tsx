import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, StyleSheet, View } from "react-native";

import { tokens } from "@micboxx/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ARTWORK_SIZE = SCREEN_WIDTH * 0.52;
const RING_PAD = 1;
const RING_SIZE = ARTWORK_SIZE + RING_PAD * 2;

interface PlayerArtworkRingProps {
  artworkUrl?: string | null;
}

export function PlayerArtworkRing({ artworkUrl }: PlayerArtworkRingProps) {
  return (
    <View style={s.artworkSection}>
      <LinearGradient
        colors={[
          tokens.colors.brandSecondary,
          tokens.colors.brandPrimary,
          tokens.colors.brandTertiary,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.artworkRing}
      >
        <View style={s.artworkInner}>
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={s.artworkImg}
              contentFit="cover"
            />
          ) : (
            <View style={[s.artworkImg, s.artworkFallback]} />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  artworkSection: {
    alignItems: "center",
    marginTop: 8,
  },
  artworkRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  artworkInner: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_SIZE / 2,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  artworkImg: { width: "100%", height: "100%" },
  artworkFallback: { backgroundColor: tokens.colors.panelStrong },
});
