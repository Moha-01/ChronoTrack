import type { DayKey, TimeEntry } from '@/lib/types';
import { parseDayKey } from '@/lib/date-keys';
import { calculateDuration } from '@/lib/utils';

/** Leerer Eintrag für einen Tag — begin/end bewusst null, nicht '00:00'. */
export function emptyEntry(dayKey: DayKey): TimeEntry {
  return {
    id: dayKey,
    day: parseDayKey(dayKey)?.day ?? 0,
    project: '',
    begin: null,
    end: null,
    pause: 0,
    total: 0,
  };
}

/**
 * Ob der Tag überhaupt etwas enthält.
 *
 * Bewusst nicht `total > 0`: ein Tag, an dem nur ein Projektname steht oder an
 * dem Beginn und Ende gleich sind, ist erfasst und darf nicht still aus Bericht
 * und Übersicht verschwinden.
 */
export function hasContent(entry: TimeEntry | undefined | null): boolean {
  if (!entry) return false;
  return (
    entry.begin !== null ||
    entry.end !== null ||
    entry.project.trim() !== '' ||
    entry.pause > 0
  );
}

/** Setzt `total` aus begin/end/pause neu — die einzige Quelle der Wahrheit. */
export function withRecomputedTotal(entry: TimeEntry): TimeEntry {
  const total = calculateDuration(entry.begin, entry.end, entry.pause);
  return total === entry.total ? entry : { ...entry, total };
}

export function sumTotals(entries: Iterable<TimeEntry>): number {
  let sum = 0;
  for (const entry of entries) sum += entry.total;
  return sum;
}
