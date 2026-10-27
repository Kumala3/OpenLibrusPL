// Terminarz: sprawdziany, kartkówki and zadania domowe by date, soonest first,
// with the coming week's load summed up at the top.

import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { addDays, cap, dayName, longDate, relative, today } from '../../lib/dates';
import { eventKind, type EventKind } from '../../lib/school';
import type { Homework } from '../../librus/types';
import { useAppData, useData } from '../../state/data';
import { DueCard } from '../../ui/due';
import { Chip, Empty, Header, Tag } from '../../ui/kit';
import { space, type, useTheme } from '../../ui/theme';

const FILTERS: { key: 'all' | EventKind; label: string }[] = [
  { key: 'all', label: 'Wszystko' },
  { key: 'test', label: 'Sprawdziany' },
  { key: 'quiz', label: 'Kartkówki' },
  { key: 'homework', label: 'Zadania' },
  { key: 'other', label: 'Inne' },
];

/** Polish counting: 1 sprawdzian, 2 sprawdziany, 5 sprawdzianów. */
const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;

export default function Terminarz() {
  const t = useTheme();
  const data = useAppData();
  const { refresh, syncing } = useData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [past, setPast] = useState(false);
  const now = today();

  const sections = useMemo(() => {
    const items = data.homework
      .filter((h): h is Homework & { date: string } => Boolean(h.date))
      .filter((h) => (past ? h.date < now : h.date >= now))
      .filter((h) => filter === 'all' || eventKind(h.category) === filter)
      .sort((a, b) => (past ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    const byDate = new Map<string, Homework[]>();
    for (const h of items) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h]);
    return [...byDate].map(([date, list]) => ({ date, data: list }));
  }, [data.homework, filter, past, now]);

  // The next seven days at a glance: what kind of week it is going to be.
  const week = useMemo(() => {
    const end = addDays(now, 7);
    const soon = data.homework.filter((h) => h.date && h.date >= now && h.date < end);
    return {
      tests: soon.filter((h) => eventKind(h.category) === 'test').length,
      quizzes: soon.filter((h) => eventKind(h.category) === 'quiz').length,
      other: soon.filter((h) => !['test', 'quiz'].includes(eventKind(h.category))).length,
    };
  }, [data.homework, now]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Terminarz" />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => <Chip key={f.key} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />)}
          <View style={[styles.divider, { backgroundColor: t.line }]} />
          <Chip label="Minione" on={past} onPress={() => setPast(!past)} />
        </ScrollView>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(h) => String(h.id)}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} />}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={!past && filter === 'all' ? (
          <View style={styles.summary}>
            <Text style={[type.subhead, { color: t.secondary }]}>Najbliższe 7 dni</Text>
            <View style={styles.summaryTags}>
              {week.tests + week.quizzes + week.other === 0 && (
                <Text style={[type.subhead, { color: t.ink }]}>nic nie zaplanowano</Text>
              )}
              {week.tests > 0 && (
                <Tag kind="signalStrong" label={`${week.tests} ${plural(week.tests, 'sprawdzian', 'sprawdziany', 'sprawdzianów')}`} />
              )}
              {week.quizzes > 0 && (
                <Tag kind="signal" label={`${week.quizzes} ${plural(week.quizzes, 'kartkówka', 'kartkówki', 'kartkówek')}`} />
              )}
              {week.other > 0 && (
                <Tag kind="neutral" label={`${week.other} ${plural(week.other, 'zadanie', 'zadania', 'zadań')}`} />
              )}
            </View>
          </View>
        ) : null}
        renderSectionHeader={({ section }) => {
          const soon = section.date === now || section.date === addDays(now, 1);
          return (
            <View style={styles.dateHead}>
              <Text style={[type.headline, { color: t.ink }]}>
                {cap(dayName(section.date))}, {longDate(section.date)}
              </Text>
              <Text style={[type.footnote, { color: soon ? t.ink : t.secondary, fontWeight: soon ? '600' : '400' }]}>
                {relative(section.date)}
              </Text>
            </View>
          );
        }}
        renderItem={({ item }) => <DueCard h={item} />}
        ListEmptyComponent={<Empty text={past ? 'Brak minionych wpisów.' : 'Nic zaplanowanego.'} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  divider: { width: 1, height: 20 },
  summary: { marginTop: space.sm, gap: space.sm },
  summaryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  dateHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.xl, marginBottom: space.sm },
});
