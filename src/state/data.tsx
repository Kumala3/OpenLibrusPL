// App state: the school data, and the one place allowed to talk to Librus.
//
// The rate rules from librus-agent hold here too. No background fetch. A sync
// runs on launch only when the copy is older than six hours, by hand at most
// every few minutes, and never twice at once. A calendar week outside the copy
// costs one request, once, and is then cached.

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { LibrusClient, LibrusError, type Credentials } from '../librus/client';
import { flattenTimetable, normalize } from '../librus/normalize';
import { fetchSnapshot, fetchWeek, type RawSnapshot } from '../librus/sync';
import type { AppData } from '../librus/types';
import { done } from '../lib/feel';
import { loadCredentials, loadData, loadSyncMeta, saveCredentials, saveData, saveSyncMeta, wipe } from '../lib/storage';
import { ensureBackgroundCheck, onBackgroundData, setBackgroundCheck } from '../lib/background';
import { cancelReminders, scheduleReminders } from '../lib/reminders';
import { checkForUpdate } from '../lib/updates';
import { remindersOn } from '../lib/settings';

const AUTO_SYNC_AFTER_MS = 6 * 60 * 60 * 1000;
const MANUAL_COOLDOWN_MS = 3 * 60 * 1000;

type Status = 'loading' | 'signed-out' | 'ready';

type DataState = {
  status: Status;
  data: AppData | null;
  syncing: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  /** What kind of failure `error` is. 'auth' means the saved login no longer works and the user must sign in again. */
  errorKind: 'auth' | 'network' | 'other' | null;
  hasCredentials: boolean;
  signIn: (c: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  loadWeek: (weekStart: string) => Promise<void>;
};

const Ctx = createContext<DataState | null>(null);

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}

