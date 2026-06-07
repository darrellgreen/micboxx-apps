#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const apps = new Map([
  ["consumer", "@micboxx/consumer"],
  ["creator", "@micboxx/creator"],
]);
const platforms = new Set(["ios", "android", "all"]);

const [, , appName, requestedPlatform = "all"] = process.argv;

if (!apps.has(appName) || !platforms.has(requestedPlatform)) {
  console.error(
    [
      "Usage: node scripts/eas-production-build.mjs <consumer|creator> [ios|android|all]",
      "",
      "Examples:",
      "  npm run build:consumer:ios",
      "  npm run build:creator:android",
      "  npm run build:consumer",
    ].join("\n"),
  );
  process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = apps.get(appName);
const appRoot = path.join(repoRoot, "apps", appName);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      EXPO_NO_TELEMETRY: "1",
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Preparing ${appName} production build for ${requestedPlatform}...`);
run("npm", ["run", "typecheck", `--workspace=${workspace}`]);
run("npx", [
  "eas-cli",
  "build",
  "--profile",
  "production",
  "--platform",
  requestedPlatform,
  "--non-interactive",
], { cwd: appRoot });
