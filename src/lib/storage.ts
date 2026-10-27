// Where things live on the phone.
//
// The password goes to expo-secure-store (Android Keystore). The school data is
// one JSON file in the app's documents folder, read at every launch, which is
// what makes the app work with no connection. On web (development only) both
// fall back to localStorage.

import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as RN from 'react-native';
import { Platform } from 'react-native';
import type { Credentials } from '../librus/client';
import type { AppData } from '../librus/types';

const CREDS_KEY = 'librus-credentials';
const DATA_FILE = 'librus-data.json';
const isWeb = Platform.OS === 'web';

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = isWeb ? localStorage.getItem(CREDS_KEY) : await SecureStore.getItemAsync(CREDS_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

export async function saveCredentials(c: Credentials) {
  const raw = JSON.stringify(c);
  if (isWeb) localStorage.setItem(CREDS_KEY, raw);
  else await SecureStore.setItemAsync(CREDS_KEY, raw);
}

export function loadData(): AppData | null {
  try {
    if (isWeb) {
      const raw = localStorage.getItem(DATA_FILE);
      return raw ? withDefaults(JSON.parse(raw)) : null;
    }
    const file = new File(Paths.document, DATA_FILE);
    return file.exists ? withDefaults(JSON.parse(file.textSync())) : null;
  } catch {
    // A corrupt file is a sync away from fixed; never a reason to crash at launch.
    return null;
  }
}

/**
 * A copy saved by an older version lacks the sections added since. They start
 * empty and fill in on the next sync, so an update never crashes on old data.
 */
function withDefaults(d: any): AppData {
  return {
    ...d,
    lookup: { users: {}, subjects: {}, rooms: {}, ...(d.lookup ?? {}) },
    notes: d.notes ?? [],
    behaviour: d.behaviour ?? [],
    teacherAbsences: d.teacherAbsences ?? [],
    school: d.school ?? null,
    news: d.news ?? [],
    failed: d.failed ?? [],
  };
}

export function saveData(data: AppData) {
  const raw = JSON.stringify(data);
  if (isWeb) {
    localStorage.setItem(DATA_FILE, raw);
    return;
  }
  // Write beside, then swap, so a crash mid-write cannot leave half a file.
  const tmp = new File(Paths.document, `${DATA_FILE}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.write(raw);
  const file = new File(Paths.document, DATA_FILE);
  if (file.exists) file.delete();
  tmp.move(file);
}

/**
 * What the last sync attempt did, kept across launches so a failure is not
 * retried on every app open. `loginRejected` stops all automatic syncing until
 * the user signs in again: retrying a rejected password is how accounts lock.
 */
export type SyncMeta = { lastFailureAt?: number; lastFailureKind?: string; loginRejected?: boolean };
const META_FILE = 'librus-sync.json';

export function loadSyncMeta(): SyncMeta {
  try {
    if (isWeb) return JSON.parse(localStorage.getItem(META_FILE) ?? '{}');
    const file = new File(Paths.document, META_FILE);
    return file.exists ? JSON.parse(file.textSync()) : {};
  } catch {
    return {};
  }
}

export function saveSyncMeta(meta: SyncMeta) {
  const raw = JSON.stringify(meta);
  if (isWeb) { localStorage.setItem(META_FILE, raw); return; }
  const file = new File(Paths.document, META_FILE);
  if (!file.exists) file.create();
  file.write(raw);
}

/** Logout: the password, the data, and the Librus session cookies. */
export async function wipe() {
  if (isWeb) {
    localStorage.removeItem(CREDS_KEY);
    localStorage.removeItem(DATA_FILE);
    localStorage.removeItem(META_FILE);
    return;
  }
  await SecureStore.deleteItemAsync(CREDS_KEY);
  for (const name of [DATA_FILE, META_FILE]) {
    const file = new File(Paths.document, name);
    if (file.exists) file.delete();
  }
  // Networking is exported at runtime but missing from react-native's types.
  // It clears the system cookie store that expo/fetch writes to on Android.
  const networking = (RN as any).Networking;
  await new Promise<void>((resolve) => networking.clearCookies(() => resolve()));
}
