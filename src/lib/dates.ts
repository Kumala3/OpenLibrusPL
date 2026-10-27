// Dates as YYYY-MM-DD strings in local time. toISOString() is UTC, which puts
// anything after 23:00 or 22:00 on the wrong day in Poland.

const pad = (n: number) => String(n).padStart(2, '0');

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => iso(new Date());

export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Librus weeks start on Monday; getDay() calls Sunday 0. */
export const mondayOf = (s: string) => {
  const d = parse(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
};

export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const DAY_NAMES = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
export const DAY_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
export const MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];
const MONTHS_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

export const dayName = (s: string) => DAY_NAMES[parse(s).getDay()];

/** First letter up, the rest as is. textTransform: 'capitalize' would turn "25 października" into "25 Października". */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The school day to open on: today, or the coming Monday on a weekend. */
export const schoolDay = () => {
  const now = today();
  const dow = parse(now).getDay();
  return dow === 6 ? addDays(now, 2) : dow === 0 ? addDays(now, 1) : now;
};
export const shortDate = (s: string) => {
  const d = parse(s);
  return `${d.getDate()}.${pad(d.getMonth() + 1)}`;
};
export const longDate = (s: string) => {
  const d = parse(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
};

/** "dziś", "jutro", "za 3 dni", "2 dni temu". */
export function relative(s: string, from = today()) {
  const n = daysBetween(from, s);
  if (n === 0) return 'dziś';
  if (n === 1) return 'jutro';
  if (n === -1) return 'wczoraj';
  return n > 0 ? `za ${n} dni` : `${-n} dni temu`;
}

/** "przed chwilą", "5 min temu", "3 h temu", "2 dni temu". */
export function ago(isoTime: string, now = Date.now()) {
  const min = Math.round((now - new Date(isoTime).getTime()) / 60000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h temu`;
  return `${Math.round(h / 24)} dni temu`;
}
