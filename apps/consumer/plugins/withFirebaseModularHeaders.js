/**
 * Expo config plugin: enable CocoaPods modular headers for Firebase.
 *
 * Mirrors the fix used in arttrackers_mobile_v2/plugins/withFirebaseHeaders.js.
 * Injects `use_modular_headers!` immediately after `use_expo_modules!` inside
 * the target block so CocoaPods generates module maps for Obj-C pods that Swift
 * Firebase pods depend on (GoogleUtilities → FirebaseCoreInternal).
 */

const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function addUseModularHeaders(podfile) {
  if (podfile.includes('use_modular_headers!')) {
    return podfile;
  }

  return podfile.replace(
    /use_expo_modules!/,
    `use_expo_modules!
  use_modular_headers!`
  );
}

const withFirebaseModularHeaders = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const original = fs.readFileSync(podfilePath, 'utf8');

      const updated = addUseModularHeaders(original);

      if (updated !== original) {
        fs.writeFileSync(podfilePath, updated);
        console.log('✅ Added use_modular_headers! to Podfile for Firebase compatibility');
      }

      return cfg;
    },
  ]);

module.exports = createRunOncePlugin(
  withFirebaseModularHeaders,
  'withFirebaseModularHeaders',
  '1.0.0'
);
