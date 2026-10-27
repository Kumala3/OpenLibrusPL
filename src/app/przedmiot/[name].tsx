// One subject: who teaches it, how it is going (average, attendance), the goal
// set for it, what is coming up in it, and every grade with its category and
// comment.

import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cap, dayName, longDate, relative, today } from '../../lib/dates';
import { average, fmtAvg, goalAdvice, gradeTone, KIND_LABEL, rateTone } from '../../lib/school';
import { setGoal, useSettings } from '../../lib/settings';
import type { Grade } from '../../librus/types';
import { useAppData } from '../../state/data';
import { DueCard } from '../../ui/due';
import { GradeBox } from '../../ui/grade';
import { Card, Chip, Divider, Empty, SectionTitle } from '../../ui/kit';
import { elevation, radius, space, tone, type, useTheme, type Theme, type Tone } from '../../ui/theme';

export default function Przedmiot() {
  const t = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const insets = useSafeAreaInsets();
  const { name } = useLocalSearchParams<{ name: string }>();
  const data = useAppData();

  const teachers = data.subjects.find((s) => s.name === name)?.teachers ?? [];
  const grades = data.grades
    .filter((g) => g.subject === name)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const semesters = [...new Set(grades.map((g) => g.semester))].sort();
  const now = today();
  // What to prepare for in this subject, soonest first.
  const upcoming = data.homework
    .filter((h) => h.subject === name && h.date && h.date >= now)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const att = data.attendance.filter((a) => a.subject === name);
  const present = att.filter((a) => a.present).length;
  const rate = att.length ? (100 * present) / att.length : null;

  const stats: { label: string; value: string; kind: Tone }[] = [
    ...semesters.map((s) => {
      const avg = average(grades.filter((g) => g.semester === s));
      return {
        label: s ? `średnia, semestr ${s}` : 'średnia',
        value: fmtAvg(avg),
        kind: avg == null ? 'neutral' as const : gradeTone(String(Math.round(avg))),
      };
    }),
    ...(rate != null ? [{ label: 'obecność', value: `${Math.round(rate)}%`, kind: rateTone(rate) }] : []),
  ];

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.sm, paddingBottom: space.xxl }}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back} accessibilityRole="button" accessibilityLabel="Wróć do ocen">
        <ChevronLeft size={22} color={t.ink} />
        <Text style={[type.body, { color: t.ink, fontWeight: '600' }]}>Oceny</Text>
      </Pressable>
      <Text style={[type.largeTitle, { color: t.ink, marginTop: space.md }]}>{cap(name ?? '')}</Text>
      {teachers.length > 0 && <Text style={[type.subhead, { color: t.secondary, marginTop: 2 }]}>{teachers.join(', ')}</Text>}

      {stats.length > 0 && (
        <View style={styles.stats}>
          {stats.map((s) => <Stat key={s.label} {...s} t={t} scheme={scheme} />)}
        </View>
      )}

      {name && <Goal subject={name} grades={grades} t={t} />}

      {upcoming.length > 0 && (
        <>
          <SectionTitle>Nadchodzące</SectionTitle>
          {upcoming.map((h) => (
            <View key={h.id}>
              <Text style={[type.footnote, { color: t.secondary, marginBottom: space.xs, marginLeft: 2 }]}>
                {cap(dayName(h.date!))}, {longDate(h.date!)} · {relative(h.date!)}
              </Text>
              <DueCard h={h} compact hideSubject />
            </View>
          ))}
        </>
      )}

      <SectionTitle>Oceny</SectionTitle>
      {grades.length === 0 ? <Empty text="Jeszcze bez ocen z tego przedmiotu." /> : (
        <Card style={{ paddingVertical: space.xs }}>
          {grades.map((g, i) => (
            <View key={g.id}>
              {i > 0 && <Divider />}
              <View style={styles.gradeRow}>
                <GradeBox g={g.grade} dim={Boolean(g.kind)} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.headline, { color: t.ink }]}>
                    {g.category ?? 'ocena'}{g.kind ? ` · ${KIND_LABEL[g.kind]}` : ''}
                  </Text>
                  <Text style={[type.footnote, { color: t.secondary }]}>
                    {[g.date && `${longDate(g.date)} (${relative(g.date)})`, g.teacher, g.weight ? `waga ${g.weight}` : null]
                      .filter(Boolean).join(' · ')}
                  </Text>
                  {g.comment && <Text style={[type.subhead, { color: t.ink, marginTop: space.xs }]}>{g.comment}</Text>}
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const TARGETS = [3, 3.5, 4, 4.5, 4.75, 5, 5.5];

/**
 * Moje cele: a target average for the subject and what the next grade has to
 * be to reach it. Counts the latest semester only, like the average above it.
 */
function Goal({ subject, grades, t }: { subject: string; grades: Grade[]; t: Theme }) {
  const target = useSettings().goals?.[subject] ?? null;
  const [editing, setEditing] = useState(false);
  const semester = Math.max(0, ...grades.map((g) => g.semester ?? 0)) || null;
  const current = grades.filter((g) => semester == null || g.semester === semester);
  const avg = average(current);

  if (target == null || editing) {
    return (
      <>
        <SectionTitle>Mój cel</SectionTitle>
        <Card>
          <Text style={[type.subhead, { color: t.ink }]}>
            {target == null ? 'Jaką średnią chcesz mieć z tego przedmiotu?' : 'Zmień cel'}
          </Text>
          <View style={styles.targets}>
            {TARGETS.map((v) => (
              <Chip key={v} label={fmtAvg(v)} on={v === target} onPress={() => { setGoal(subject, v); setEditing(false); }} />
            ))}
          </View>
          {target != null && (
            <Pressable onPress={() => { setGoal(subject, null); setEditing(false); }} hitSlop={6} style={{ marginTop: space.md }}>
              <Text style={[type.footnote, { color: t.negative, fontWeight: '600' }]}>Usuń cel</Text>
            </Pressable>
          )}
        </Card>
      </>
    );
  }

  const advice = goalAdvice(current, target);
  const w = (weight: number | null) => (weight ? ` (z wagą ${weight})` : '');
  const message = advice.kind === 'impossible'
    ? 'Tej średniej nie da się już osiągnąć w tym semestrze.'
    : advice.kind === 'many'
      ? `Potrzebujesz ${advice.count} szóstek z rzędu${w(advice.weight)}.`
      : advice.reached
        ? `Cel osiągnięty. Następna ocena co najmniej ${advice.grade}${w(advice.weight)} go utrzyma.`
        : `Z następnej oceny potrzebujesz co najmniej ${advice.grade}${w(advice.weight)}.`;
  const reached = advice.kind === 'next' && advice.reached;

  return (
    <>
      <SectionTitle>Mój cel</SectionTitle>
      <Card onPress={() => setEditing(true)} label="Zmień cel">
        <View style={styles.goalHead}>
          <Text style={[type.title, { color: t.ink, fontVariant: ['tabular-nums'] }]}>{fmtAvg(target)}</Text>
          <Text style={[type.footnote, { color: t.secondary, flex: 1 }]}>
            {avg == null ? 'jeszcze bez ocen' : `teraz ${fmtAvg(avg)}`}
          </Text>
          <Text style={[type.footnote, { color: t.ink, fontWeight: '600' }]}>Zmień</Text>
        </View>
        <Text style={[type.subhead, { color: reached ? t.positive : t.ink, marginTop: space.sm }]}>{message}</Text>
      </Card>
    </>
  );
}

function Stat({ label, value, kind, t, scheme }: { label: string; value: string; kind: Tone; t: Theme; scheme: 'light' | 'dark' }) {
  const color = kind === 'neutral' ? t.ink : tone(t, kind).fg;
  return (
    <View style={[styles.stat, { backgroundColor: t.surface }, elevation(t, scheme)]}>
      <Text style={[type.title, { color, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={[type.footnote, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  stats: { flexDirection: 'row', gap: space.md, marginTop: space.lg, flexWrap: 'wrap' },
  stat: { borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md, minWidth: 120, gap: 2 },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  goalHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  gradeRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.md },
});
