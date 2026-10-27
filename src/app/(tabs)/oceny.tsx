// Oceny: the overall average, behaviour and notes, the newest grades, and one
// card per subject with its grades and average. "Okresowe" switches to the
// semester and final grades. Tap a subject (or a new grade) for details.

import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { longDate, shortDate } from '../../lib/dates';
import { average, fmtAvg, gradeTone } from '../../lib/school';
import { useSemester } from '../../lib/semester';
import type { AppData, Grade, GradeKind } from '../../librus/types';
import { useAppData, useData } from '../../state/data';
import { GradeBox } from '../../ui/grade';
import { Card, Divider, Empty, Header, SectionTitle, Segmented, Tappable } from '../../ui/kit';
import { space, tone, type, useTheme, type Theme } from '../../ui/theme';

const openSubject = (name: string) => router.push({ pathname: '/przedmiot/[name]', params: { name } });

/** An average in the same tones as a grade: a 2,50 should look like trouble. */
function avgColor(avg: number | null, t: Theme) {
  if (avg == null) return t.secondary;
  const k = gradeTone(String(Math.round(avg)));
  return k === 'neutral' ? t.ink : tone(t, k).fg;
}

export default function Oceny() {
  const t = useTheme();
  const data = useAppData();
  const { refresh, syncing } = useData();
  const { semesters, semester, setSemester } = useSemester(data.grades);
  const [view, setView] = useState<'current' | 'periodic'>('current');

  const grades = useMemo(
    () => data.grades.filter((g) => semester == null || g.semester === semester),
    [data.grades, semester],
  );

  // Every enrolled subject, with or without grades yet, so the list is the
  // class list too.
  const rows = useMemo(() => {
    const by = new Map<string, Grade[]>(data.subjects.map((s) => [s.name, []]));
    for (const g of grades) {
      const k = g.subject ?? '?';
      by.set(k, [...(by.get(k) ?? []), g]);
    }
    return [...by]
      .map(([name, gs]) => ({ name, grades: gs.sort((a, b) => String(a.date).localeCompare(String(b.date))) }))
      .sort((a, b) => (b.grades.length > 0 ? 1 : 0) - (a.grades.length > 0 ? 1 : 0) || a.name.localeCompare(b.name, 'pl'));
  }, [grades, data.subjects]);

  const recent = useMemo(
    () => [...grades].sort((a, b) => String(b.added).localeCompare(String(a.added))).slice(0, 3),
    [grades],
  );
  const overall = average(grades);
  const counted = grades.filter((g) => !g.kind).length;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Oceny" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} />}>
        <View style={{ marginBottom: space.md }}>
          <Segmented
            options={[{ value: 'current', label: 'Bieżące' }, { value: 'periodic', label: 'Okresowe' }]}
            value={view}
            onChange={setView}
          />
        </View>

        {view === 'periodic' ? <Periodic data={data} t={t} /> : (<>
        {semesters.length > 1 && (
          <View style={{ marginBottom: space.md }}>
            <Segmented
              options={semesters.map((s) => ({ value: s, label: `Semestr ${s}` }))}
              value={semester ?? semesters[0]}
              onChange={setSemester}
            />
          </View>
        )}

        <Card>
          <Text style={[type.caption, { color: t.secondary, textTransform: 'uppercase' }]}>Średnia</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.hero, { color: avgColor(overall, t) }]}>{fmtAvg(overall)}</Text>
            <Text style={[type.subhead, { color: t.secondary, marginBottom: 8 }]}>
              z {counted} {counted === 1 ? 'oceny' : 'ocen'}
            </Text>
          </View>
        </Card>

        <BehaviourCard data={data} t={t} />

        {recent.length > 0 && (
          <>
            <SectionTitle>Najnowsze</SectionTitle>
            <Card style={{ paddingVertical: space.xs }}>
              {recent.map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <Divider />}
                  <Tappable
                    onPress={g.subject ? () => openSubject(g.subject!) : undefined}
                    label={`${g.grade} z ${g.subject}`}
                    style={styles.recent}>
                    <GradeBox g={g.grade} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.headline, { color: t.ink }]} numberOfLines={1}>{g.subject}</Text>
                      <Text style={[type.footnote, { color: t.secondary }]} numberOfLines={1}>
                        {[g.category, g.date && shortDate(g.date)].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={t.tertiary} />
                  </Tappable>
                </View>
              ))}
            </Card>
          </>
        )}

        <SectionTitle>Przedmioty</SectionTitle>
        {rows.length === 0 && <Empty text="Brak ocen." />}
        {rows.map((r) => {
          const avg = average(r.grades);
          return (
            <Card key={r.name} onPress={() => openSubject(r.name)} label={r.name}>
              <View style={styles.subjectHead}>
                <Text style={[type.headline, { color: t.ink, flex: 1 }]} numberOfLines={1}>{r.name}</Text>
                {avg != null && (
                  <Text style={[type.headline, { color: avgColor(avg, t), fontVariant: ['tabular-nums'] }]}>{fmtAvg(avg)}</Text>
                )}
                <ChevronRight size={18} color={t.tertiary} />
              </View>
              {r.grades.length ? (
                <View style={styles.chips}>
                  {r.grades.map((g) => <GradeBox key={g.id} g={g.grade} small dim={Boolean(g.kind)} />)}
                </View>
              ) : (
                <Text style={[type.footnote, { color: t.tertiary, marginTop: space.xs }]}>Jeszcze bez ocen</Text>
              )}
            </Card>
          );
        })}
        </>)}
      </ScrollView>
    </View>
  );
}

