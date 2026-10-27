// Zachowanie i uwagi: the behaviour grade (proposed and given) and every note
// a teacher wrote, newest first.

import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { longDate, relative } from '../lib/dates';
import { useAppData } from '../state/data';
import { Card, Divider, Empty, SectionTitle, Tag } from '../ui/kit';
import { space, type, useTheme } from '../ui/theme';

const KIND: Record<string, string> = {
  proposal: 'propozycja',
  semester: 'śródroczna',
  'final-proposal': 'propozycja roczna',
  final: 'roczna',
};

export default function Uwagi() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const notes = [...data.notes].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.sm, paddingBottom: space.xxl }}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back} accessibilityRole="button" accessibilityLabel="Wróć do ocen">
        <ChevronLeft size={22} color={t.ink} />
        <Text style={[type.body, { color: t.ink, fontWeight: '600' }]}>Oceny</Text>
      </Pressable>
      <Text style={[type.largeTitle, { color: t.ink, marginTop: space.md }]}>Zachowanie i uwagi</Text>

      <SectionTitle>Zachowanie</SectionTitle>
      {data.behaviour.length === 0 ? (
        <Card><Empty text="Jeszcze bez oceny z zachowania. Wychowawca wystawia ją pod koniec semestru." /></Card>
      ) : (
        <Card style={{ paddingVertical: space.xs }}>
          {data.behaviour.map((b, i) => (
            <View key={b.id}>
              {i > 0 && <Divider />}
              <View style={styles.row}>
                <Text style={[type.headline, { color: t.ink, flex: 1 }]}>{b.grade ?? '?'}</Text>
                <Text style={[type.footnote, { color: t.secondary }]}>
                  {[KIND[b.kind], b.semester ? `semestr ${b.semester}` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <SectionTitle>Uwagi</SectionTitle>
      {notes.length === 0 ? <Card><Empty text="Brak uwag." /></Card> : notes.map((n) => (
        <Card key={n.id}>
          <View style={styles.head}>
            {n.positive === true && <Tag label="pozytywna" kind="positive" />}
            {n.positive === false && <Tag label="negatywna" kind="negative" />}
            {n.category && <Text style={[type.footnote, { color: t.secondary, flexShrink: 1 }]}>{n.category}</Text>}
          </View>
          {n.text && <Text style={[type.body, { color: t.ink, marginTop: space.sm }]}>{n.text}</Text>}
          <Text style={[type.footnote, { color: t.secondary, marginTop: space.sm }]}>
            {[n.date && `${longDate(n.date.slice(0, 10))} (${relative(n.date.slice(0, 10))})`, n.teacher].filter(Boolean).join(' · ')}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
});
