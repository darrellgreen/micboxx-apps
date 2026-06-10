/**
 * Suppress react-native core deprecation warnings that are not actionable.
 *
 * react-native/index.js exports several deprecated APIs (ProgressBarAndroid,
 * SafeAreaView, Clipboard, PushNotificationIOS) as lazy getters that call
 * warnOnce() → console.warn() when accessed. Expo's async-require importAll
 * iterates every react-native export when lazy-loading a screen, which
 * triggers all of these getters even though this app never uses the deprecated
 * APIs directly.
 *
 * LogBox.ignoreLogs() only suppresses the in-app yellow overlay — it doesn't
 * stop the Metro terminal from printing the raw console.warn output. Wrapping
 * console.warn here suppresses both.
 *
 * This file must be imported before any other module in _layout.tsx so the
 * filter is in place before any lazy navigation triggers importAll.
 */

const SUPPRESSED_PREFIXES = [
  "ProgressBarAndroid has been extracted from react-native core",
  "SafeAreaView has been deprecated",
  "Clipboard has been extracted from react-native core",
  "PushNotificationIOS has been extracted from react-native core",
];

const _originalWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    SUPPRESSED_PREFIXES.some((prefix) => (args[0] as string).startsWith(prefix))
  ) {
    return;
  }
  _originalWarn(...args);
};
