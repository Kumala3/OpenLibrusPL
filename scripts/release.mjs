// Prepares a release: sets the version in app.json, derives Android's
// versionCode from it, commits and tags. Pushing the tag starts the GitHub
// Actions build (.github/workflows/release.yml), which publishes the APK.
//
//   node scripts/release.mjs 1.1.0
//   git push && git push origin v1.1.0
//
// versionCode is major*10000 + minor*100 + patch, so it always grows with the
// version and Android installs each release over the previous one.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
if (!m) {
  console.error('Usage: node scripts/release.mjs <major.minor.patch>');
  process.exit(1);
}
const [, major, minor, patch] = m.map(Number);
if (minor > 99 || patch > 99) {
  console.error('minor and patch must be under 100 for the versionCode to stay ordered');
  process.exit(1);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) {
  console.error('Commit or stash your changes first.');
  process.exit(1);
}

const app = JSON.parse(readFileSync('app.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const code = major * 10000 + minor * 100 + patch;
if (code <= (app.expo.android.versionCode ?? 0)) {
  console.error(`${version} is not newer than ${app.expo.version}`);
  process.exit(1);
}
app.expo.version = version;
app.expo.android.versionCode = code;
pkg.version = version;
writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

git('add', 'app.json', 'package.json');
git('commit', '-m', `Release ${version}`);
git('tag', '-a', `v${version}`, '-m', `OpenLibrus ${version}`);
console.log(`Tagged v${version} (versionCode ${code}). Publish with:\n  git push && git push origin v${version}`);
