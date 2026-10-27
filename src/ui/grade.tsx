import { StyleSheet, Text, View } from 'react-native';
import { gradeTone } from '../lib/school';
import { radius, tone, useTheme } from './theme';

/**
 * A grade as a tile. Tone follows the grade (5-6 positive, 1-2 negative, the
 * middle neutral); `dim` outlines semester and final grades, which do not
 * count toward the average.
 */
export function GradeBox({ g, small, dim }: { g: string; small?: boolean; dim?: boolean }) {
  const t = useTheme();
  const c = tone(t, gradeTone(g));
  const fg = gradeTone(g) === 'neutral' ? t.ink : c.fg;
  return (
    <View style={[
      styles.box,
      small && styles.small,
      { backgroundColor: c.bg },
      dim && { borderWidth: 1.5, borderColor: t.secondary, borderStyle: 'dashed' },
    ]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 15 : 18 }}>{g}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minWidth: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  small: { minWidth: 32, height: 32, borderRadius: radius.sm },
});
