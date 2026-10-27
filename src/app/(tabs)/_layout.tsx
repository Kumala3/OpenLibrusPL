import { Tabs } from 'expo-router';
import { StyleSheet, useColorScheme } from 'react-native';
import { CalendarDays, GraduationCap, ListTodo, Megaphone, UserCheck } from 'lucide-react-native';
import { useAppData } from '../../state/data';
import { today } from '../../lib/dates';
import { eventKind } from '../../lib/school';
import { tick } from '../../lib/feel';
import { useTheme } from '../../ui/theme';

export default function TabLayout() {
  const t = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const data = useAppData();
  const now = today();
  const upcomingTests = data.homework.filter(
    (h) => h.date && h.date >= now && ['test', 'quiz'].includes(eventKind(h.category)),
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Monochrome on purpose: ink for the current tab, grey for the rest. The
        // bar is set apart by a soft shadow in light mode (a hairline in dark,
        // where a shadow cannot show), not by colour.
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.tertiary,
        tabBarStyle: [
          { backgroundColor: t.surface, borderTopWidth: 0 },
          scheme === 'dark'
            ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }
            : { boxShadow: '0 -1px 0 rgba(16, 18, 24, 0.04), 0 -6px 20px rgba(16, 18, 24, 0.06)' },
        ],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Five tabs share the width, so a large system font (1.4 on the test
        // phone) cut every label short. The content still scales; the tab
        // labels stay at their designed size.
        tabBarAllowFontScaling: false,
      }}
      // A light tick on switching tabs, as native apps do.
      screenListeners={{ tabPress: () => tick() }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Kalendarz', tabBarIcon: ({ color, focused }) => <CalendarDays size={22} color={color} strokeWidth={focused ? 2.4 : 1.7} /> }}
      />
      <Tabs.Screen
        name="terminarz"
        options={{
          title: 'Terminarz',
          tabBarIcon: ({ color, focused }) => <ListTodo size={22} color={color} strokeWidth={focused ? 2.4 : 1.7} />,
          tabBarBadge: upcomingTests || undefined,
          tabBarBadgeStyle: { backgroundColor: t.ink, color: t.bg, fontSize: 10, fontWeight: '700' },
        }}
      />
      <Tabs.Screen
        name="oceny"
        options={{ title: 'Oceny', tabBarIcon: ({ color, focused }) => <GraduationCap size={22} color={color} strokeWidth={focused ? 2.4 : 1.7} /> }}
      />
      <Tabs.Screen
        name="frekwencja"
        options={{ title: 'Frekwencja', tabBarIcon: ({ color, focused }) => <UserCheck size={22} color={color} strokeWidth={focused ? 2.4 : 1.7} /> }}
      />
      <Tabs.Screen
        name="ogloszenia"
        options={{ title: 'Ogłoszenia', tabBarIcon: ({ color, focused }) => <Megaphone size={22} color={color} strokeWidth={focused ? 2.4 : 1.7} /> }}
      />
    </Tabs>
  );
}
