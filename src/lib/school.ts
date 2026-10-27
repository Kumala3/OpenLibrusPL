// School rules the screens share: what counts as a test, how grades average,
// and which tone each thing gets (see the colour rule in ui/theme.ts).

import type { Attendance, Grade } from '../librus/types';
import type { Tone } from '../ui/theme';

// Category is what tells a sprawdzian from a kartkówka, and you prepare
// differently for each, so it drives the tone and the filters.
const BIG = /sprawdzian|praca klasowa|^test|matura|próbn/i;
const SMALL = /kartk|dyktando/i;
const HOMEWORK = /zadanie|lektura|projekt|powtórka/i;

export type EventKind = 'test' | 'quiz' | 'homework' | 'other';

export function eventKind(category: string | null): EventKind {
  const c = category ?? '';
  if (BIG.test(c)) return 'test';
  if (SMALL.test(c)) return 'quiz';
  if (HOMEWORK.test(c)) return 'homework';
  return 'other';
}

/** A test is the one filled tag; a quiz is the same hue, quieter; the rest stay neutral. */
export function eventTone(kind: EventKind): Tone {
  return kind === 'test' ? 'signalStrong' : kind === 'quiz' ? 'signal' : 'neutral';
}

/** Librus writes 4+ and 4-; the usual reading is +0.5 and -0.25. */
export function gradeValue(g: string): number | null {
  const m = /^([1-6])([+-]?)$/.exec(g.trim());
  if (!m) return null;
  return Number(m[1]) + (m[2] === '+' ? 0.5 : m[2] === '-' ? -0.25 : 0);
}

/** 5 and 6 are good news, 1 and 2 hurt, the middle is ordinary. */
export function gradeTone(g: string): Tone {
  const v = gradeValue(g);
  if (v == null) return 'neutral';
  if (v >= 4.75) return 'positive';
  if (v < 2.75) return 'negative';
  return 'neutral';
}

/**
 * The average of ordinary grades. Weighted when every counted grade has a
 * weight; a plain mean otherwise, since most schools (this one included) leave
 * weights unset. Semester and final grades never count.
 */
export function average(grades: Grade[]): number | null {
  const counted = grades
    .filter((g) => !g.kind)
    .map((g) => ({ v: gradeValue(g.grade), w: g.weight }))
    .filter((x): x is { v: number; w: number | null } => x.v != null);
  if (!counted.length) return null;
  const weighted = counted.every((x) => x.w && x.w > 0);
  const num = counted.reduce((s, x) => s + x.v * (weighted ? x.w! : 1), 0);
  const den = counted.reduce((s, x) => s + (weighted ? x.w! : 1), 0);
  return num / den;
}

/**
 * Attendance tone from the type alone; Librus's own type colours are ignored.
 * Type codes differ between schools (wg, su...), so the rules read the code
 * and the name: late is signal, excused or exempt is neutral, any other
 * absence is negative.
 */
export function attendanceTone(a: Pick<Attendance, 'present' | 'type' | 'typeName'>): Tone | null {
  const name = (a.typeName ?? '').toLowerCase();
  const code = (a.type ?? '').toLowerCase();
  if (code === 'sp' || code === 'su' || name.includes('spóźn')) return 'signal';
  if (a.present) return null;
  if (code === 'u' || code === 'zw' || name.includes('uspr') || name.includes('zwoln')) return 'neutral';
  return 'negative';
}

/** Below 50% a student can end up nieklasyfikowany; up to 80% is worth watching. */
export function rateTone(pct: number): Tone {
  return pct < 50 ? 'negative' : pct < 80 ? 'signal' : 'neutral';
}

export const KIND_LABEL: Record<string, string> = {
  semester: 'semestralna',
  'semester-proposal': 'propozycja semestralna',
  final: 'roczna',
  'final-proposal': 'propozycja roczna',
};

export const fmtAvg = (n: number | null) => (n == null ? '–' : n.toFixed(2).replace('.', ','));

/** Every grade Librus writes, lowest first, for "you need at least X". */
const GRADE_STEPS = ['1', '1+', '2-', '2', '2+', '3-', '3', '3+', '4-', '4', '4+', '5-', '5', '5+', '6-', '6'];

export type GoalAdvice =
  | { kind: 'next'; grade: string; weight: number | null; reached: boolean }
  | { kind: 'many'; count: number; weight: number | null }
  | { kind: 'impossible' };

/**
 * What it takes to reach a target average: the lowest next grade that gets
 * there (or keeps it), or how many sixes in a row. Uses the same rule as
 * average(): weighted when every counted grade has a weight, where the next
 * grade is assumed to carry the subject's most common weight.
 */
export function goalAdvice(grades: Grade[], target: number): GoalAdvice {
  if (target > 6) return { kind: 'impossible' };
  const counted = grades
    .filter((g) => !g.kind)
    .map((g) => ({ v: gradeValue(g.grade), w: g.weight }))
    .filter((x): x is { v: number; w: number | null } => x.v != null);
  const weighted = counted.length > 0 && counted.every((x) => x.w && x.w > 0);
  let weight: number | null = null;
  if (weighted) {
    const freq = new Map<number, number>();
    for (const x of counted) freq.set(x.w!, (freq.get(x.w!) ?? 0) + 1);
    weight = [...freq].sort((a, b) => b[1] - a[1])[0][0];
  }
  const w = weight ?? 1;
  const sum = counted.reduce((s, x) => s + x.v * (weighted ? x.w! : 1), 0);
  const total = counted.reduce((s, x) => s + (weighted ? x.w! : 1), 0);
  const reached = total > 0 && sum / total >= target;
  const needed = (target * (total + w) - sum) / w;
  const step = GRADE_STEPS.find((g) => gradeValue(g)! >= needed - 1e-9);
  if (step) return { kind: 'next', grade: step, weight, reached };
  for (let k = 2; k <= 30; k++) {
    if ((sum + 6 * w * k) / (total + w * k) >= target - 1e-9) return { kind: 'many', count: k, weight };
  }
  return { kind: 'impossible' };
}
