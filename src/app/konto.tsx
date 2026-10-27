import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ago, longDate } from '../lib/dates';
import { useNow } from '../lib/use-now';
import { setBackgroundCheck } from '../lib/background';
import { allowNotifications, scheduleReminders } from '../lib/reminders';
import { currentVersion, isNewer, openDownload } from '../lib/updates';
import { loadThemePref, read, saveThemePref, setBackgroundInterval, setReminders, setWifiOnly, useSettings, write, type ThemePref } from '../lib/settings';
import { useAppData, useData } from '../state/data';
import { Card, SectionTitle, Segmented } from '../ui/kit';
import { radius, space, type, useTheme } from '../ui/theme';

export default function Konto() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { signOut, hasCredentials, errorKind } = useData();
  const needsLogin = !hasCredentials || errorKind === 'auth';
  const synced = new Date(data.syncedAt);
  const now = useNow();
  const [themePref, setThemePref] = useState<ThemePref>(loadThemePref);
  const settings = useSettings();
  const reminders = settings.reminders === true;
  const background = settings.background ?? 0;

  const changeBackground = async (minutes: number) => {
    if (minutes && !(await allowNotifications())) {
      Alert.alert('Powiadomienia są wyłączone', 'Zezwól aplikacji na powiadomienia w ustawieniach telefonu, a potem włącz sprawdzanie jeszcze raz.');
      return;
    }
    setBackgroundInterval(minutes || null);
    await setBackgroundCheck(minutes || null);
  };

  const toggleReminders = async (on: boolean) => {
    if (on && !(await allowNotifications())) {
      Alert.alert('Powiadomienia są wyłączone', 'Zezwól aplikacji na powiadomienia w ustawieniach telefonu, a potem włącz przypomnienia jeszcze raz.');
      return;
    }
    setReminders(on);
    await scheduleReminders(data, on);
  };

  const confirmSignOut = () => {
    const go = () => signOut();
    if (Platform.OS === 'web') { go(); return; }
    Alert.alert('Wylogować?', 'Hasło i pobrane dane zostaną usunięte z telefonu.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: go },
    ]);
  };

  const weeks = Object.keys(data.timetable).length;
  const school = data.school;
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg }}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={{ color: t.ink, fontSize: 16, fontWeight: '600' }}>Zamknij</Text>
      </Pressable>
      <Text style={[styles.title, { color: t.ink }]}>{data.student.name ?? 'Konto'}</Text>
      {school?.className && (
        <Text style={[type.subhead, { color: t.secondary, marginTop: 2 }]}>klasa {school.className}</Text>
      )}

      {school && (
        <>
          <SectionTitle>Szkoła i klasa</SectionTitle>
          <Card>
            {school.className && <Row label="Klasa" value={school.className} />}
            {school.tutors.length > 0 && (
              <Row label={school.tutors.length > 1 ? 'Wychowawcy' : 'Wychowawca'} value={school.tutors.join(', ')} />
            )}
            {school.school && <Row label="Szkoła" value={school.school} />}
            {school.address && <Row label="Adres" value={school.address} />}
            {school.semesterEnd && <Row label="Koniec semestru" value={longDate(school.semesterEnd)} />}
            {school.yearEnd && <Row label="Koniec roku" value={longDate(school.yearEnd)} />}
          </Card>
        </>
      )}

      <SectionTitle>Wygląd</SectionTitle>
      <Segmented<ThemePref>
        options={[
          { value: 'system', label: 'Automatyczny' },
          { value: 'light', label: 'Jasny' },
          { value: 'dark', label: 'Ciemny' },
        ]}
        value={themePref}
        onChange={(p) => { setThemePref(p); saveThemePref(p); }}
      />
      <Text style={[styles.hint, { color: t.secondary }]}>
        {themePref === 'system' ? 'Jak w ustawieniach telefonu.' : 'Niezależnie od ustawień telefonu.'}
      </Text>

      {Platform.OS === 'android' && (
        <>
          <SectionTitle>Przypomnienia</SectionTitle>
          <Card>
            <View style={styles.switchRow}>
              <Text style={[type.body, { color: t.ink, flex: 1 }]}>Sprawdziany i kartkówki</Text>
              <Switch
                value={reminders}
                onValueChange={toggleReminders}
                accessibilityLabel="Przypomnienia o sprawdzianach i kartkówkach"
                trackColor={{ true: t.ink, false: t.line }}
                thumbColor={t.surface}
              />
            </View>
          </Card>
          <Text style={[styles.hint, { color: t.secondary }]}>
            Powiadomienie o 18:00 dzień wcześniej. Telefon planuje je sam z pobranych danych, bez łączenia się z Librusem.
          </Text>

          <SectionTitle>Sprawdzanie w tle</SectionTitle>
          <Segmented<number>
            options={[
              { value: 0, label: 'Wył.' },
              { value: 30, label: '30 min' },
              { value: 60, label: '1 h' },
              { value: 120, label: '2 h' },
            ]}
            value={background}
            onChange={changeBackground}
          />
          <Text style={[styles.hint, { color: t.secondary }]}>
            {background
              ? `Mniej więcej co ${background === 60 ? 'godzinę' : background === 120 ? '2 godziny' : '30 minut'} aplikacja sprawdza nowe oceny, wpisy, ogłoszenia, uwagi i zmiany w planie, i wysyła powiadomienie. 12 zapytań, tylko gdy telefon ma internet, nie w nocy (22–6). Android może sprawdzać rzadziej, żeby oszczędzać baterię.`
              : 'Wyłączone: dane pobierają się tylko po otwarciu aplikacji.'}
          </Text>
          {background > 0 && (
            <View style={{ marginTop: space.md }}>
              <Segmented<'any' | 'wifi'>
                options={[{ value: 'any', label: 'Wi-Fi i dane mobilne' }, { value: 'wifi', label: 'Tylko Wi-Fi' }]}
                value={settings.wifiOnly ? 'wifi' : 'any'}
                onChange={(v) => setWifiOnly(v === 'wifi')}
              />
              <Text style={[styles.hint, { color: t.secondary }]}>
                {settings.wifiOnly
                  ? 'Sprawdza tylko na Wi-Fi. W szkole, na danych mobilnych, powiadomienia przyjdą dopiero po powrocie do Wi-Fi.'
                  : 'Sprawdza też na danych mobilnych. Jedno sprawdzenie to najwyżej około 0,2 MB, więc co godzinę przez dzień szkolny wychodzi kilka MB.'}
              </Text>
            </View>
          )}
        </>
      )}

      <SectionTitle>Aktualizacje</SectionTitle>
      <Card>
        <View style={styles.switchRow}>
          <Text style={[type.body, { color: t.ink, flex: 1 }]}>Sprawdzaj, czy jest nowa wersja</Text>
          <Switch
            value={settings.updateChecks !== false}
            onValueChange={(on) => write({ ...read(), updateChecks: on })}
            accessibilityLabel="Sprawdzaj, czy jest nowa wersja"
            trackColor={{ true: t.ink, false: t.line }}
            thumbColor={t.surface}
          />
        </View>
        {settings.latestVersion && isNewer(settings.latestVersion, currentVersion()) ? (
          <Pressable onPress={openDownload} hitSlop={6} style={{ marginTop: space.md }}>
            <Text style={[type.subhead, { color: t.ink, fontWeight: '600' }]}>Pobierz wersję {settings.latestVersion} ›</Text>
          </Pressable>
        ) : null}
      </Card>
      <Text style={[styles.hint, { color: t.secondary }]}>
        Raz dziennie pyta GitHuba o numer najnowszej wersji. Nie wysyła żadnych danych.
      </Text>

      <SectionTitle>Dane na telefonie</SectionTitle>
      <Card>
        <Row
          label="Pobrano"
          value={`${synced.toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (${ago(data.syncedAt, now)})`}
        />
        <Row label="Tygodnie planu" value={String(weeks)} />
        <Row label="Oceny" value={String(data.grades.length)} />
        <Row label="Wpisy w terminarzu" value={String(data.homework.length)} />
        <Row label="Frekwencja" value={`${data.attendance.length} wpisów`} />
        {data.failed.length > 0 && <Row label="Nie pobrano" value={data.failed.join(', ')} warn />}
      </Card>

      <Text style={[styles.note, { color: t.secondary }]}>
        Aplikacja sama pobiera dane przy uruchomieniu, jeśli kopia ma ponad 6 godzin. Ręcznie można odświeżyć
        co 3 minuty. Jedno pobranie to 26 zapytań do Librusa, sprawdzenie w tle 12. Wiadomości nie są pobierane.
      </Text>

      {needsLogin && (
        <Pressable
          onPress={() => router.push('/zaloguj')}
          style={({ pressed }) => [styles.button, { borderColor: t.ink, backgroundColor: t.ink, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: t.bg, fontWeight: '600', fontSize: 15 }}>Zaloguj ponownie</Text>
        </Pressable>
      )}
      <Pressable
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.button, { borderColor: t.negative, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={{ color: t.negative, fontWeight: '600', fontSize: 15 }}>Wyloguj i usuń dane</Text>
      </Pressable>
      <Text style={[styles.note, styles.version, { color: t.tertiary }]}>
        OpenLibrus {Constants.expoConfig?.version} · nieoficjalna, niezwiązana z Librus
      </Text>
    </ScrollView>
  );

  function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    return (
      <View style={styles.row}>
        <Text style={{ color: t.secondary, fontSize: 14 }}>{label}</Text>
        <Text style={{ color: warn ? t.signal : t.ink, fontSize: 14, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginTop: space.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 6 },
  note: { fontSize: 12, lineHeight: 17, marginVertical: space.md },
  hint: { fontSize: 12, marginTop: space.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  version: { textAlign: 'center', marginTop: space.lg },
  button: { borderWidth: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: space.sm },
});
