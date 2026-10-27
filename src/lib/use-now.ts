import { useEffect, useState } from 'react';

/**
 * The current time as state, refreshed on an interval. Rendering reads this
 * instead of calling Date.now(), so "5 min temu" and "teraz" move on their own
 * while a screen stays open, and render stays pure.
 */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
