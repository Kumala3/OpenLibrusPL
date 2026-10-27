// Co nowego: what each sync brought, newest first. Built by normalize() by
// comparing a sync with the one before, so it needs no request of its own.

import { router } from 'expo-router';
import { Bell, BookOpen, CalendarClock, CalendarX, GraduationCap, Megaphone, MessageSquareWarning, UserX, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ago } from '../lib/dates';
import { markNewsSeen } from '../lib/settings';
import { useNow } from '../lib/use-now';
import type { NewsItem } from '../librus/types';
import { useAppData } from '../state/data';
import { Card, Divider, Empty, SectionTitle } from '../ui/kit';
import { space, type, useTheme, type Theme } from '../ui/theme';

const ICON: Record<NewsItem['kind'], typeof Bell> = {
  grade: GraduationCap,
  homework: CalendarClock,
  notice: Megaphone,
  note: MessageSquareWarning,
  behaviour: BookOpen,
  absence: UserX,
  timetable: CalendarX,
};

/** Where each entry leads: the subject for a grade, the tab for the rest. */
function open(n: NewsItem) {
  if (n.kind === 'grade' && n.subject) { router.push({ pathname: '/przedmiot/[name]', params: { name: n.subject } }); return; }
  if (n.kind === 'note' || n.kind === 'behaviour') { router.push('/uwagi'); return; }
  // A tab: close this sheet first, then switch to it.
  router.back();
  router.navigate(n.kind === 'homework' ? '/terminarz' : n.kind === 'notice' ? '/ogloszenia' : '/');
}

export default function Nowosci() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const now = useNow();
  const newest = data.news[0]?.at;
  // Opening the list is what marks it read.
  useEffect(() => { if (newest) markNewsSeen(newest); }, [newest]);

  // One group per sync that found something.
  const groups: { at: string; items: NewsItem[] }[] = [];
  for (const n of data.news) {
    const g = groups[groups.length - 1];
    if (g && g.at === n.at) g.items.push(n);
    else groups.push({ at: n.at, items: [n] });
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: space.lg, paddingBottom: insets.bottom + space.xxl }}>
      <View style={styles.top}>
        <Text style={[type.largeTitle, { color: t.ink, flex: 1 }]}>Co nowego</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zamknij">
          <X size={24} color={t.ink} />
        </Pressable>
      </View>
      <Text style={[type.footnote, { color: t.secondary, marginTop: 2 }]}>
        Oceny, wpisy, ogłoszenia, uwagi i zmiany w planie z ostatnich 30 dni, które pojawiły się od poprzedniego pobrania.
      </Text>

      {groups.length === 0 && (
        <Card style={{ marginTop: space.lg }}>
          <Empty text="Na razie nic. Nowe rzeczy pojawią się tu po kolejnym pobraniu danych." />
        </Card>
      )}
      {groups.map((g) => (
        <View key={g.at}>
          <SectionTitle>{`Pobrano ${ago(g.at, now)}`}</SectionTitle>
          <Card style={{ paddingVertical: space.xs }}>
            {g.items.map((n, i) => (
              <View key={n.id}>
                {i > 0 && <Divider />}
                <Row n={n} t={t} />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

function Row({ n, t }: { n: NewsItem; t: Theme }) {
  const Icon = ICON[n.kind];
  return (
    <Pressable onPress={() => open(n)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
      <Icon size={20} color={t.secondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.headline, { color: t.ink }]}>{n.title}</Text>
        {n.detail ? <Text style={[type.footnote, { color: t.secondary }]} numberOfLines={3}>{n.detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.md, alignItems: 'flex-start' },
});
