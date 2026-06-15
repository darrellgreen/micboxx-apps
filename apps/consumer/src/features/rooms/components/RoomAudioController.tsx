import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';

import { tokens } from '@micboxx/theme';

interface RoomAudioControllerProps {
  onJoin: () => Promise<void>;
}

export function RoomAudioController({ onJoin }: RoomAudioControllerProps) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handlePress = async () => {
    setJoining(true);
    setError(null);
    try {
      await onJoin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Room audio.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => void handlePress()}
        disabled={joining}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Join Room Audio"
      >
        <View style={styles.dotWrap}>
          <Animated.View style={[styles.dotPing, { opacity: pulseAnim }]} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.label}>{joining ? 'Starting…' : 'Join Room Audio'}</Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(14,16,22,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.18)',
  },
  dotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.colors.accent,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.accent,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: tokens.colors.danger ?? '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
