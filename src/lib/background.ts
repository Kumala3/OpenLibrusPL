// The optional background check. Android's WorkManager wakes the app every
// 30, 60 or 120 minutes at the soonest (later when it saves battery), only
// when the phone has a connection: Wi-Fi or mobile data, or Wi-Fi alone if the
// user chose that in Konto. The check makes the 12 requests of the light plan
// (sync.ts), merges them into the saved copy and sends one notification for
// whatever is new. It does nothing at night, without a saved login, or after
// Librus has rejected the saved password.
//
// The task is defined at module load from index.js, before the app renders,
// because WorkManager can start the JavaScript with no screen at all.

import * as BackgroundTask from 'expo-background-task';
import * as Network from 'expo-network';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { LibrusClient, LibrusError } from '../librus/client';
import { normalize } from '../librus/normalize';
import { fetchSnapshot } from '../librus/sync';
import type { AppData } from '../librus/types';
import { notifyNews, scheduleReminders } from './reminders';
import { backgroundInterval, backgroundWifiOnly, remindersOn } from './settings';
import { loadCredentials, loadData, loadSyncMeta, saveData, saveSyncMeta } from './storage';

const TASK = 'librus-background-check';
const QUIET_FROM = 22;
const QUIET_UNTIL = 6;
/** A full sync or a check this recent makes another one pointless. */
const MIN_GAP_MS = 10 * 60 * 1000;
const supported = Platform.OS === 'android';

// When the app happens to be open while a check runs, the screens hear about it.
const listeners = new Set<(data: AppData) => void>();
export function onBackgroundData(listener: (data: AppData) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function backgroundCheck(): Promise<'skipped' | 'done'> {
  const hour = new Date().getHours();
  if (hour >= QUIET_FROM || hour < QUIET_UNTIL) return 'skipped';
  if (!backgroundInterval()) return 'skipped';
  if (loadSyncMeta().loginRejected) return 'skipped';
  if (backgroundWifiOnly()) {
    const net = await Network.getNetworkStateAsync().catch(() => null);
    if (net?.type !== Network.NetworkStateType.WIFI) return 'skipped';
  }
  const previous = loadData();
  if (!previous || Date.now() - Date.parse(previous.syncedAt) < MIN_GAP_MS) return 'skipped';
  const creds = await loadCredentials();
  if (!creds) return 'skipped';

  const client = new LibrusClient((url, init) => fetch(url, init));
  let next: AppData;
  try {
    next = normalize(await fetchSnapshot(client, async () => creds, undefined, true), previous);
  } catch (e) {
    // Same rule as the app: a refused password stops every automatic attempt.
    const kind = e instanceof LibrusError && e.kind !== 'http' ? e.kind : 'other';
    saveSyncMeta({ lastFailureAt: Date.now(), lastFailureKind: kind, loginRejected: kind === 'auth' });
    throw e;
  }
  saveData(next);
  saveSyncMeta({});
  listeners.forEach((l) => l(next));
  await scheduleReminders(next, remindersOn());
  await notifyNews(next.news.filter((n) => n.at === next.syncedAt));
  return 'done';
}

if (supported) {
  TaskManager.defineTask(TASK, async () => {
    try {
      await backgroundCheck();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Starts, changes or stops the periodic check. null stops it. */
export async function setBackgroundCheck(minutes: number | null) {
  if (!supported) return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(TASK)) await BackgroundTask.unregisterTaskAsync(TASK);
    if (minutes) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: minutes });
  } catch {
    // Restricted by the system (battery saver, an OEM task killer): nothing to do here.
  }
}

/** Registers the check if the setting asks for one and it is not running yet. */
export async function ensureBackgroundCheck() {
  if (!supported) return;
  const minutes = backgroundInterval();
  try {
    if (minutes && !(await TaskManager.isTaskRegisteredAsync(TASK))) {
      await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: minutes });
    }
  } catch {
    // Restricted by the system: the app still works, only without the check.
  }
}
