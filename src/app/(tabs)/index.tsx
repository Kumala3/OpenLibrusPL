// Kalendarz: a week strip that opens into a month, and below it either the
// chosen day (its lessons with room and teacher, absent teachers, what is due)
// or the whole week as a timetable grid.

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  addDays, cap, DAY_SHORT, dayName, iso, longDate, mondayOf, MONTHS, parse, relative, schoolDay, today,
} from '../../lib/dates';
import { eventKind } from '../../lib/school';
import type { AppData, Lesson, TeacherAbsence } from '../../librus/types';
import { useAppData, useData } from '../../state/data';
import { DueCard } from '../../ui/due';
import { Card, Divider, Empty, Header, IconButton, SectionTitle, Segmented, Tag, UpdateBanner } from '../../ui/kit';
import { elevation, radius, space, type, useTheme, type Theme } from '../../ui/theme';

// One dot per day at most: orange when there is something to prepare for, grey
// when there are only ordinary entries. Free days get a green day circle.
type Marks = { prepare: boolean; entries: boolean; free: boolean };

function useMarks(data: AppData) {
  return useMemo(() => {
    const m = new Map<string, Marks>();
    const at = (d: string) => {
      if (!m.has(d)) m.set(d, { prepare: false, entries: false, free: false });
      return m.get(d)!;
    };
    for (const h of data.homework) {
      if (!h.date) continue;
      const k = eventKind(h.category);
      if (k === 'test' || k === 'quiz') at(h.date).prepare = true;
      else at(h.date).entries = true;
    }
    for (const f of data.freeDays) for (let d = f.from; d <= f.to; d = addDays(d, 1)) at(d).free = true;
    return m;
  }, [data]);
}

