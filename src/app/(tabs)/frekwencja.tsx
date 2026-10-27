// Frekwencja: the overall rate with what it is made of, the rate per subject
// (worst first, since that is the one to watch), and every absence and late
// arrival, grouped by day. Tones follow the rule in ui/theme.ts; Librus's own
// attendance colours are not used.

import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cap, dayName, shortDate } from '../../lib/dates';
import { attendanceTone, rateTone } from '../../lib/school';
import { useSemester } from '../../lib/semester';
import type { Attendance } from '../../librus/types';
import { useAppData, useData } from '../../state/data';
import { Card, Divider, Empty, Header, SectionTitle, Segmented, Tag } from '../../ui/kit';
import { radius, space, tone, type, useTheme, type Theme, type Tone } from '../../ui/theme';

type Part = { key: string; label: string; n: number; kind: Tone | 'present' };

/** One word per absence, since a bare "u" or "sp" means nothing to most people. */
function absenceLabel(a: Attendance): string {
  const k = attendanceTone(a);
  if (k === 'signal') return 'spóźnienie';
  if (k === 'negative') return 'nieusprawiedliwiona';
  const name = (a.typeName ?? '').toLowerCase();
  if (name.includes('zwoln')) return 'zwolnienie';
  return 'usprawiedliwiona';
}

