// Notifications, both kinds. Evening reminders before sprawdziany and
// kartkówki are scheduled on the phone from the copy it already has. News
// notifications come from the optional background check (lib/background.ts).
// Both are off until the user switches them on in Konto, which is also when
// Android asks for permission.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppData, NewsItem } from '../librus/types';
import { addDays, parse, today } from './dates';
import { eventKind } from './school';

const CHANNEL = 'tests';
const NEWS_CHANNEL = 'news';
const HOUR = 18;
const DAYS_AHEAD = 14;
const supported = Platform.OS === 'android';

if (supported) {
  // When the app is open at 18:00, show the reminder anyway.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
}

/** Polish plural forms: 1 sprawdzian, 2-4 sprawdziany, 5+ sprawdzianów. */
function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

async function ensureChannel() {
  // Subject names and grades stay off the lock screen.
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Sprawdziany i kartkówki',
    description: 'Przypomnienie wieczorem dzień wcześniej',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  await Notifications.setNotificationChannelAsync(NEWS_CHANNEL, {
    name: 'Nowe oceny i zmiany',
    description: 'Oceny, wpisy, ogłoszenia, uwagi i zmiany w planie znalezione w tle',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/** Asks for the Android 13+ permission. True when notifications can be shown. */
export async function allowNotifications(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replaces every scheduled reminder with one per day that has a test or a
 * kartkówka in the next two weeks, at 18:00 the evening before. Called after
 * each sync, so a moved or cancelled test moves or drops its reminder.
 */
export async function scheduleReminders(data: AppData | null, on: boolean) {
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!on || !data) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await ensureChannel();

    const from = today();
    const until = addDays(from, DAYS_AHEAD);
    const byDay = new Map<string, { subject: string; kind: 'sprawdzian' | 'kartkówka' }[]>();
    for (const h of data.homework) {
      if (!h.date || h.date <= from || h.date > until) continue;
      const k = eventKind(h.category);
      if (k !== 'test' && k !== 'quiz') continue;
      const list = byDay.get(h.date) ?? [];
      list.push({ subject: h.subject ?? '?', kind: k === 'test' ? 'sprawdzian' : 'kartkówka' });
      byDay.set(h.date, list);
    }

    for (const [day, list] of byDay) {
      const at = parse(addDays(day, -1));
      at.setHours(HOUR, 0, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      const tests = list.filter((x) => x.kind === 'sprawdzian').length;
      const quizzes = list.length - tests;
      const title = list.length === 1
        ? `Jutro ${list[0].kind}: ${list[0].subject}`
        : `Jutro: ${[
          tests && `${tests} ${plural(tests, 'sprawdzian', 'sprawdziany', 'sprawdzianów')}`,
          quizzes && `${quizzes} ${plural(quizzes, 'kartkówka', 'kartkówki', 'kartkówek')}`,
        ].filter(Boolean).join(' i ')}`;
      const body = list.map((x) => `${x.subject} (${x.kind})`).join(', ');
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  } catch {
    // A reminder that could not be scheduled is never a reason to fail a sync.
  }
}

export async function cancelReminders() {
  if (!supported) return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch { /* nothing scheduled */ }
}

/**
 * One notification for what a background check found: the entry itself when
 * there is one, a count and the first few when there are more. A tap opens
 * the app on Co nowego.
 */
export async function notifyNews(items: NewsItem[]) {
  if (!supported || !items.length) return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await ensureChannel();
    const title = items.length === 1 ? items[0].title : `${items.length} nowości w Librusie`;
    const body = items.length === 1
      ? items[0].detail ?? ''
      : items.slice(0, 4).map((n) => n.title).join('\n') + (items.length > 4 ? '\n…' : '');
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: '/nowosci' } },
      trigger: { channelId: NEWS_CHANNEL },
    });
  } catch {
    // A notification that could not be shown changes nothing in the data.
  }
}
