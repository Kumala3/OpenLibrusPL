// Ogłoszenia: school notices, newest first, plus the days off still ahead.

import { useState } from 'react';
import { LayoutAnimation, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, longDate, relative, shortDate, today } from '../../lib/dates';
import { useReducedMotion } from '../../lib/feel';
import { useAppData, useData } from '../../state/data';
import { Card, Divider, Empty, Header, SectionTitle, Tag } from '../../ui/kit';
import { LinkedText } from '../../ui/linked-text';
import { space, type, useTheme } from '../../ui/theme';

export default function Ogloszenia() {
  const t = useTheme();
  const data = useAppData();
  const { refresh, syncing } = useData();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  const now = today();
  const fresh = addDays(now, -3);

  const notices = [...data.notices].sort((a, b) => String(b.from).localeCompare(String(a.from)));
  const free = data.freeDays.filter((f) => f.to >= now).sort((a, b) => a.from.localeCompare(b.from)).slice(0, 6);

  const toggle = (id: string) => {
    // The card grows into place instead of jumping.
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpen(open === id ? null : id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Ogłoszenia" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} />}>
        {notices.length === 0 && <Empty text="Brak ogłoszeń." />}
        {notices.map((n) => {
          const isOpen = open === n.id;
          const text = n.content?.replace(/\r\n/g, '\n').trim() ?? '';
          const isNew = Boolean(n.from && n.from >= fresh);
          return (
            <Card key={n.id} onPress={() => toggle(n.id)} label={n.title ?? 'Ogłoszenie'}>
              {isNew && <View style={{ marginBottom: space.sm }}><Tag label="nowe" kind="accent" /></View>}
              <Text style={[type.headline, { color: t.ink }]}>{n.title}</Text>
              <Text style={[type.footnote, { color: t.secondary, marginTop: 2 }]}>
                {[n.from && longDate(n.from), n.author].filter(Boolean).join(' · ')}
              </Text>
              {text ? (
                isOpen ? (
                  <LinkedText style={[type.body, { color: t.ink, marginTop: space.md }]}>{text}</LinkedText>
                ) : (
                  <Text style={[type.body, { color: t.ink, marginTop: space.md }]} numberOfLines={3}>{text}</Text>
                )
              ) : null}
              {text.length > 160 && (
                <Text style={[type.footnote, { color: t.ink, marginTop: space.sm, fontWeight: '600' }]}>
                  {isOpen ? 'Zwiń' : 'Czytaj dalej'}
                </Text>
              )}
            </Card>
          );
        })}

        {free.length > 0 && (
          <>
            <SectionTitle>Dni wolne</SectionTitle>
            <Card style={{ paddingVertical: space.xs }}>
              {free.map((f, i) => (
                <View key={`${f.from}-${i}`}>
                  {i > 0 && <Divider />}
                  <View style={styles.free}>
                    <Text style={[type.headline, styles.freeDate, { color: t.ink }]}>
                      {shortDate(f.from)}{f.to !== f.from ? `–${shortDate(f.to)}` : ''}
                    </Text>
                    <Text style={[type.subhead, { color: t.ink, flex: 1 }]}>{f.name}</Text>
                    <Text style={[type.footnote, { color: t.secondary }]}>{relative(f.from)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  free: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  freeDate: { minWidth: 88, fontVariant: ['tabular-nums'] },
});
