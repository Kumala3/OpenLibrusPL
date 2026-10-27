// User preferences that are not school data. One small JSON file, read
// synchronously at startup so the chosen theme applies before the first frame.

import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

export type ThemePref = 'system' | 'light' | 'dark';
export type Settings = {
  theme?: ThemePref;
  /** Target average per subject name, for "Moje cele". */
  goals?: Record<string, number>;
  /** Evening reminders before tests and kartkówki. Off until switched on. */
  reminders?: boolean;
  /** Minutes between background checks; absent means off. */
  background?: number;
  /** Background checks on Wi-Fi only. Off by default: at school there is only mobile data. */
  wifiOnly?: boolean;
  /** Daily check for a newer release on GitHub; on unless switched off. */
  updateChecks?: boolean;
  updateCheckedAt?: number;
  /** The newest release GitHub reported, without the "v". */
  latestVersion?: string;
  /** The newest "Co nowego" entry the user has seen, so the bell knows what is unread. */
  newsSeenAt?: string;
};

const FILE = 'librus-settings.json';
const isWeb = Platform.OS === 'web';

export function read(): Settings {
  try {
    if (isWeb) return JSON.parse(localStorage.getItem(FILE) ?? '{}');
    const file = new File(Paths.document, FILE);
    return file.exists ? JSON.parse(file.textSync()) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let snapshot: Settings | null = null;

export function write(s: Settings) {
  snapshot = s;
  listeners.forEach((l) => l());
  const raw = JSON.stringify(s);
  if (isWeb) { localStorage.setItem(FILE, raw); return; }
  const file = new File(Paths.document, FILE);
  if (!file.exists) file.create();
  file.write(raw);
}

export const loadThemePref = (): ThemePref => read().theme ?? 'system';
export const remindersOn = (): boolean => read().reminders === true;
export const backgroundInterval = (): number | null => read().background ?? null;
export const backgroundWifiOnly = (): boolean => read().wifiOnly === true;

export function setWifiOnly(on: boolean) {
  write({ ...read(), wifiOnly: on });
}

/**
 * Forces light or dark for the whole app, native dialogs and keyboard
 * included; 'system' hands it back to the phone's setting. useColorScheme()
 * follows, so every screen re-renders in the new colours.
 */
export function applyThemePref(pref: ThemePref) {
  try {
    Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
  } catch {
    // Web has no native override; it follows the browser.
  }
}

export function saveThemePref(pref: ThemePref) {
  write({ ...read(), theme: pref });
  applyThemePref(pref);
}

/**
 * The settings as React state: a screen re-renders when another one changes
 * them (the bell after "Co nowego" is opened, a goal set in a subject).
 */
export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => (snapshot ??= read()),
  );
}

export function setGoal(subject: string, target: number | null) {
  const s = read();
  const goals = { ...(s.goals ?? {}) };
  if (target == null) delete goals[subject];
  else goals[subject] = target;
  write({ ...s, goals });
}

export function setReminders(on: boolean) {
  write({ ...read(), reminders: on });
}

export function markNewsSeen(at: string) {
  write({ ...read(), newsSeenAt: at });
}

export function setBackgroundInterval(minutes: number | null) {
  const s = read();
  if (minutes == null) delete s.background;
  else s.background = minutes;
  write({ ...s });
}
