// Turn raw Librus responses into AppData. Pure: no network, no disk.
//
// Librus answers with ids pointing at other ids (an attendance names a Lesson,
// which names a Subject and a Teacher); this is the one place they are
// resolved. Ported from librus-agent's lib/snapshot.mjs, whose field names were
// read off a real account rather than the OpenAPI document.
//
// A section whose request failed keeps its previous copy instead of turning
// empty, so one bad request never wipes a tab, and "Co nowego" never mistakes
// a section coming back for a pile of new entries.

import { shortDate } from '../lib/dates';
import type { RawSnapshot } from './sync';
import type {
  AppData, Attendance, BehaviourGrade, FreeDay, Grade, Homework, Lesson, NewsItem, Note, Notice, SchoolInfo, TeacherAbsence,
} from './types';

export type Lookup = AppData['lookup'];

const NEWS_DAYS = 30;

/** The array inside a Librus list response, whatever its key. Errors read as empty. */
function rows(payload: any, key: string): any[] {
  if (!payload || typeof payload !== 'object' || payload.error) return [];
  if (Array.isArray(payload[key])) return payload[key];
  for (const v of Object.values(payload)) if (Array.isArray(v)) return v;
  return [];
}

const byId = (list: any[]) => new Map(list.map((x) => [String(x.Id), x]));
const idOf = (ref: any): string | null => (ref?.Id == null ? null : String(ref.Id));
const fullName = (u: any): string | null =>
  u ? [u.FirstName, u.LastName].filter(Boolean).join(' ') || null : null;
const hhmm = (s: any): string | null => (typeof s === 'string' && s ? s.slice(0, 5) : null);

