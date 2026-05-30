const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getSentryExpoConfig(projectRoot);

// Watch all files within the monorepo (needed for shared packages)
config.watchFolders = [monorepoRoot];

// Resolve packages from both app-local and hoisted root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;