const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getSentryExpoConfig(projectRoot);

// Watch all files within the monorepo (needed for shared packages)
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

// Explicit resolution paths so Metro finds native modules in the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;