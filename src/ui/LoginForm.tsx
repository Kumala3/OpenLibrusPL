// The login form, used on first run and again when a saved login stops working.
// Signing in again keeps the data on the phone; only "Wyloguj" deletes it.

import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useData } from '../state/data';
import { radius, space, useTheme } from './theme';

export function LoginForm({ title, subtitle, onDone }: { title: string; subtitle: string; onDone?: () => void }) {
  const t = useTheme();
  const { signIn, progress } = useData();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!login.trim() || !password) {
      setError('Wpisz login i hasło.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn({ login: login.trim(), password });
      onDone?.();
    } catch (e) {
      setError((e as Error)?.message || 'Logowanie nie powiodło się');
      setBusy(false);
    }
  };

  const input = [styles.input, { color: t.ink, borderColor: t.line, backgroundColor: t.surface }];
  return (
    <View style={styles.inner}>
      <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
      <Text style={[styles.sub, { color: t.secondary }]}>{subtitle}</Text>
      <TextInput
        style={input}
        placeholder="Login"
        placeholderTextColor={t.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        value={login}
        onChangeText={setLogin}
        editable={!busy}
        accessibilityLabel="Login"
      />
      <TextInput
        style={input}
        placeholder="Hasło"
        placeholderTextColor={t.tertiary}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        editable={!busy}
        accessibilityLabel="Hasło"
      />
      {error && <Text style={[styles.error, { color: t.negative }]}>{error}</Text>}
      <Pressable
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Zaloguj"
        style={({ pressed }) => [styles.button, { backgroundColor: t.ink, opacity: pressed || busy ? 0.7 : 1 }]}>
        {busy ? (
          <View style={styles.row}>
            <ActivityIndicator color={t.bg} />
            <Text style={[styles.buttonText, { color: t.bg }]}>
              {progress ? `Pobieranie ${progress.done}/${progress.total}` : 'Logowanie…'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.buttonText, { color: t.bg }]}>Zaloguj</Text>
        )}
      </Pressable>
      <Text style={[styles.note, { color: t.secondary }]}>
        Hasło zostaje na tym telefonie, w zaszyfrowanym magazynie systemu. Dane szkoły pobierają się raz i są
        dostępne bez internetu.
      </Text>
      {Platform.OS === 'web' && (
        <Text style={[styles.note, { color: t.signal }]}>
          W przeglądarce Librus blokuje logowanie. Wersja web służy do podglądu z public/fixture.json.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { padding: space.xl, gap: space.md, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  sub: { fontSize: 14, marginBottom: space.sm, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16 },
  error: { fontSize: 14 },
  button: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: space.sm },
  buttonText: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  note: { fontSize: 12, lineHeight: 17 },
});
