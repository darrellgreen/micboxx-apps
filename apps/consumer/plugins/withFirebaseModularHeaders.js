/**
 * Expo config plugin: enable CocoaPods modular headers.
 *
 * @react-native-firebase v22 pulls in Swift pods (FirebaseCoreInternal) that
 * depend on non-modular Obj-C pods (GoogleUtilities). When pods are built as
 * static libraries — which this app requires, because react-native-webrtc
 * (LiveKit) is incompatible with `use_frameworks!` — Swift cannot import those
 * dependencies unless they generate module maps.
 *
 * `use_modular_headers!` produces those module maps globally without switching
 * to frameworks, so Firebase and WebRTC coexist. This is the fix the CocoaPods
 * error itself recommends and the one documented by react-native-firebase for
 * non-framework builds.
 *
 * It is intentionally NOT `useFrameworks: "static"` via expo-build-properties:
 * that would break react-native-webrtc.
 *
 * Placement: `use_modular_headers!` is injected INSIDE the target block, right
 * after `use_expo_modules!`. Placing it globally before the target block is not
 * enough — CocoaPods needs it after the expo modules are registered so it
 * applies to all dynamically-added pods. (Confirmed by the arttrackers_mobile_v2
 * project which solved the identical error the same way.)
 */

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const GLOBAL_MARKER = "use_modular_headers!";

// Targeted modular-header declarations for the exact pods the static build
// complains about. Belt-and-suspenders alongside the global directive.
const TARGETED_PODS = [
  "GoogleUtilities",
  "FirebaseCoreInternal",
  "FirebaseCore",
];

const TARGETED_BLOCK_MARKER = "# firebase-modular-headers (managed)";

/** @param {import('@expo/config-plugins').ExportedConfig} config */
const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );

      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }

      let contents = fs.readFileSync(podfilePath, "utf8");
      let changed = false;

      // 1. Inject `use_modular_headers!` INSIDE the target block, right after
      //    `use_expo_modules!`. This ensures it applies to all pods that
      //    use_expo_modules! registers. (Matching arttrackers_mobile_v2 fix.)
      if (!contents.includes(GLOBAL_MARKER)) {
        const anchor = /^(\s*)(use_expo_modules!.*$)/m;
        if (anchor.test(contents)) {
          contents = contents.replace(anchor, `$1$2\n$1${GLOBAL_MARKER}`);
        } else {
          // Fallback: prepend globally if use_expo_modules! not found.
          contents = `${GLOBAL_MARKER}\n${contents}`;
        }
        changed = true;
      }

      // 2. Targeted per-pod declarations inside the target block. Inserted right
      //    after `use_native_modules!`, which is stable across Expo templates.
      if (!contents.includes(TARGETED_BLOCK_MARKER)) {
        const anchor = /^(\s*)(config = use_native_modules!.*$)/m;
        const match = contents.match(anchor);
        if (match) {
          const indent = match[1] ?? "  ";
          const lines = [
            `${indent}${TARGETED_BLOCK_MARKER}`,
            ...TARGETED_PODS.map(
              (pod) => `${indent}pod '${pod}', :modular_headers => true`,
            ),
          ].join("\n");
          contents = contents.replace(anchor, `$1$2\n${lines}`);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;