/** For screens that only render once data exists (everything behind the login). */
export function useAppData(): AppData {
  const { data } = useData();
  if (!data) throw new Error('No data yet');
  return data;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<DataState['progress']>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<DataState['errorKind']>(null);
  const [hasCredentials, setHasCredentials] = useState(false);

  const client = useMemo(() => new LibrusClient((url, init) => fetch(url, init)), []);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastAttempt = useRef(0);
  const weeksTried = useRef(new Set<string>());
  // The latest data for callbacks that outlive a render (a sync, a week fetch).
  // Written where data changes, never during render.
  const dataRef = useRef<AppData | null>(null);
  useEffect(() => { dataRef.current = data; }, [data]);

  const commit = useCallback((next: AppData) => {
    saveData(next);
    dataRef.current = next;
    setData(next);
    scheduleReminders(next, remindersOn());
  }, []);

  const sync = useCallback((creds?: Credentials) => {
    if (inFlight.current) return inFlight.current;
    lastAttempt.current = Date.now();
    const run = (async () => {
      setSyncing(true);
      setError(null);
      setErrorKind(null);
      try {
        const credentials = async () => creds ?? (await loadCredentials());
        const snap = await fetchSnapshot(client, credentials, (done, total) => setProgress({ done, total }));
        commit(normalize(snap, dataRef.current));
        if (creds) {
          await saveCredentials(creds);
          setHasCredentials(true);
        }
        saveSyncMeta({});
        setStatus('ready');
      } catch (e) {
        const kind = e instanceof LibrusError && e.kind !== 'http' ? e.kind : 'other';
        setError(e instanceof LibrusError ? e.message : `Błąd: ${String((e as Error)?.message ?? e)}`);
        setErrorKind(kind);
        // The saved password was refused: stop every automatic retry until the
        // user signs in again. A login typed just now (creds) was never saved.
        saveSyncMeta({ lastFailureAt: Date.now(), lastFailureKind: kind, loginRejected: kind === 'auth' && !creds });
        throw e;
      } finally {
        setSyncing(false);
        setProgress(null);
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [client, commit]);

  // A background check may have saved a newer copy: one that ran while the app
  // was open tells us directly, one that ran while it was closed is on disk.
  useEffect(() => {
    const take = (next: AppData | null) => {
      if (!next || (dataRef.current && next.syncedAt <= dataRef.current.syncedAt)) return;
      dataRef.current = next;
      setData(next);
    };
    const off = onBackgroundData(take);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') take(loadData()); });
    return () => { off(); sub.remove(); };
  }, []);

  // Launch: everything renders from disk first, network or not.
  useEffect(() => {
    (async () => {
      let stored = loadData();
      if (!stored && Platform.OS === 'web') stored = await loadWebFixture();
      const creds = await loadCredentials();
      setHasCredentials(Boolean(creds));
      if (creds) ensureBackgroundCheck();
      if (Platform.OS !== 'web') checkForUpdate();
      if (stored) {
        setData(stored);
        setStatus('ready');
        const meta = loadSyncMeta();
        if (meta.loginRejected) {
          setError('Zapisane logowanie nie działa');
          setErrorKind('auth');
          return;
        }
        // Background checks refresh only part of the copy, so the six hours
        // count from the last full sync.
        const age = Date.now() - new Date(stored.fullSyncedAt ?? stored.syncedAt).getTime();
        // A recent failure that was not just "offline" waits out the same six
        // hours, so a broken Librus is not asked again on every app open.
        const failedRecently = meta.lastFailureAt != null && meta.lastFailureKind !== 'network'
          && Date.now() - meta.lastFailureAt < AUTO_SYNC_AFTER_MS;
        if (creds && age > AUTO_SYNC_AFTER_MS && !failedRecently) sync().catch(() => {});
      } else {
        setStatus('signed-out');
      }
    })();
  }, [sync]);

  const signIn = useCallback(async (c: Credentials) => {
    // Log in before anything is stored, so a typo never lands in the keystore.
    await client.login(c);
    await sync(c);
    await ensureBackgroundCheck();
  }, [client, sync]);

  const signOut = useCallback(async () => {
    await cancelReminders();
    await setBackgroundCheck(null);
    await wipe();
    weeksTried.current.clear();
    setData(null);
    setError(null);
    setErrorKind(null);
    setHasCredentials(false);
    setStatus('signed-out');
  }, []);

  // A failed network attempt may be retried at once: the phone was offline, so
  // Librus saw nothing. A rejected login is never retried from here; the header
  // sends the user to sign in instead.
  const refresh = useCallback(async () => {
    const cooling = Date.now() - lastAttempt.current < MANUAL_COOLDOWN_MS;
    if (!hasCredentials || errorKind === 'auth' || (cooling && errorKind !== 'network')) return;
    // A pull-to-refresh is something the user did and waited for, so its end gets a tick.
    await sync().then(done, () => {});
  }, [sync, errorKind, hasCredentials]);

  const loadWeek = useCallback(async (weekStart: string) => {
    const current = dataRef.current;
    // Without a working saved login there is no way to fetch, and trying would
    // re-send a rejected password, so do not spend a request finding that out.
    if (!current || !hasCredentials || errorKind === 'auth') return;
    if (current.timetable[weekStart] || weeksTried.current.has(weekStart)) return;
    weeksTried.current.add(weekStart);
    try {
      const payload = await fetchWeek(client, loadCredentials, weekStart);
      const latest = dataRef.current ?? current;
      commit({ ...latest, timetable: { ...latest.timetable, [weekStart]: flattenTimetable(payload, latest.lookup) } });
    } catch {
      // Offline: the calendar says the week is not downloaded. Tried once per launch.
    }
  }, [client, commit, hasCredentials, errorKind]);

  const value = useMemo<DataState>(
    () => ({ status, data, syncing, progress, error, errorKind, hasCredentials, signIn, signOut, refresh, loadWeek }),
    [status, data, syncing, progress, error, errorKind, hasCredentials, signIn, signOut, refresh, loadWeek],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Development on web only: Librus blocks browser requests (CORS), so the UI is
 * built against a snapshot fetched at runtime from public/fixture.json, which
 * is gitignored. Fetched, never imported, so no one's grades end up in a bundle.
 */
async function loadWebFixture(): Promise<AppData | null> {
  try {
    const r = await fetch('/fixture.json');
    if (!r.ok) return null;
    const s = await r.json();
    const { TimetableThisWeek, TimetableNextWeek, ...raw } = s.raw;
    const snap: RawSnapshot = {
      syncedAt: s.syncedAt,
      raw,
      weeks: {
        [weekOf(TimetableThisWeek)]: TimetableThisWeek,
        [weekOf(TimetableNextWeek)]: TimetableNextWeek,
      },
      luckyDay: s.syncedAt.slice(0, 10),
    };
    return normalize(snap, null);
  } catch {
    return null;
  }
}
const weekOf = (payload: any) => Object.keys(payload?.Timetable ?? {}).sort()[0] ?? 'unknown';
