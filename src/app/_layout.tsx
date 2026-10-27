import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyThemePref, loadThemePref } from '../lib/settings';
import { DataProvider, useData } from '../state/data';
import { useTheme } from '../ui/theme';

// Before any screen renders, so a forced light or dark theme never flashes the other one.
applyThemePref(loadThemePref());

function Gate() {
  const { status } = useData();
  const t = useTheme();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  // A tap on a news notification opens Co nowego once the data is on screen,
  // once per notification.
  useEffect(() => {
    const id = response?.notification.request.identifier ?? null;
    const url = response?.notification.request.content.data?.url;
    if (status !== 'ready' || !id || handled.current === id || url !== '/nowosci') return;
    handled.current = id;
    router.push('/nowosci');
  }, [status, response]);
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.secondary} />
      </View>
    );
  }
  const ready = status === 'ready';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="przedmiot/[name]" />
        <Stack.Screen name="konto" options={{ presentation: 'modal' }} />
        <Stack.Screen name="zaloguj" options={{ presentation: 'modal' }} />
        <Stack.Screen name="uwagi" />
        <Stack.Screen name="nowosci" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!ready}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style="auto" />
        <Gate />
      </DataProvider>
    </SafeAreaProvider>
  );
}
