const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getSentryExpoConfig(projectRoot);

// Watch all files within the monorepo (needed for shared packages)
config.watchFolders = [monorepoRoot];

// Ensure Metro resolves from explicit paths only — prevents hoisting
// issues with native modules like @livekit/react-native-webrtc
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Stub out deprecated react-native modules that this app doesn't use.
// react-native/index.js exports them as lazy getters, and Expo's
// async-require importAll iterates every export, triggering the getters.
// PushNotificationIOS in particular immediately calls
//   new NativeEventEmitter(RCTPushNotificationManager)
// where the native module is null — crashing with an Invariant Violation.
//
// IMPORTANT: the require inside react-native/index.js uses a RELATIVE path
//   require('./Libraries/PushNotificationIOS/PushNotificationIOS')
// so the moduleName in resolveRequest is the relative form, NOT the absolute
// 'react-native/Libraries/...' form. We match by suffix to catch both.
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Catch relative ('./Libraries/PushNotificationIOS/PushNotificationIOS')
  // and absolute ('react-native/Libraries/PushNotificationIOS/PushNotificationIOS')
  if (moduleName.endsWith("/PushNotificationIOS/PushNotificationIOS")) {
    return {
      filePath: path.resolve(projectRoot, "stubs/PushNotificationIOS.js"),
      type: "sourceFile",
    };
  }
  if (_resolveRequest) {
    return _resolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;