export default function Frekwencja() {
  const t = useTheme();
  const data = useAppData();
  const { refresh, syncing } = useData();
  const { semesters, semester, setSemester } = useSemester(data.attendance);

  const att = useMemo(
    () => data.attendance.filter((a) => semester == null || a.semester === semester),
    [data.attendance, semester],
  );

  const { present, parts, subjects, missedByDay } = useMemo(() => {
    const count = { present: 0, late: 0, excused: 0, unexcused: 0 };
    const subjects = new Map<string, { total: number; present: number }>();
    const missed: Attendance[] = [];
    for (const a of att) {
      const k = attendanceTone(a);
      if (k === 'signal') count.late++;
      else if (k === 'neutral') count.excused++;
      else if (k === 'negative') count.unexcused++;
      else count.present++;
      if (k) missed.push(a);
      const s = subjects.get(a.subject ?? '?') ?? { total: 0, present: 0 };
      s.total++;
      if (a.present) s.present++;
      subjects.set(a.subject ?? '?', s);
    }
    const parts: Part[] = [
      { key: 'present', label: 'obecny', n: count.present, kind: 'present' as const },
      { key: 'late', label: 'spóźnienia', n: count.late, kind: 'signal' as const },
      { key: 'excused', label: 'usprawiedliwione', n: count.excused, kind: 'neutral' as const },
      { key: 'unexcused', label: 'nieusprawiedliwione', n: count.unexcused, kind: 'negative' as const },
    ].filter((p) => p.n > 0);
    const byDay = new Map<string, Attendance[]>();
    for (const a of missed.sort((x, y) => y.date.localeCompare(x.date))) byDay.set(a.date, [...(byDay.get(a.date) ?? []), a]);
    for (const list of byDay.values()) list.sort((x, y) => (x.lessonNo ?? 0) - (y.lessonNo ?? 0));
    return {
      present: att.filter((a) => a.present).length,
      parts,
      subjects: [...subjects].sort((a, b) => a[1].present / a[1].total - b[1].present / b[1].total),
      missedByDay: [...byDay],
    };
  }, [att]);

  const pct = att.length ? (100 * present) / att.length : null;
  const partColor = (k: Part['kind']) => (k === 'present' ? t.ink : k === 'neutral' ? t.tertiary : tone(t, k).fg);
  const rateColor = (p: number) => (rateTone(p) === 'neutral' ? t.ink : tone(t, rateTone(p)).fg);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Frekwencja" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} />}>
        {semesters.length > 1 && (
          <View style={{ marginBottom: space.md }}>
            <Segmented
              options={semesters.map((s) => ({ value: s, label: `Semestr ${s}` }))}
              value={semester ?? semesters[0]}
              onChange={setSemester}
            />
          </View>
        )}
        {att.length === 0 ? <Empty text="Brak wpisów frekwencji." /> : (
          <>
            <Card>
              <Text style={[type.caption, { color: t.secondary, textTransform: 'uppercase' }]}>Obecność</Text>
              <View style={styles.heroRow}>
                <Text style={[styles.hero, { color: pct != null ? rateColor(pct) : t.ink }]}>
                  {pct?.toFixed(1).replace('.', ',')}%
                </Text>
                <Text style={[type.subhead, { color: t.secondary, marginBottom: 8 }]}>{present} z {att.length} lekcji</Text>
              </View>
              {/* What the year is made of, in one bar. */}
              <View style={[styles.stack, { backgroundColor: t.raised }]}>
                {parts.map((p) => (
                  <View key={p.key} style={{ flex: p.n, backgroundColor: partColor(p.kind) }} />
                ))}
              </View>
              <View style={styles.legend}>
                {parts.map((p) => (
                  <View key={p.key} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: partColor(p.kind) }]} />
                    <Text style={[type.footnote, { color: t.secondary }]}>
                      {p.label} <Text style={{ color: t.ink, fontWeight: '600' }}>{p.n}</Text>
                    </Text>
                  </View>
                ))}
              </View>
              {pct != null && pct < 50 && (
                <Text style={[type.footnote, { color: t.negative, marginTop: space.md }]}>
                  Poniżej 50% obecności grozi nieklasyfikowanie.
                </Text>
              )}
            </Card>

            <SectionTitle>Przedmioty</SectionTitle>
            <Card style={{ paddingVertical: space.sm }}>
              {subjects.map(([name, s], i) => (
                <View key={name}>
                  {i > 0 && <Divider />}
                  <SubjectRate name={name} present={s.present} total={s.total} t={t} color={rateColor} />
                </View>
              ))}
            </Card>

            <SectionTitle>Nieobecności i spóźnienia</SectionTitle>
            {missedByDay.length === 0 ? <Empty text="Brak. Tak trzymać." /> : missedByDay.map(([date, list]) => {
              // One card per day: a sick day is one entry with its lessons,
              // not six rows that differ only in the lesson number. When the
              // whole day is one kind, its tag is said once, in the header.
              const kinds = new Set(list.map(absenceLabel));
              const shared = kinds.size === 1 ? list[0] : null;
              const count = list.length === 1 ? '1 lekcja' : `${list.length} lekcj${list.length < 5 ? 'e' : 'i'}`;
              return (
                <Card key={date} style={{ paddingVertical: space.md }}>
                  <View style={styles.dayHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.headline, { color: t.ink }]}>{cap(dayName(date))}, {shortDate(date)}</Text>
                      <Text style={[type.footnote, { color: t.secondary }]}>{count}</Text>
                    </View>
                    {shared && <Tag label={absenceLabel(shared)} kind={attendanceTone(shared) ?? 'neutral'} />}
                  </View>
                  {list.map((a, i) => (
                    <View key={`${a.lessonNo}-${i}`} style={styles.miss}>
                      <Text style={[type.footnote, styles.lessonNo, { color: t.tertiary }]}>{a.lessonNo}</Text>
                      <Text style={[type.body, { color: t.ink, flex: 1 }]} numberOfLines={1}>{a.subject ?? '?'}</Text>
                      {!shared && <Tag label={absenceLabel(a)} kind={attendanceTone(a) ?? 'neutral'} />}
                    </View>
                  ))}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SubjectRate({ name, present, total, t, color }: {
  name: string; present: number; total: number; t: Theme; color: (p: number) => string;
}) {
  const p = (100 * present) / total;
  const kind = rateTone(p);
  return (
    <View style={styles.subj}>
      <View style={styles.subjHead}>
        <Text style={[type.body, { color: t.ink, flex: 1 }]} numberOfLines={1}>{name}</Text>
        <Text style={[type.subhead, { color: t.secondary, fontVariant: ['tabular-nums'] }]}>{present}/{total}</Text>
        <Text style={[type.subhead, styles.pct, { color: color(p) }]}>{Math.round(p)}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: t.raised }]}>
        <View style={[styles.fill, { width: `${p}%`, backgroundColor: kind === 'neutral' ? t.secondary : color(p) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: 2 },
  hero: { fontSize: 44, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  stack: { flexDirection: 'row', height: 8, borderRadius: radius.pill, overflow: 'hidden', marginTop: space.md, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subj: { paddingVertical: space.md, gap: space.sm },
  subjHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  pct: { minWidth: 40, textAlign: 'right', fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.pill },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  miss: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: 6 },
  lessonNo: { minWidth: 16, fontVariant: ['tabular-nums'] },
});
