import 'react-native-gesture-handler/jestSetup';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native-reanimated', () => {
  return {
    withTiming: jest.fn((toValue, config, callback) => {
      return { toValue, callback };
    }),
    runOnJS: jest.fn((fn) => fn),
    useSharedValue: jest.fn((val) => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn(() => ({ value: 0 })),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn(),
  updateOptions: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
  skip: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
  seekTo: jest.fn(),
  setVolume: jest.fn(),
  setRate: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  getActiveTrack: jest.fn(),
  getActiveTrackIndex: jest.fn(),
  getQueue: jest.fn(),
  getVolume: jest.fn(),
  getRate: jest.fn(),
  getProgress: jest.fn(),
  State: {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Buffering: 'buffering',
    Loading: 'loading',
    Error: 'error',
    Ended: 'ended',
  },
  useTrackPlayerEvents: jest.fn(),
  usePlaybackState: jest.fn(),
  useProgress: jest.fn(),
  useActiveTrack: jest.fn(),
}));

jest.mock('react-native-worklets-core', () => {});
jest.mock('react-native-worklets', () => {});
