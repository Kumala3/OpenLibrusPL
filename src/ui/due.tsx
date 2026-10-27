import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { eventKind, eventTone } from '../lib/school';
import type { Homework } from '../librus/types';
import { Card, Tag } from './kit';
import { space, type, useTheme } from './theme';

// Some entries carry a whole syllabus; four lines is enough to recognise one.
const COLLAPSED_LINES = 4;
const LONG = 200;

/**
 * One terminarz entry: what kind, which subject, what to prepare. Long ones
 * open on tap. `compact` keeps it to one line, for the calendar, where the
 * day's lessons should stay in view. `hideSubject` is for the subject's own
 * screen, where the name would only repeat the title.
 */
export function DueCard({ h, compact, hideSubject }: { h: Homework; compact?: boolean; hideSubject?: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const kind = eventKind(h.category);
  const collapsedLines = compact ? 1 : COLLAPSED_LINES;
  const long = (h.content?.length ?? 0) > (compact ? 40 : LONG);
  const meta = [h.lessonNo && `lekcja ${h.lessonNo}`, h.teacher].filter(Boolean).join(' · ');
  return (
    <Card onPress={long || compact ? () => setOpen(!open) : undefined} label={`${h.category ?? 'wpis'}, ${h.subject ?? ''}`}>
      <View style={styles.line}>
        <Tag label={h.category ?? 'wpis'} kind={eventTone(kind)} />
        {!hideSubject && (
          <Text style={[type.headline, { color: t.ink, flexShrink: 1 }]} numberOfLines={1}>{h.subject ?? 'bez przedmiotu'}</Text>
        )}
      </View>
      {h.content ? (
        <Text style={[type.body, { color: t.ink, marginTop: space.sm }]} numberOfLines={long && !open ? collapsedLines : undefined}>
          {h.content.trim()}
        </Text>
      ) : null}
      {long && !compact && (
        <Text style={[type.footnote, { color: t.ink, marginTop: space.xs, fontWeight: '600' }]}>{open ? 'Zwiń' : 'Więcej'}</Text>
      )}
      {meta && (!compact || open) ? (
        <Text style={[type.footnote, { color: t.secondary, marginTop: space.sm }]}>{meta}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
