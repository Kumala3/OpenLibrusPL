// Keep school data off backups and device transfers.
//
// expo-secure-store only excludes its own entries from backup, so by default
// the grades file and the Librus session cookies still went to Google backups
// and to Android 12+ phone-to-phone transfers. A copied session cookie is a
// way into the account, so nothing of this app's is backed up or transferred.

const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];
const exclude = DOMAINS.map((d) => `    <exclude domain="${d}" path="." />`).join('\n');

const DATA_EXTRACTION = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${exclude}
  </cloud-backup>
  <device-transfer>
${exclude}
  </device-transfer>
</data-extraction-rules>
`;

const FULL_BACKUP = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
${exclude.replace(/^ {4}/gm, '  ')}
</full-backup-content>
`;

module.exports = function withPrivacy(config) {
  config = withDangerousMod(config, ['android', (c) => {
    const dir = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'no_data_extraction.xml'), DATA_EXTRACTION);
    fs.writeFileSync(path.join(dir, 'no_backup.xml'), FULL_BACKUP);
    return c;
  }]);
  return withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = '@xml/no_backup';
    app.$['android:dataExtractionRules'] = '@xml/no_data_extraction';
    return c;
  });
};
