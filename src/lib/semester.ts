import { useMemo, useState } from 'react';

/**
 * Semesters present in a list, and which one is shown. Defaults to the latest,
 * since in the second semester the first one's entries are history.
 */
export function useSemester(items: { semester: number | null }[]) {
  const semesters = useMemo(
    () => [...new Set(items.map((x) => x.semester).filter((s): s is number => s != null))].sort(),
    [items],
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const semester = chosen ?? semesters[semesters.length - 1] ?? null;
  return { semesters, semester, setSemester: setChosen };
}
