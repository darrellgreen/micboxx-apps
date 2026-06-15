import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@micboxx/ui';
import { DiscoverTabIcon } from '@/components/icons/DiscoverTabIcon';
import { SearchTabIcon } from '@/components/icons/SearchTabIcon';
import { SoundwaveTabIcon } from '@/components/icons/SoundwaveTabIcon';
import { VideoLibraryIcon } from '@/components/icons/VideoLibraryIcon';
import { tokens } from '@micboxx/theme';
import { usePlayerSheet } from '@/features/player/context/PlayerSheetContext';

const TABS = [
  { name: 'home', label: 'Discover', route: '/(tabs)/home' },
  { name: 'search', label: 'Search', route: '/(tabs)/search' },
  { name: 'rooms', label: 'Rooms', route: '/(tabs)/rooms' },
  { name: 'premium', label: 'Premium', route: '/(tabs)/premium' },
  { name: 'library', label: 'Library', route: '/(tabs)/library' },
] as const;

type TabName = (typeof TABS)[number]['name'];

const TAB_ICON_SIZE = 28;
const TAB_BAR_HEIGHT = 60;
const TRACK_LISTING_SURFACE = 'rgba(255,255,255,0.035)';

function resolveActiveTab(pathname: string): TabName | null {
  if (pathname === '/' || pathname.includes('/home')) return 'home';
  if (pathname.includes('/search')) return 'search';
  if (pathname.includes('/rooms')) return 'rooms';
  if (pathname.includes('/premium')) return 'premium';
  if (pathname.includes('/library')) return 'library';
  return null;
}

export function PersistentTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = resolveActiveTab(pathname);
  const lastActiveTabRef = useRef<TabName>('home');
  const { progress } = usePlayerSheet();

  if (activeTab) {
    lastActiveTabRef.current = activeTab;
  }

  const displayActiveTab = activeTab ?? lastActiveTabRef.current;

  const animatedStyle = useAnimatedStyle(() => {
    // Translate the tab bar fully off-screen (120px is safely more than its height + padding)
    const translateY = progress.value * 120;
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View
      style={[styles.wrapper, { paddingBottom: Math.max(4, insets.bottom) }, animatedStyle]}
    >
      <BlurView intensity={70} tint="dark" style={styles.blur}>
        <View style={styles.bar}>
          <View style={styles.tabGroup}>
            {TABS.map((tab) => (
              <TabButton
                key={tab.name}
                routeName={tab.name}
                label={tab.label}
                focused={displayActiveTab === tab.name}
                onPress={() => router.navigate(tab.route as never)}
              />
            ))}
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

function TabButton({
  routeName,
  label,
  focused,
  onPress,
}: {
  routeName: TabName;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const focusProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, focused]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [0.66, 1]),
    transform: [{ translateY: interpolate(focusProgress.value, [0, 1], [0, -0.5]) }],
  }));

  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={styles.tab}>
      <Animated.View style={iconStyle}>
        <TabIcon routeName={routeName} focused={focused} />
      </Animated.View>
      <Animated.Text style={styles.label}>{label}</Animated.Text>
    </AnimatedPressable>
  );
}

function TabIcon({ routeName, focused }: { routeName: TabName; focused: boolean }) {
  const color = focused ? '#F5F8FF' : 'rgba(216, 223, 238, 0.52)';

  if (routeName === 'search') return <SearchTabIcon size={TAB_ICON_SIZE} color={color} />;
  if (routeName === 'rooms') return <SoundwaveTabIcon size={TAB_ICON_SIZE} color={color} />;
  if (routeName === 'premium')
    return <Ionicons name="diamond-outline" size={TAB_ICON_SIZE} color={color} />;
  if (routeName === 'library') return <VideoLibraryIcon size={TAB_ICON_SIZE} color={color} />;
  return <DiscoverTabIcon size={TAB_ICON_SIZE} color={color} />;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  blur: {
    marginHorizontal: 12,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: TRACK_LISTING_SURFACE,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    minHeight: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  label: {
    color: 'rgba(216, 223, 238, 0.52)',
    fontSize: 10,
    fontWeight: '500',
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
