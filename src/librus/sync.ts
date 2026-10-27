// One sync: a fixed list of requests, one after another with a pause between
// them. Synergia's terms (§4 ust. 3 lit. c) forbid downloading heavy enough to
// destabilise its servers, and a blocked account means losing the school's
// system of record mid-year, so this is the opposite of a crawler: list
// endpoints only, never a request per subject or per day.

import { addDays, mondayOf, today } from '../lib/dates';
import { Credentials, LibrusClient } from './client';

const PAUSE_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RawSnapshot = {
  syncedAt: string;
  raw: Record<string, any>;
  /** Timetables responses keyed by the Monday they were requested for. */
  weeks: Record<string, any>;
  luckyDay: string;
  /** A background check: only what changes during the day, see LIGHT. */
  light?: boolean;
};

/**
 * The background check's subset: what can change during a school day and is
 * worth a notification. Grades and entries need their categories to be named.
 * With Me and two timetable weeks, 12 requests.
 */
const LIGHT = new Set([
  'Grades', 'GradeCategories', 'GradeComments', 'HomeWorks', 'HomeWorkCategories',
  'SchoolNotices', 'Notes', 'NoteCategories', 'TeacherFreeDays',
]);

/** Me plus 25 requests, 26 in all, whatever the account holds. */
function plan(): { lists: [string, string][]; weeks: string[]; luckyDay: string | null } {
  const now = today();
  const thisWeek = mondayOf(now);
  return {
    lists: [
      ['Subjects', 'Subjects'],
      ['Users', 'Users'],
      ['Lessons', 'Lessons'],
      ['Grades', 'Grades'],
      ['GradeCategories', 'Grades/Categories'],
      ['GradeComments', 'Grades/Comments'],
      ['HomeWorks', 'HomeWorks'],
      ['HomeWorkCategories', 'HomeWorks/Categories'],
      ['Attendances', 'Attendances'],
      ['AttendanceTypes', 'Attendances/Types'],
      ['SchoolNotices', 'SchoolNotices'],
      ['ClassFreeDays', 'Calendars/ClassFreeDays'],
      ['SchoolFreeDays', 'Calendars/SchoolFreeDays'],
      ['TeacherFreeDays', 'Calendars/TeacherFreeDays'],
      ['Notes', 'Notes'],
      ['NoteCategories', 'Notes/Categories'],
      ['BehaviourGrades', 'BehaviourGrades'],
      ['BehaviourGradeTypes', 'BehaviourGrades/Types'],
      ['Classrooms', 'Classrooms'],
      ['Class', 'Classes'],
      ['School', 'Schools'],
    ],
    // Last week too, so the calendar can look back without a request.
    weeks: [addDays(thisWeek, -7), thisWeek, addDays(thisWeek, 7)],
    luckyDay: now,
  };
}

function lightPlan() {
  const full = plan();
  return { lists: full.lists.filter(([key]) => LIGHT.has(key)), weeks: full.weeks.slice(1), luckyDay: null };
}

export async function fetchSnapshot(
  client: LibrusClient,
  credentials: () => Promise<Credentials | null>,
  onStep?: (done: number, total: number) => void,
  light = false,
): Promise<RawSnapshot> {
  const { lists, weeks, luckyDay } = light ? lightPlan() : plan();
  const total = 1 + lists.length + weeks.length + (luckyDay ? 1 : 0);
  let done = 0;
  const tick = () => onStep?.(++done, total);

  // Me is the only request allowed to fail a sync: a dead session fails here,
  // before anything else is spent, and me() logs in again.
  const raw: Record<string, any> = { Me: await client.me(credentials) };
  tick();

  // Anything after Me is recorded as failed rather than thrown, so one bad
  // endpoint costs one missing section instead of a whole re-run.
  const attempt = async (fn: () => Promise<any>) => {
    await sleep(PAUSE_MS);
    try {
      return await fn();
    } catch (e) {
      return { error: String((e as Error)?.message ?? e) };
    } finally {
      tick();
    }
  };

  for (const [key, path] of lists) raw[key] = await attempt(() => client.get(path));
  const weekPayloads: Record<string, any> = {};
  for (const w of weeks) weekPayloads[w] = await attempt(() => client.get('Timetables', { weekStart: w }));
  if (luckyDay) raw.LuckyNumber = await attempt(() => client.get('LuckyNumbers', { forDay: luckyDay }));

  return { syncedAt: new Date().toISOString(), raw, weeks: weekPayloads, luckyDay: luckyDay ?? today(), light };
}

/** One week the calendar was moved to. One request, made only when it is not cached. */
export async function fetchWeek(client: LibrusClient, credentials: () => Promise<Credentials | null>, weekStart: string) {
  try {
    return await client.get('Timetables', { weekStart });
  } catch {
    await client.me(credentials);
    return client.get('Timetables', { weekStart });
  }
}
