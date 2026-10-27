// The design system: colour, type and spacing tokens. Screens use these names
// only, never a raw colour.
//
// The colour rule: colour says how much something needs your attention, never
// what category it is. Everything ordinary is neutral grey, so the few
// coloured things stand out. What you can tap is ink, not a colour: buttons,
// links, the tab bar and the current tab are black or white, and lift off the
// page with a shadow rather than a tint.
//
//   accent    indigo  live state only: the lesson on now, minutes to the
//                     next one, a new notice
//   signal    orange  something to prepare for
//                     filled  = sprawdzian, praca klasowa, test
//                     tinted  = kartkówka, dyktando
//   negative  red     an outcome that hurts: grade 1-2, unexcused absence,
//                     attendance under 50% (nieklasyfikowany territory)
//   positive  green   good news: grade 5-6, a day off
//   neutral   grey    everything else: homework, excused absence, a
//                     cancelled lesson (news, not a problem), grade 3-4
//
// Lateness is signal: it is worth noticing but is not an absence. Colour is
// never the only cue; every coloured thing also carries a word or a number.
//
// Values were built in OKLCH (indigo hue 285, orange 52, red 25, green 155)
// and every text/background pair checked against WCAG AA in both themes.

import { TextStyle, useColorScheme } from 'react-native';

const light = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  raised: '#eff0f3',
  ink: '#191b1f',
  secondary: '#60636a',
  tertiary: '#898c92',
  line: '#dfe1e5',
  accent: '#5e48c8',
  accentBg: '#ececff',
  onAccent: '#ffffff',
  signal: '#ac4b00',
  signalBg: '#ffe9d8',
  onSignal: '#ffffff',
  negative: '#c2272d',
  negativeBg: '#ffe6e3',
  positive: '#0b7643',
  positiveBg: '#daf7e3',
  scrim: 'rgba(10, 12, 16, 0.45)',
  shadow: '#0b0d12',
};

const dark: typeof light = {
  bg: '#000000',
  surface: '#151619',
  raised: '#222428',
  ink: '#f0f2f4',
  secondary: '#a1a4ac',
  tertiary: '#6e7179',
  line: '#2c2e32',
  accent: '#a29dff',
  accentBg: '#2b284f',
  onAccent: '#0d0b24',
  signal: '#fd9c5d',
  signalBg: '#4b2409',
  onSignal: '#1f0d00',
  negative: '#f47b74',
  negativeBg: '#4b1d1b',
  positive: '#65c98c',
  positiveBg: '#0f3620',
  scrim: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** What a coloured thing means; see the rule at the top of this file. */
export type Tone = 'neutral' | 'accent' | 'signal' | 'signalStrong' | 'negative' | 'positive';

/** Foreground and background for a tone. `signalStrong` is the one filled style. */
export function tone(t: Theme, kind: Tone): { fg: string; bg: string } {
  switch (kind) {
    case 'accent': return { fg: t.accent, bg: t.accentBg };
    case 'signal': return { fg: t.signal, bg: t.signalBg };
    case 'signalStrong': return { fg: t.onSignal, bg: t.signal };
    case 'negative': return { fg: t.negative, bg: t.negativeBg };
    case 'positive': return { fg: t.positive, bg: t.positiveBg };
    default: return { fg: t.secondary, bg: t.raised };
  }
}

/**
 * Seven type roles, after the iOS scale. A screen title, a section's title, a
 * row's lead line, reading text, supporting text, metadata, labels.
 */
export const type = {
  largeTitle: { fontSize: 30, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  headline: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  subhead: { fontSize: 14, lineHeight: 19 },
  footnote: { fontSize: 13, lineHeight: 17 },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

/**
 * The one raised elevation: a soft lift in light mode, a hairline in dark.
 *
 * Light mode uses CSS boxShadow, not Android's `elevation`: elevation draws
 * its own hard-edged shadow and ignores radius and opacity, which left dark
 * smudges along card edges. The shadow is layered, as on iOS: a faint ring for
 * the edge, a tight shadow for contact, a wide one for lift.
 */
export function elevation(t: Theme, scheme: 'light' | 'dark') {
  return scheme === 'dark'
    ? { borderWidth: 1, borderColor: t.line }
    : { boxShadow: '0 0 0 1px rgba(16, 18, 24, 0.04), 0 1px 2px rgba(16, 18, 24, 0.05), 0 6px 20px rgba(16, 18, 24, 0.06)' };
}
