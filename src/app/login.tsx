import { KeyboardAvoidingView, Platform } from 'react-native';
import { LoginForm } from '../ui/LoginForm';
import { useTheme } from '../ui/theme';

export default function Login() {
  const t = useTheme();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg }}>
      <LoginForm
        title="OpenLibrus"
        subtitle="Zaloguj się kontem Librus Synergia."
      />
    </KeyboardAvoidingView>
  );
}
