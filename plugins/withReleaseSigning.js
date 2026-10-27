// Sign release builds with a private key, when one is configured.
//
// The generated android/ project signs releases with React Native's debug
// keystore, which is public: anyone could sign a fake "update" that Android
// would install over the real app, inheriting its stored password and data.
// A private upload key closes that.
//
// The key never enters the repo. Configure it in ~/.gradle/gradle.properties:
//
//   OPENLIBRUS_STORE_FILE=C:/Users/you/.android-keys/openlibruspl.jks
//   OPENLIBRUS_STORE_PASSWORD=...
//   OPENLIBRUS_KEY_ALIAS=openlibruspl
//   OPENLIBRUS_KEY_PASSWORD=...
//
// Without those properties, release builds keep the debug key as before.

const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        release {
            if (project.hasProperty('OPENLIBRUS_STORE_FILE')) {
                storeFile file(OPENLIBRUS_STORE_FILE)
                storePassword OPENLIBRUS_STORE_PASSWORD
                keyAlias OPENLIBRUS_KEY_ALIAS
                keyPassword OPENLIBRUS_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    let g = c.modResults.contents;
    if (g.includes('OPENLIBRUS_STORE_FILE')) return c;
    // Add a release signing config beside the debug one...
    g = g.replace(/signingConfigs \{\n(\s+)debug \{/, (m) => m.replace('signingConfigs {', `signingConfigs {${SIGNING}`));
    // ...and use it for release builds when the key is configured.
    g = g.replace(
      /(release \{[^}]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('OPENLIBRUS_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    c.modResults.contents = g;
    return c;
  });
};
