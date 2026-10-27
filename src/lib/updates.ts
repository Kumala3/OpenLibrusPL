// Tells the user when a newer OpenLibrus is on GitHub. At most once a day, one
// request to the GitHub API for the latest release's tag; nothing about the
// user or their school goes with it, and no cookies. Switchable in Konto.
//
// The APK is always published as OpenLibrus.apk (.github/workflows/release.yml),
// so the download link never changes. Android installs it over this one
// because both are signed with the same key, and the login and data stay.

import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { read as readSettings, write as writeSettings } from './settings';

const REPO = 'Kumala3/OpenLibrusPL';
const DAY_MS = 24 * 60 * 60 * 1000;
export const DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/OpenLibrus.apk`;
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

export const currentVersion = (): string => Constants.expoConfig?.version ?? '0.0.0';

/** 1.10.0 is newer than 1.9.3: compared as numbers, part by part. */
export function isNewer(candidate: string, than: string) {
  const a = candidate.replace(/^v/, '').split('.').map(Number);
  const b = than.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** Checks GitHub if a day has passed since the last check. Never throws. */
export async function checkForUpdate() {
  const s = readSettings();
  if (s.updateChecks === false) return;
  if (s.updateCheckedAt && Date.now() - s.updateCheckedAt < DAY_MS) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json' },
      credentials: 'omit',
    });
    if (!r.ok) return;
    const tag = String((await r.json())?.tag_name ?? '').replace(/^v/, '');
    writeSettings({ ...readSettings(), updateCheckedAt: Date.now(), latestVersion: tag || undefined });
  } catch {
    // Offline or GitHub down: try again on a later launch.
  }
}

export function openDownload() {
  Linking.openURL(DOWNLOAD_URL);
}