const BEHAVIOUR_LABEL: Record<string, string> = {
  proposal: 'propozycja',
  semester: 'śródroczna',
  'final-proposal': 'propozycja roczna',
  final: 'roczna',
};

/** Behaviour and notes in one row: both are about conduct, and both are usually quiet. */
function BehaviourCard({ data, t }: { data: AppData; t: Theme }) {
  const latest = data.behaviour[data.behaviour.length - 1];
  const pos = data.notes.filter((n) => n.positive === true).length;
  const neg = data.notes.filter((n) => n.positive === false).length;
  const other = data.notes.length - pos - neg;
  const notes = data.notes.length
    ? [pos && `${pos} pozyt.`, neg && `${neg} negat.`, other && `${other} inne`].filter(Boolean).join(', ')
    : 'brak';
  return (
    <Card onPress={() => router.push('/uwagi')} label="Zachowanie i uwagi">
      <View style={styles.subjectHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.headline, { color: t.ink }]}>Zachowanie i uwagi</Text>
          <Text style={[type.footnote, { color: t.secondary }]} numberOfLines={2}>
            {latest?.grade
              ? `Zachowanie: ${latest.grade} (${BEHAVIOUR_LABEL[latest.kind]})`
              : 'Zachowanie: jeszcze bez oceny'}
            {` · uwagi: ${notes}`}
          </Text>
        </View>
        <ChevronRight size={18} color={t.tertiary} />
      </View>
    </Card>
  );
}

const PERIODIC: { kind: Exclude<GradeKind, null>; label: string }[] = [
  { kind: 'semester-proposal', label: 'propozycja śródroczna' },
  { kind: 'semester', label: 'śródroczna' },
  { kind: 'final-proposal', label: 'propozycja roczna' },
  { kind: 'final', label: 'roczna' },
];

/** Semester and final grades, proposed and given, one card per subject that has any. */
function Periodic({ data, t }: { data: AppData; t: Theme }) {
  const rows = data.subjects
    .map((s) => ({ name: s.name, grades: data.grades.filter((g) => g.subject === s.name && g.kind) }))
    .filter((r) => r.grades.length);
  const end = data.school?.semesterEnd;
  if (!rows.length) {
    return (
      <Card>
        <Empty text={`Nauczyciele jeszcze nie wystawili ocen okresowych. Zwykle pojawiają się przed końcem semestru${
          end ? ` (${longDate(end)})` : ''}.`} />
      </Card>
    );
  }
  return (
    <>
      {rows.map((r) => (
        <Card key={r.name} onPress={() => openSubject(r.name)} label={r.name}>
          <View style={styles.subjectHead}>
            <Text style={[type.headline, { color: t.ink, flex: 1 }]} numberOfLines={1}>{r.name}</Text>
            <ChevronRight size={18} color={t.tertiary} />
          </View>
          <View style={styles.periodic}>
            {PERIODIC.map(({ kind, label }) => {
              const g = r.grades.filter((x) => x.kind === kind).pop();
              if (!g) return null;
              return (
                <View key={kind} style={styles.periodicItem}>
                  <GradeBox g={g.grade} small dim={kind.endsWith('proposal')} />
                  <Text style={[type.footnote, { color: t.secondary }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: 2 },
  hero: { fontSize: 44, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  recent: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.md },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  periodic: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  periodicItem: { alignItems: 'center', gap: 4, minWidth: 72 },
});
