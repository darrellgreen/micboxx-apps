#!/usr/bin/env node

const supportedMajor = 24;
const recommendedVersion = "24.14.0";
const current = process.versions.node;
const [major] = current.split(".").map(Number);

if (major !== supportedMajor) {
  console.error(
    [
      "",
      `MicBoxx Mobile requires Node ${supportedMajor}.x for Expo SDK 54 local development.`,
      `Detected Node ${current}.`,
      "",
      `Use the repo-pinned runtime (${recommendedVersion}) before running Expo commands:`,
      "  nvm use",
      "",
      "Why this guard exists:",
      "- Node 25 breaks local Expo web startup in this repo.",
      "- The supported launch verification path depends on a stable Expo runtime.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
