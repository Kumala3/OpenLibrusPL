// Sign in again without losing the data on the phone: for an expired session,
// a changed password, or a copy that was loaded without a login.

import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginForm } from '../ui/LoginForm';
import { space, useTheme } from '../ui/theme';

export default function Zaloguj() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: space.xl }}>
          <Text style={{ color: t.ink, fontSize: 16, fontWeight: '600' }}>Anuluj</Text>
        </Pressable>
        <LoginForm
          title="Zaloguj ponownie"
          subtitle="Zapisane logowanie przestało działać. Pobrane dane zostają na telefonie."
          onDone={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
