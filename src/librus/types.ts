// What the screens read. Built by normalize() from raw Librus responses, saved
// to disk as one JSON file, and read back at launch with no network.

export type Lesson = {
  date: string; // YYYY-MM-DD
  no: number;
  from: string | null;
  to: string | null;
  subject: string | null;
  teacher: string | null;
  room: string | null;
  group: string | null;
  cancelled: boolean;
  substitution: boolean;
  orgTeacher: string | null;
  orgSubject: string | null;
  note: string | null;
};

export type GradeKind = 'semester' | 'semester-proposal' | 'final' | 'final-proposal' | null;

export type Grade = {
  id: number;
  grade: string;
  date: string | null;
  added: string | null;
  subject: string | null;
  category: string | null;
  weight: number | null;
  semester: number | null;
  kind: GradeKind;
  teacher: string | null;
  comment: string | null;
};

export type Homework = {
  id: number;
  date: string | null;
  lessonNo: string | null;
  from: string | null;
  category: string | null;
  subject: string | null;
  teacher: string | null;
  content: string | null;
  added: string | null;
};

export type Attendance = {
  date: string;
  lessonNo: number | null;
  semester: number | null;
  subject: string | null;
  type: string | null;
  typeName: string | null;
  present: boolean | null;
  color: string | null;
};

export type Notice = {
  id: string;
  from: string | null;
  to: string | null;
  title: string | null;
  content: string | null;
  author: string | null;
};

export type FreeDay = { name: string | null; from: string; to: string };

export type Subject = { name: string; teachers: string[] };

export type Note = {
  id: string;
  date: string | null;
  text: string | null;
  category: string | null;
  teacher: string | null;
  /** Librus marks a note positive or negative; anything else is neutral. */
  positive: boolean | null;
};

export type BehaviourGrade = {
  id: string;
  grade: string | null;
  semester: number | null;
  kind: 'proposal' | 'semester' | 'final-proposal' | 'final';
};

export type TeacherAbsence = {
  teacher: string;
  name: string | null;
  from: string;
  to: string;
  timeFrom: string | null;
  timeTo: string | null;
};

export type SchoolInfo = {
  className: string | null;
  tutors: string[];
  school: string | null;
  address: string | null;
  yearStart: string | null;
  semesterEnd: string | null;
  yearEnd: string | null;
};

/** One thing that arrived since the previous sync, for "Co nowego". */
export type NewsItem = {
  id: string;
  at: string; // the sync that found it
  kind: 'grade' | 'homework' | 'notice' | 'note' | 'behaviour' | 'absence' | 'timetable';
  title: string;
  detail: string | null;
  subject: string | null;
};

export type AppData = {
  syncedAt: string;
  /** The last full sync; background checks fetch a subset and leave this alone. */
  fullSyncedAt?: string;
  student: { name: string | null };
  /** Lessons by the Monday of their week. Weeks outside a sync are cached as visited. */
  timetable: Record<string, Lesson[]>;
  /** Id to name, kept so a week fetched later can name a substitution's original teacher. */
  lookup: { users: Record<string, string>; subjects: Record<string, string>; rooms: Record<string, string> };
  grades: Grade[];
  homework: Homework[];
  attendance: Attendance[];
  notices: Notice[];
  freeDays: FreeDay[];
  subjects: Subject[];
  notes: Note[];
  behaviour: BehaviourGrade[];
  teacherAbsences: TeacherAbsence[];
  school: SchoolInfo | null;
  /** Newest first, kept for 30 days. Empty after the first sync: nothing is "new" yet. */
  news: NewsItem[];
  luckyNumber: { day: string; number: number } | null;
  /** Endpoints that failed in the last sync, so an empty section is not taken as the truth. */
  failed: string[];
};
