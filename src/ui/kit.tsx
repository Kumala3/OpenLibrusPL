// The handful of pieces every screen uses: a pressable surface, a card, a tag,
// a segmented control, filter chips, a header and an empty state. Colours come
// from theme tokens only; see the colour rule in theme.ts.

import { router } from 'expo-router';
import { Bell, RefreshCw, UserRound } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator, Animated, Pressable, StyleSheet, Text, useColorScheme, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tick, useReducedMotion } from '../lib/feel';
import { useSettings } from '../lib/settings';
import { currentVersion, isNewer, openDownload } from '../lib/updates';
import { useData } from '../state/data';
import { elevation, radius, space, tone, type, useTheme, type Tone } from './theme';

/**
 * Anything you can press. It sinks a little under the finger and springs back,
 * which reads as "this responded" without a flash of colour.
 */
export function Tappable({ children, onPress, style, disabled, label, role = 'button' }: {
  children: ReactNode; onPress?: () => void; style?: ViewStyle | ViewStyle[]; disabled?: boolean;
  label?: string; role?: 'button' | 'link' | 'tab';
}) {
  // State, not a ref: created once, and reading it during render is allowed.
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  const to = (v: number) => {
    if (reduced) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      disabled={disabled || !onPress}
      accessibilityRole={role}
      accessibilityLabel={label}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Header({ title, right }: { title: string; right?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { syncing, progress, error, errorKind, hasCredentials, refresh, data } = useData();
  const seen = useSettings().newsSeenAt ?? '';
  const latest = data?.news?.[0]?.at;
  const unread = latest != null && latest > seen;
  // The header stays quiet unless something needs attention: a download in
  // progress, an error, or a login that no longer works. How old the copy is
  // lives in Konto.
  const needsLogin = !syncing && (errorKind === 'auth' || !hasCredentials);
  const status = syncing
    ? `Pobieranie${progress ? ` ${progress.done}/${progress.total}` : ''}…`
    : needsLogin
      ? 'Zaloguj się, aby odświeżyć ›'
      : error ?? '';
  const color = needsLogin ? t.ink : error && !syncing ? t.negative : t.secondary;
  const onRefresh = () => (needsLogin ? router.push('/zaloguj') : refresh());
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm, backgroundColor: t.bg }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.largeTitle, { color: t.ink }]}>{title}</Text>
        {status ? (
          <Pressable onPress={needsLogin ? () => router.push('/zaloguj') : undefined} disabled={!needsLogin} hitSlop={6}>
            <Text style={[type.footnote, { color, marginTop: 2 }]} numberOfLines={1}>{status}</Text>
          </Pressable>
        ) : null}
      </View>
      {right}
      <IconButton label={unread ? 'Co nowego, są nowości' : 'Co nowego'} onPress={() => router.push('/nowosci')}>
        <Bell size={20} color={t.ink} />
        {unread && <View style={[styles.unread, { backgroundColor: t.accent, borderColor: t.bg }]} />}
      </IconButton>
      <IconButton label="Odśwież" onPress={onRefresh} disabled={syncing}>
        {syncing ? <ActivityIndicator size="small" color={t.secondary} /> : <RefreshCw size={20} color={t.ink} />}
      </IconButton>
      <IconButton label="Konto" onPress={() => router.push('/konto')}>
        <UserRound size={20} color={t.ink} />
      </IconButton>
    </View>
  );
}

export function IconButton({ children, onPress, label, disabled }: {
  children: ReactNode; onPress: () => void; label: string; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? t.raised : 'transparent' }]}>
      {children}
    </Pressable>
  );
}

/** A grouped surface. Pass `onPress` and the whole card becomes the target. */
export function Card({ children, style, onPress, label }: {
  children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string;
}) {
  const t = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const s = [styles.card, { backgroundColor: t.surface }, elevation(t, scheme), style ?? {}];
  return onPress ? <Tappable onPress={onPress} style={s} label={label}>{children}</Tappable> : <View style={s}>{children}</View>;
}

/** A short word with a meaning: "sprawdzian", "odwołana", "teraz". */
export function Tag({ label, kind }: { label: string; kind: Tone }) {
  const t = useTheme();
  const c = tone(t, kind);
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

/** A choice between a few options, iOS style: a sunken track with a raised selection. */
export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  const t = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <View style={[styles.seg, { backgroundColor: t.raised }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => { if (!on) { tick(); onChange(o.value); } }}
            style={[styles.segItem, on && [{ backgroundColor: scheme === 'dark' ? t.line : t.surface }, elevation(t, 'light')]]}>
            <Text style={[type.subhead, { color: on ? t.ink : t.secondary, fontWeight: on ? '600' : '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A filter. Selected is filled with ink: unmistakable, and not a status colour. */
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => { tick(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, { backgroundColor: on ? t.ink : t.surface, borderColor: on ? t.ink : t.line }]}>
      <Text style={[type.subhead, { color: on ? t.bg : t.ink, fontWeight: '500' }]}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[type.subhead, styles.empty, { color: t.secondary }]}>{text}</Text>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[type.caption, styles.section, { color: t.secondary }]}>{children}</Text>;
}

/** "A newer version is on GitHub", with a download button. Shows nothing otherwise. */
export function UpdateBanner() {
  const t = useTheme();
  const s = useSettings();
  const latest = s.latestVersion;
  if (s.updateChecks === false || !latest || !isNewer(latest, currentVersion())) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.headline, { color: t.ink }]}>Nowa wersja {latest}</Text>
          <Text style={[type.footnote, { color: t.secondary }]}>Zainstaluj na obecną, dane i logowanie zostaną.</Text>
        </View>
        <Pressable
          onPress={openDownload}
          accessibilityRole="button"
          style={({ pressed }) => [styles.updateBtn, { backgroundColor: t.ink, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[type.subhead, { color: t.bg, fontWeight: '600' }]}>Pobierz</Text>
        </Pressable>
      </View>
    </Card>
  );
}

/** A hairline between rows inside a card. */
export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line }} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.xs },
  updateBtn: { borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  unread: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, marginBottom: space.md },
  tag: { borderRadius: radius.sm - 2, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  tagText: { fontSize: 12, fontWeight: '600' },
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 3, alignSelf: 'flex-start' },
  segItem: { paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.sm + 1 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  empty: { paddingVertical: space.md },
  section: { textTransform: 'uppercase', marginTop: space.xl, marginBottom: space.sm, marginLeft: 2 },
});