export default function Kalendarz() {
  const t = useTheme();
  const data = useAppData();
  const { refresh, syncing, loadWeek, hasCredentials } = useData();
  const [selected, setSelected] = useState(schoolDay);
  const [month, setMonth] = useState(false);
  const [view, setView] = useState<'day' | 'week'>('day');
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [luckyOpen, setLuckyOpen] = useState(false);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const marks = useMarks(data);

  const week = mondayOf(selected);
  useEffect(() => { loadWeek(week); }, [week, loadWeek]);

  const shift = (dir: 1 | -1) => {
    if (!month) { setSelected(addDays(selected, 7 * dir)); return; }
    const d = parse(selected);
    setSelected(iso(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };

  const d = parse(selected);
  const lucky = data.luckyNumber?.day === today() ? data.luckyNumber.number : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header
        title="Kalendarz"
        right={lucky != null ? (
          <Pressable
            onPress={() => setLuckyOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Szczęśliwy numerek ${lucky}`}
            style={({ pressed }) => [styles.lucky, { backgroundColor: t.surface, opacity: pressed ? 0.7 : 1 }, elevation(t, scheme)]}>
            <Text style={{ color: t.secondary, fontSize: 10, fontWeight: '600' }}>numerek</Text>
            <Text style={{ color: t.ink, fontSize: 18, fontWeight: '700', lineHeight: 20 }}>{lucky}</Text>
          </Pressable>
        ) : null}
      />
      {lucky != null && <LuckyModal number={lucky} open={luckyOpen} onClose={() => setLuckyOpen(false)} t={t} />}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} />}>
        <UpdateBanner />
        <Card>
          <View
            // Swipe sideways to move a week (or a month when expanded). Plain
            // touch events: a horizontal flick is all this needs, and it leaves
            // the page's vertical scroll alone.
            onTouchStart={(e) => { touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }}
            onTouchEnd={(e) => {
              const s = touch.current;
              if (!s) return;
              const dx = e.nativeEvent.pageX - s.x;
              const dy = e.nativeEvent.pageY - s.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) shift(dx < 0 ? 1 : -1);
              touch.current = null;
            }}>
          <View style={styles.calHead}>
            <IconButton label="Wstecz" onPress={() => shift(-1)}><ChevronLeft size={20} color={t.ink} /></IconButton>
            <Pressable style={styles.monthBtn} onPress={() => setMonth(!month)}>
              <Text style={[styles.monthText, { color: t.ink }]}>{MONTHS[d.getMonth()]} {d.getFullYear()}</Text>
              {month ? <ChevronUp size={16} color={t.secondary} /> : <ChevronDown size={16} color={t.secondary} />}
            </Pressable>
            <IconButton label="Dalej" onPress={() => shift(1)}><ChevronRight size={20} color={t.ink} /></IconButton>
          </View>
          <Weekdays t={t} />
          {month
            ? <MonthGrid selected={selected} onPick={setSelected} marks={marks} t={t} />
            : <Row start={week} selected={selected} onPick={setSelected} marks={marks} t={t} />}
          {selected !== schoolDay() && (
            <Pressable onPress={() => setSelected(schoolDay())} style={styles.todayBtn}>
              <Text style={[type.footnote, { color: t.ink, fontWeight: '600' }]}>Wróć do dziś</Text>
            </Pressable>
          )}
          </View>
        </Card>

        <View style={{ marginTop: space.lg }}>
          <Segmented
            options={[{ value: 'day', label: 'Dzień' }, { value: 'week', label: 'Tydzień' }]}
            value={view}
            onChange={setView}
          />
        </View>
        {view === 'day'
          ? <DayView date={selected} data={data} t={t} canFetch={hasCredentials} />
          : <WeekGrid week={week} data={data} t={t} canFetch={hasCredentials}
              onPick={(day) => { setSelected(day); setView('day'); }} />}
      </ScrollView>
    </View>
  );
}

/** What the number in the header is: on its own, "22" means nothing. */
function LuckyModal({ number, open, onClose, t }: { number: number; open: boolean; onClose: () => void; t: Theme }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="Zamknij">
        {/* Taps on the card itself do not close it. */}
        <Pressable style={[styles.modal, { backgroundColor: t.surface }]} onPress={() => {}}>
          <Text style={[type.caption, { color: t.secondary, textTransform: 'uppercase' }]}>
            Szczęśliwy numerek
          </Text>
          <Text style={{ color: t.ink, fontSize: 64, fontWeight: '700', lineHeight: 72, letterSpacing: -1 }}>{number}</Text>
          <Text style={[type.body, { color: t.ink, textAlign: 'center' }]}>
            Uczeń z tym numerem w dzienniku ma dziś szczęśliwy dzień: zwykle nie jest pytany i nie pisze
            niezapowiedzianej kartkówki.
          </Text>
          <Text style={[type.footnote, { color: t.secondary, textAlign: 'center' }]}>
            Dokładne zasady ustala statut szkoły.
          </Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.modalButton, { backgroundColor: t.ink, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[type.headline, { color: t.bg }]}>OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Weekdays({ t }: { t: Theme }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5, 6, 0].map((i) => (
        <Text key={i} style={[styles.weekday, { color: i === 0 || i === 6 ? t.tertiary : t.secondary }]}>{DAY_SHORT[i]}</Text>
      ))}
    </View>
  );
}

function Row({ start, selected, onPick, marks, t, inMonth }: {
  start: string; selected: string; onPick: (d: string) => void; marks: Map<string, Marks>; t: Theme; inMonth?: number;
}) {
  const now = today();
  return (
    <View style={styles.row}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        const day = parse(date);
        const m = marks.get(date);
        const isSel = date === selected;
        const outside = inMonth != null && day.getMonth() !== inMonth;
        const weekend = i >= 5;
        return (
          <Pressable key={date} onPress={() => onPick(date)} style={styles.cell}>
            <View style={[
              styles.dayCircle,
              isSel && { backgroundColor: t.ink },
              !isSel && date === now && { borderWidth: 1.5, borderColor: t.ink },
              !isSel && m?.free && { backgroundColor: t.positiveBg },
            ]}>
              <Text style={{
                color: isSel ? t.bg : outside ? t.tertiary : weekend ? t.secondary : t.ink,
                fontWeight: date === now || isSel ? '700' : '400',
                fontSize: 15,
              }}>{day.getDate()}</Text>
            </View>
            <View style={styles.dots}>
              {(m?.prepare || m?.entries) && (
                <View style={[styles.dot, { backgroundColor: m.prepare ? t.signal : t.tertiary }]} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function MonthGrid({ selected, onPick, marks, t }: {
  selected: string; onPick: (d: string) => void; marks: Map<string, Marks>; t: Theme;
}) {
  const d = parse(selected);
  const first = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const rows: string[] = [];
  for (let w = mondayOf(first); w <= last; w = addDays(w, 7)) rows.push(w);
  return <>{rows.map((w) => <Row key={w} start={w} selected={selected} onPick={onPick} marks={marks} t={t} inMonth={d.getMonth()} />)}</>;
}

function DayView({ date, data, t, canFetch }: { date: string; data: AppData; t: Theme; canFetch: boolean }) {
  const week = data.timetable[mondayOf(date)];
  const lessons = (week ?? []).filter((l) => l.date === date);
  const due = data.homework.filter((h) => h.date === date);
  const free = data.freeDays.find((f) => f.from <= date && date <= f.to);
  const weekend = [0, 6].includes(parse(date).getDay());
  const minutes = useMinutes();
  const absent = data.teacherAbsences.filter((a) => a.from <= date && date <= a.to);

  return (
    <>
      <View style={styles.dayHead}>
        <Text style={[type.title, styles.dayTitle, { color: t.ink }]}>{cap(dayName(date))}, {longDate(date)}</Text>
        <Text style={[type.footnote, { color: t.secondary, flexShrink: 0 }]}>{relative(date)}</Text>
      </View>
      {free && (
        <View style={[styles.free, { backgroundColor: t.positiveBg }]}>
          <Text style={[type.headline, { color: t.positive }]}>{free.name ?? 'Dzień wolny'}</Text>
        </View>
      )}

      {due.length > 0 && (
        <>
          <SectionTitle>Terminarz</SectionTitle>
          {due.map((h) => <DueCard key={h.id} h={h} compact />)}
        </>
      )}

      {absent.length > 0 && (
        <>
          <SectionTitle>Nieobecni nauczyciele</SectionTitle>
          <Card style={{ paddingVertical: space.xs }}>
            {absent.map((a, i) => (
              <View key={`${a.teacher}-${a.from}-${a.timeFrom}`}>
                {i > 0 && <Divider />}
                <View style={styles.absence}>
                  <Text style={[type.headline, { color: t.ink, flex: 1 }]}>{a.teacher}</Text>
                  <Text style={[type.footnote, { color: t.secondary }]}>
                    {a.timeFrom && a.timeTo ? `${a.timeFrom}–${a.timeTo}` : 'cały dzień'}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Lekcje</SectionTitle>
      {!week ? (
        <Card>
          <Empty text={canFetch
            ? 'Plan na ten tydzień nie jest pobrany. Pobierze się, gdy będzie internet.'
            : 'Plan na ten tydzień nie jest pobrany. Zaloguj się, aby go pobrać.'} />
        </Card>
      ) : lessons.length ? (
        <Card style={{ paddingVertical: space.xs }}>
          {lessons.map((l, i) => (
            <View key={`${l.no}-${l.subject}-${i}`}>
              {i > 0 && <Divider />}
              <LessonRow
                l={l}
                t={t}
                live={date === today() ? liveState(l, lessons, minutes) : null}
                teacherAway={!l.cancelled && !l.substitution && absent.some((a) => overlaps(a, l))}
              />
            </View>
          ))}
        </Card>
      ) : (
        <Card><Empty text={free || weekend ? 'Brak lekcji.' : 'Brak lekcji w planie.'} /></Card>
      )}
    </>
  );
}

/** Subject names cut to fit a fifth of a phone screen: "j. polski", "WF". */
function shortSubject(name: string | null) {
  const n = (name ?? '').trim();
  if (/^wychowanie fizyczne$/i.test(n)) return 'WF';
  if (/^godz(ina|\.)\s*wychowawcza$/i.test(n)) return 'g. wych.';
  const lang = /^język\s+(.+)$/i.exec(n);
  if (lang) return `j. ${lang[1]}`;
  return n.length > 11 ? `${n.slice(0, 9)}.` : n;
}

/** The week as a timetable: days across, lesson numbers down. A tap opens that day. */
function WeekGrid({ week, data, t, canFetch, onPick }: {
  week: string; data: AppData; t: Theme; canFetch: boolean; onPick: (day: string) => void;
}) {
  const lessons = data.timetable[week];
  if (!lessons) {
    return (
      <Card style={{ marginTop: space.md }}>
        <Empty text={canFetch
          ? 'Plan na ten tydzień nie jest pobrany. Pobierze się, gdy będzie internet.'
          : 'Plan na ten tydzień nie jest pobrany. Zaloguj się, aby go pobrać.'} />
      </Card>
    );
  }
  // Monday to Friday, plus a weekend day only when something is on.
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
    .filter((d, i) => i < 5 || lessons.some((l) => l.date === d));
  const numbers = [...new Set(lessons.map((l) => l.no))].sort((a, b) => a - b);
  const now = today();
  if (!numbers.length) return <Card style={{ marginTop: space.md }}><Empty text="Brak lekcji w tym tygodniu." /></Card>;
  return (
    <Card style={{ marginTop: space.md, paddingHorizontal: space.sm }}>
      <View style={styles.gridHead}>
        <View style={{ width: 22 }} />
        {days.map((d) => {
          const isToday = d === now;
          return (
            <Pressable key={d} onPress={() => onPick(d)} style={[styles.gridDay, isToday && { backgroundColor: t.ink }]}
              accessibilityRole="button" accessibilityLabel={`${dayName(d)}, ${longDate(d)}`}>
              <Text style={[type.caption, { color: isToday ? t.bg : t.secondary }]} maxFontSizeMultiplier={1.2}>
                {DAY_SHORT[parse(d).getDay()]}
              </Text>
              <Text style={[type.subhead, { color: isToday ? t.bg : t.ink, fontWeight: '600' }]} maxFontSizeMultiplier={1.2}>
                {parse(d).getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {numbers.map((no) => (
        <View key={no} style={styles.gridRow}>
          <Text style={[type.footnote, styles.gridNo, { color: t.tertiary }]} maxFontSizeMultiplier={1.2}>{no}</Text>
          {days.map((d) => {
            const here = lessons.filter((l) => l.date === d && l.no === no);
            const l = here[0];
            if (!l) return <View key={d} style={styles.gridCell} />;
            return (
              <Pressable
                key={d}
                onPress={() => onPick(d)}
                accessibilityRole="button"
                accessibilityLabel={[l.subject, l.room && `sala ${l.room}`, l.cancelled && 'odwołana', l.substitution && 'zastępstwo']
                  .filter(Boolean).join(', ')}
                style={({ pressed }) => [
                  styles.gridCell,
                  { backgroundColor: t.raised, opacity: pressed ? 0.6 : 1 },
                  l.substitution && { borderWidth: 1, borderColor: t.secondary },
                ]}>
                <Text
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                  style={{
                    fontSize: 12, fontWeight: '600', lineHeight: 15,
                    color: l.cancelled ? t.tertiary : t.ink,
                    textDecorationLine: l.cancelled ? 'line-through' : 'none',
                  }}>
                  {shortSubject(l.subject)}{here.length > 1 ? ` +${here.length - 1}` : ''}
                </Text>
                {l.room ? (
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 11, color: t.secondary }}>{l.room}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={[type.footnote, { color: t.tertiary, marginTop: space.sm, marginLeft: 22 }]}>
        Pod przedmiotem sala. Ramka to zastępstwo, przekreślenie to odwołana lekcja.
      </Text>
    </Card>
  );
}

const toMin = (hhmm: string | null) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

type Live = { kind: 'now' } | { kind: 'next'; inMin: number } | { kind: 'past' } | null;

/** On today's plan: which lesson is on now, which is next, which are over. */
function liveState(l: Lesson, all: Lesson[], now: number): Live {
  const from = toMin(l.from);
  const to = toMin(l.to);
  if (from == null || to == null || l.cancelled) return null;
  if (now >= from && now < to) return { kind: 'now' };
  if (now >= to) return { kind: 'past' };
  const upcoming = all.filter((x) => !x.cancelled && (toMin(x.from) ?? -1) > now);
  if (upcoming[0] === l) return { kind: 'next', inMin: from - now };
  return null;
}

/** Minutes since midnight, refreshed every half minute so "teraz" moves on its own. */
function useMinutes() {
  const read = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const [m, setM] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setM(read()), 30_000);
    return () => clearInterval(id);
  }, []);
  return m;
}

/** Whether a teacher's absence covers this lesson: their lesson, inside its hours. */
function overlaps(a: TeacherAbsence, l: Lesson) {
  if (a.teacher !== l.teacher) return false;
  const from = toMin(a.timeFrom);
  const to = toMin(a.timeTo);
  const lf = toMin(l.from);
  const lt = toMin(l.to);
  if (from == null || to == null || lf == null || lt == null) return true;
  return lf < to && lt > from;
}

function LessonRow({ l, t, live, teacherAway }: { l: Lesson; t: Theme; live: Live; teacherAway: boolean }) {
  return (
    <View style={[
      styles.lesson,
      live?.kind === 'past' && { opacity: 0.45 },
    ]}>
      {live?.kind === 'now' && <View style={[styles.nowBar, { backgroundColor: t.accent }]} />}
      <Text style={[type.subhead, styles.lessonNo, { color: t.tertiary }]}>{l.no}</Text>
      {/* Sized by its text, not a fixed width: at a large system font a fixed
          column broke "08:10" over two lines. */}
      <View style={{ minWidth: 46 }}>
        <Text style={[type.subhead, styles.time, { color: t.ink }]} numberOfLines={1}>{l.from}</Text>
        <Text style={[type.footnote, styles.time, { color: t.tertiary }]} numberOfLines={1}>{l.to}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.subjectLine}>
          <Text style={[
            type.headline,
            { color: l.cancelled ? t.secondary : t.ink },
            l.cancelled && { textDecorationLine: 'line-through' },
          ]}>{l.subject}</Text>
          {/* A cancelled or substituted lesson is news, not a problem: neutral. */}
          {l.cancelled && <Tag label="odwołana" kind="neutral" />}
          {l.substitution && <Tag label="zastępstwo" kind="neutral" />}
          {teacherAway && <Tag label="nauczyciel nieobecny" kind="neutral" />}
          {live?.kind === 'now' && <Tag label="teraz" kind="accent" />}
          {live?.kind === 'next' && live.inMin <= 120 && <Tag label={`za ${live.inMin} min`} kind="accent" />}
        </View>
        <Text style={[type.footnote, { color: t.secondary }]}>
          {l.room ? <Text style={{ color: t.ink, fontWeight: '600' }}>sala {l.room}</Text> : null}
          {l.room && l.teacher ? ' · ' : ''}
          {l.teacher}
          {l.orgTeacher ? ` · zamiast: ${l.orgTeacher}` : ''}
          {l.orgSubject ? ` · było: ${l.orgSubject}` : ''}
          {l.note ? ` · ${l.note}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lucky: { borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 3, alignItems: 'center', marginRight: 6 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  modal: { width: '100%', maxWidth: 360, borderRadius: radius.lg + 8, padding: space.xl, alignItems: 'center', gap: space.md },
  modalButton: { alignSelf: 'stretch', borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: space.sm },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  monthText: { fontSize: 17, fontWeight: '600', textTransform: 'capitalize' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500', marginVertical: 6 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', height: 8, marginTop: 3, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  todayBtn: { alignSelf: 'center', paddingTop: space.md, paddingBottom: space.xs },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm, marginTop: space.lg },
  free: { borderRadius: radius.lg, padding: space.lg, marginTop: space.md },
  dayTitle: { flexShrink: 1 },
  lesson: { flexDirection: 'row', gap: space.md, paddingVertical: space.md, alignItems: 'flex-start' },
  nowBar: { position: 'absolute', left: -space.lg, top: 10, bottom: 10, width: 3, borderRadius: 2 },
  lessonNo: { minWidth: 14, fontVariant: ['tabular-nums'], paddingTop: 1 },
  time: { fontVariant: ['tabular-nums'] },
  subjectLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  absence: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  gridHead: { flexDirection: 'row', marginTop: space.md, marginBottom: space.xs },
  gridRow: { flexDirection: 'row', alignItems: 'stretch' },
  gridNo: { width: 22, fontVariant: ['tabular-nums'], paddingTop: 6 },
  gridDay: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: radius.sm },
  gridCell: { flex: 1, minHeight: 50, margin: 2, borderRadius: radius.sm, paddingHorizontal: 4, paddingVertical: 5, justifyContent: 'center' },
});
