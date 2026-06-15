import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useNowPlaying } from '@/features/player/hooks/useNowPlaying';
import { tokens } from '@micboxx/theme';

export function PlayerArtwork({ size = 48 }: { size?: number }) {
  const { currentItem } = useNowPlaying();

  const radius = size / 5;

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: radius }]}>
      {currentItem?.artworkUrl ? (
        <Image
          source={{ uri: currentItem.artworkUrl }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: tokens.colors.bgElevated,
  },
  placeholder: {
    flex: 1,
    backgroundColor: tokens.colors.bgElevated,
  },
});
