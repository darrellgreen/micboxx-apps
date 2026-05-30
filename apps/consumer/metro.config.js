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

module.exports = config;