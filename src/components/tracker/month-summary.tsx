'use client';

import { formatDuration, formatDurationLong } from '@/lib/utils';
import type { MonthSummary as Summary } from '@/hooks/use-chrono-data';

interface MonthSummaryProps {
  summary: Summary;
  daysInMonth: number;
}

export function MonthSummary({ summary, daysInMonth }: MonthSummaryProps) {
  return (
    <div className="grid grid-cols-3 divide-x rounded-lg border bg-card">
      <Stat
        label="Gesamt"
        value={formatDuration(summary.totalMinutes)}
        // Die laufende Summe ändert sich beim Tippen -- Screenreader sollen das
        // mitbekommen, ohne dass jede Ziffer einzeln vorgelesen wird.
        live={formatDurationLong(summary.totalMinutes)}
        emphasis
      />
      <Stat label="Erfasste Tage" value={`${summary.filledDays} / ${daysInMonth}`} />
      <Stat label="Ø pro Tag" value={formatDuration(summary.averageMinutes)} />
    </div>
  );
}

function Stat({
  label,
  value,
  live,
  emphasis,
}: {
  label: string;
  value: string;
  live?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="px-3 py-3 text-center sm:px-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          emphasis
            ? 'mt-0.5 text-lg font-bold tabular text-success sm:text-xl'
            : 'mt-0.5 text-lg font-semibold tabular sm:text-xl'
        }
      >
        {value}
      </p>
      {live ? (
        <span aria-live="polite" className="sr-only">
          Gesamtzeit des Monats: {live}
        </span>
      ) : null}
    </div>
  );
}
