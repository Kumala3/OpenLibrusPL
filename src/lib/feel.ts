// Haptics and motion preferences, in one place so they stay rare and consistent.
// Haptics mark a choice or a finished action, never an ordinary tap.

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const native = Platform.OS !== 'web';

/** A selection changed: a tab, a segment, a filter. */
export function tick() {
  if (native) Haptics.selectionAsync().catch(() => {});
}

/** Something finished well: a sync, a sign-in. */
export function done() {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** The system "reduce motion" setting; animations step instead of moving when it is on. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