export function normalize(snap: RawSnapshot, previous?: AppData | null): AppData {
  const { raw } = snap;
  const ok = (key: string) => raw[key] != null && !raw[key]?.error;
  /** This sync's value for a section, or the previous copy when its request failed. */
  const keep = <T>(keys: string[], build: () => T, prev: T | undefined, empty: T): T =>
    keys.every(ok) ? build() : prev ?? empty;

  const subjects = byId(rows(raw.Subjects, 'Subjects'));
  const users = byId(rows(raw.Users, 'Users'));
  const lessons = byId(rows(raw.Lessons, 'Lessons'));
  const gradeCats = byId(rows(raw.GradeCategories, 'Categories'));
  const hwCats = byId(rows(raw.HomeWorkCategories, 'Categories'));
  const attTypes = byId(rows(raw.AttendanceTypes, 'Types'));
  const noteCats = byId(rows(raw.NoteCategories, 'Categories'));
  const behaviourTypes = byId(rows(raw.BehaviourGradeTypes, 'Types'));

  // Names survive a failed Users or Subjects request: the previous ones are the
  // base, this sync's answers go on top.
  const lookup: Lookup = {
    users: { ...(previous?.lookup.users ?? {}) },
    subjects: { ...(previous?.lookup.subjects ?? {}) },
    rooms: { ...(previous?.lookup.rooms ?? {}) },
  };
  for (const [id, u] of users) { const n = fullName(u); if (n) lookup.users[id] = n; }
  for (const [id, s] of subjects) if (s.Name) lookup.subjects[id] = s.Name;
  for (const [id, r] of byId(rows(raw.Classrooms, 'Classrooms'))) {
    const n = String(r.Symbol ?? r.Name ?? '').trim();
    if (n) lookup.rooms[id] = n;
  }
  const subjectName = (ref: any) => lookup.subjects[idOf(ref) ?? ''] ?? null;
  const userName = (ref: any) => lookup.users[idOf(ref) ?? ''] ?? null;

  const commentsByGrade = new Map<string, string[]>();
  for (const c of rows(raw.GradeComments, 'Comments')) {
    const g = idOf(c.Grade);
    if (g) commentsByGrade.set(g, [...(commentsByGrade.get(g) ?? []), c.Text]);
  }

  // The Lessons list covers the whole class, languages and religia the student
  // does not take included, so it only supplies teacher names. Which subjects
  // are the student's comes from their own timetable, grades and attendance.
  const lessonTeachers = new Map<string, Set<string>>();
  for (const l of lessons.values()) {
    const s = subjectName(l.Subject);
    const t = userName(l.Teacher);
    if (!s || !t) continue;
    if (!lessonTeachers.has(s)) lessonTeachers.set(s, new Set());
    lessonTeachers.get(s)!.add(t);
  }

  // Weeks from this sync replace their cached copies; weeks visited earlier
  // are kept, since a past timetable rarely changes. Failed weeks keep theirs.
  const timetable: Record<string, Lesson[]> = { ...(previous?.timetable ?? {}) };
  for (const [week, payload] of Object.entries(snap.weeks)) {
    if (payload?.error) continue;
    timetable[week] = flattenTimetable(payload, lookup);
  }

  const grades = keep<Grade[]>(['Grades'], () => rows(raw.Grades, 'Grades').map((g) => {
    const cat = gradeCats.get(idOf(g.Category) ?? '');
    return {
      id: g.Id,
      grade: String(g.Grade),
      date: g.Date ?? null,
      added: g.AddDate ?? null,
      subject: subjectName(g.Subject),
      category: cat?.Name?.trim() ?? null,
      // Most schools leave weights unset; the average falls back to a plain mean.
      weight: cat?.Weight ?? null,
      semester: g.Semester ?? null,
      kind: g.IsFinal ? 'final' : g.IsFinalProposition ? 'final-proposal'
        : g.IsSemester ? 'semester' : g.IsSemesterProposition ? 'semester-proposal' : null,
      teacher: userName(g.AddedBy),
      comment: (commentsByGrade.get(String(g.Id)) ?? []).join(' / ') || null,
    };
  }), previous?.grades, []);

  const homework = keep<Homework[]>(['HomeWorks'], () => rows(raw.HomeWorks, 'HomeWorks').map((h) => ({
    id: h.Id,
    date: h.Date ?? null,
    // "0" is what Librus sends when the teacher did not pick a lesson.
    lessonNo: h.LessonNo && h.LessonNo !== '0' ? String(h.LessonNo) : null,
    from: h.TimeFrom?.slice(0, 5) ?? null,
    category: hwCats.get(idOf(h.Category) ?? '')?.Name ?? null,
    subject: subjectName(h.Subject),
    teacher: userName(h.CreatedBy),
    content: h.Content ?? null,
    added: h.AddDate ?? null,
  })), previous?.homework, []);

  const attendance = keep<Attendance[]>(['Attendances'], () => rows(raw.Attendances, 'Attendances').map((a) => {
    const type = attTypes.get(idOf(a.Type) ?? '');
    const lesson = lessons.get(idOf(a.Lesson) ?? '');
    return {
      date: a.Date,
      lessonNo: a.LessonNo ?? null,
      semester: a.Semester ?? null,
      subject: subjectName(lesson?.Subject),
      type: type?.Short ?? null,
      typeName: type?.Name ?? null,
      present: type ? Boolean(type.IsPresenceKind) : null,
      color: type?.ColorRGB ? `#${type.ColorRGB}` : null,
    };
  }), previous?.attendance, []);

  const notices = keep<Notice[]>(['SchoolNotices'], () => rows(raw.SchoolNotices, 'SchoolNotices').map((n) => ({
    id: String(n.Id),
    from: n.StartDate ?? null,
    to: n.EndDate ?? null,
    title: n.Subject ?? null,
    content: n.Content ?? null,
    author: userName(n.AddedBy),
  })), previous?.notices, []);

  const freeDays = keep<FreeDay[]>(['SchoolFreeDays', 'ClassFreeDays'], () =>
    [...rows(raw.SchoolFreeDays, 'SchoolFreeDays'), ...rows(raw.ClassFreeDays, 'ClassFreeDays')]
      .filter((d) => d.DateFrom)
      .map((d) => ({ name: d.Name ?? null, from: d.DateFrom, to: d.DateTo ?? d.DateFrom })),
  previous?.freeDays, []);

  // Positive: 1 is a positive note, 0 a negative one, anything else neutral.
  const notes = keep<Note[]>(['Notes'], () => rows(raw.Notes, 'Notes').map((n) => ({
    id: String(n.Id),
    date: n.Date ?? n.AddDate ?? null,
    text: n.Text ?? null,
    category: (noteCats.get(idOf(n.Category) ?? '')?.CategoryName ?? '').trim() || null,
    teacher: userName(n.Teacher) ?? userName(n.AddedBy),
    positive: n.Positive === 1 || n.Positive === '1' ? true : n.Positive === 0 || n.Positive === '0' ? false : null,
  })), previous?.notes, []);

  const behaviour = keep<BehaviourGrade[]>(['BehaviourGrades'], () => rows(raw.BehaviourGrades, 'Grades').map((g) => {
    const type = behaviourTypes.get(idOf(g.GradeType ?? g.Grade ?? g.Type) ?? '');
    const final = Boolean(g.IsFinal || g.IsFinalProposition || g.IsFinalProposal);
    const proposal = Boolean(g.IsProposal || g.IsSemesterProposition || g.IsFinalProposition || g.IsFinalProposal);
    return {
      id: String(g.Id),
      grade: type?.Name ?? type?.Shortcut ?? null,
      semester: g.Semester ?? null,
      kind: final ? (proposal ? 'final-proposal' : 'final') : proposal ? 'proposal' : 'semester',
    };
  }), previous?.behaviour, []);

  const me = raw.Me?.Me ?? {};
  const lucky = raw.LuckyNumber?.LuckyNumber?.LuckyNumber;

  const enrolled = new Map<string, Set<string>>();
  const enrol = (s: string | null, t?: string | null) => {
    if (!s) return;
    if (!enrolled.has(s)) enrolled.set(s, new Set());
    if (t) enrolled.get(s)!.add(t);
  };
  for (const week of Object.values(timetable)) for (const l of week) if (!l.substitution) enrol(l.subject, l.teacher);
  for (const g of grades) enrol(g.subject);
  for (const a of attendance) enrol(a.subject);
  // A background check skips Lessons; the previous copy still knows who teaches what.
  const knownTeachers = new Map((previous?.subjects ?? []).map((x) => [x.name, x.teachers]));
  for (const [s, ts] of enrolled) {
    if (!ts.size) for (const t of lessonTeachers.get(s) ?? knownTeachers.get(s) ?? []) ts.add(t);
  }

  // Only the student's own teachers: the school-wide list has dozens of
  // absences that change nothing for this student.
  const myTeachers = new Set([...enrolled.values()].flatMap((ts) => [...ts]));
  const teacherAbsences = keep<TeacherAbsence[]>(['TeacherFreeDays'], () =>
    rows(raw.TeacherFreeDays, 'TeacherFreeDays')
      .map((d) => ({
        teacher: userName(d.Teacher) ?? '',
        name: d.Name ?? null,
        from: d.DateFrom,
        to: d.DateTo ?? d.DateFrom,
        timeFrom: hhmm(d.TimeFrom),
        timeTo: hhmm(d.TimeTo),
      }))
      .filter((d) => d.from && myTeachers.has(d.teacher))
      .sort((a, b) => a.from.localeCompare(b.from)),
  previous?.teacherAbsences, []);

  const school = keep<SchoolInfo | null>(['Class', 'School'], () => {
    const c = raw.Class?.Class ?? {};
    const s = raw.School?.School ?? {};
    const tutors = [...(Array.isArray(c.ClassTutors) ? c.ClassTutors : []), c.ClassTutor]
      .map(userName)
      .filter((n, i, all): n is string => Boolean(n) && all.indexOf(n) === i);
    const street = [s.Street, [s.BuildingNumber, s.ApartmentNumber].filter(Boolean).join('/')].filter(Boolean).join(' ');
    const town = [s.PostCode, s.Town].filter(Boolean).join(' ');
    return {
      className: [c.Number, c.Symbol].filter((x) => x != null && x !== '').join('') || null,
      tutors,
      school: s.Name ?? null,
      address: [street, town].filter(Boolean).join(', ') || null,
      yearStart: c.BeginSchoolYear ?? null,
      semesterEnd: c.EndFirstSemester ?? null,
      yearEnd: c.EndSchoolYear ?? null,
    };
  }, previous?.school, null);

  const failed = [
    // The lucky number errors on every day without one, which is not worth reporting.
    ...Object.entries(raw).filter(([k, p]) => p?.error && k !== 'LuckyNumber').map(([k]) => k),
    ...Object.entries(snap.weeks).filter(([, p]) => p?.error).map(([w]) => `Timetables ${w}`),
  ];

  const next = {
    syncedAt: snap.syncedAt,
    fullSyncedAt: snap.light ? previous?.fullSyncedAt ?? previous?.syncedAt ?? snap.syncedAt : snap.syncedAt,
    student: { name: fullName(me.User) ?? fullName(me.Account) },
    timetable,
    lookup,
    grades,
    homework,
    attendance,
    notices,
    freeDays,
    notes,
    behaviour,
    teacherAbsences,
    school,
    news: [] as NewsItem[],
    subjects: [...enrolled]
      .map(([name, ts]) => ({ name, teachers: [...ts].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    luckyNumber: raw.LuckyNumber === undefined
      ? previous?.luckyNumber ?? null
      : typeof lucky === 'number' ? { day: snap.luckyDay, number: lucky } : null,
    failed,
  };
  next.news = news(previous, next, raw, snap.weeks);
  return next;
}

/**
 * What arrived since the previous sync. Nothing on the first sync, when
 * everything would count as new, and nothing from a section that failed now or
 * last time, when the difference says nothing about what Librus added.
 */
function news(
  previous: AppData | null | undefined, next: AppData, raw: Record<string, any>, weeks: Record<string, any>,
): NewsItem[] {
  if (!previous) return [];
  const at = next.syncedAt;
  const cutoff = new Date(Date.parse(at) - NEWS_DAYS * 86_400_000).toISOString();
  const kept = (previous.news ?? []).filter((n) => n.at >= cutoff);
  const usable = (key: string) => raw[key] != null && !raw[key]?.error && !previous.failed.includes(key);
  const fresh = <T>(key: string, now: T[], before: T[] | undefined, id: (x: T) => string) => {
    if (!usable(key) || !before) return [];
    const seen = new Set(before.map(id));
    return now.filter((x) => !seen.has(id(x)));
  };
  const items: NewsItem[] = [];

  for (const g of fresh('Grades', next.grades, previous.grades, (g) => String(g.id))) {
    items.push({
      id: `grade:${g.id}`, at, kind: 'grade', subject: g.subject,
      title: `${g.grade} z przedmiotu ${g.subject ?? '?'}`,
      detail: [g.category, g.kind ? 'ocena okresowa' : null].filter(Boolean).join(' · ') || null,
    });
  }
  for (const h of fresh('HomeWorks', next.homework, previous.homework, (h) => String(h.id))) {
    items.push({
      id: `homework:${h.id}`, at, kind: 'homework', subject: h.subject,
      title: `${h.category ?? 'Wpis'}: ${h.subject ?? '?'}`,
      detail: h.date ? `na ${shortDate(h.date)}` : null,
    });
  }
  for (const n of fresh('SchoolNotices', next.notices, previous.notices, (n) => n.id)) {
    items.push({ id: `notice:${n.id}`, at, kind: 'notice', subject: null, title: n.title ?? 'Ogłoszenie', detail: n.author });
  }
  for (const n of fresh('Notes', next.notes, previous.notes, (n) => n.id)) {
    items.push({
      id: `note:${n.id}`, at, kind: 'note', subject: null,
      title: n.positive === true ? 'Uwaga pozytywna' : n.positive === false ? 'Uwaga negatywna' : 'Nowa uwaga',
      detail: n.text,
    });
  }
  for (const b of fresh('BehaviourGrades', next.behaviour, previous.behaviour, (b) => b.id)) {
    items.push({ id: `behaviour:${b.id}`, at, kind: 'behaviour', subject: null, title: `Zachowanie: ${b.grade ?? '?'}`, detail: null });
  }
  const absenceId = (a: TeacherAbsence) => `${a.teacher}|${a.from}|${a.timeFrom ?? ''}`;
  for (const a of fresh('TeacherFreeDays', next.teacherAbsences, previous.teacherAbsences, absenceId)) {
    if (a.to < at.slice(0, 10)) continue;
    items.push({
      id: `absence:${absenceId(a)}`, at, kind: 'absence', subject: null,
      title: `Nieobecność: ${a.teacher}`,
      detail: [a.from === a.to ? shortDate(a.from) : `${shortDate(a.from)} – ${shortDate(a.to)}`,
        a.timeFrom && a.timeTo ? `${a.timeFrom}–${a.timeTo}` : null].filter(Boolean).join(', '),
    });
  }

  // Timetable changes from today on: a lesson newly cancelled or newly a
  // substitution. Only weeks this sync fetched and the previous copy had.
  const todayIso = at.slice(0, 10);
  const lessonKey = (l: Lesson) => `${l.date}|${l.no}|${l.subject}`;
  for (const [week, payload] of Object.entries(weeks)) {
    const before = previous.timetable[week];
    if (payload?.error || !before) continue;
    const old = new Map(before.map((l) => [lessonKey(l), l]));
    for (const l of next.timetable[week] ?? []) {
      if (l.date < todayIso) continue;
      const o = old.get(lessonKey(l));
      if (!o) continue;
      const when = `${shortDate(l.date)}, lekcja ${l.no}`;
      if (l.cancelled && !o.cancelled) {
        items.push({ id: `cancel:${lessonKey(l)}`, at, kind: 'timetable', subject: l.subject, title: `Odwołana: ${l.subject ?? '?'}`, detail: when });
      } else if (l.substitution && !o.substitution) {
        items.push({
          id: `sub:${lessonKey(l)}`, at, kind: 'timetable', subject: l.subject,
          title: `Zastępstwo: ${l.subject ?? '?'}`, detail: [when, l.teacher].filter(Boolean).join(' · '),
        });
      }
    }
  }

  const known = new Set(kept.map((n) => n.id));
  return [...items.filter((n) => !known.has(n.id)), ...kept].slice(0, 100);
}

/**
 * Timetables are keyed by date, then by lesson slot, each slot an array that
 * is empty when nothing is on. A substituted lesson carries the original under
 * Org*, with only ids, hence the lookup.
 */
export function flattenTimetable(payload: any, lookup: Lookup): Lesson[] {
  const out: Lesson[] = [];
  for (const [date, slots] of Object.entries<any>(payload?.Timetable ?? {})) {
    if (!Array.isArray(slots)) continue;
    slots.forEach((slot: any, index: number) => {
      for (const l of Array.isArray(slot) ? slot : []) {
        if (!l) continue;
        const teacher = fullName(l.Teacher);
        const orgTeacher = l.OrgTeacher ? lookup.users[String(l.OrgTeacher.Id)] ?? null : null;
        const orgSubject = l.OrgSubject ? lookup.subjects[String(l.OrgSubject.Id)] ?? null : null;
        out.push({
          date,
          no: Number(l.LessonNo ?? index),
          from: l.HourFrom ?? null,
          to: l.HourTo ?? null,
          subject: l.Subject?.Name ?? null,
          teacher,
          room: lookup.rooms?.[idOf(l.Classroom) ?? ''] ?? null,
          group: l.VirtualClassName ?? null,
          cancelled: Boolean(l.IsCanceled),
          substitution: Boolean(l.IsSubstitutionClass),
          orgTeacher: orgTeacher && orgTeacher !== teacher ? orgTeacher : null,
          orgSubject: orgSubject && orgSubject !== l.Subject?.Name ? orgSubject : null,
          note: l.SubstitutionNote ?? null,
        });
      }
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.no - b.no);
}
