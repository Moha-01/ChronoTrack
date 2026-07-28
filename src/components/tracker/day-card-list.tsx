'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { DayKey, EmployeeEntries, MonthKey } from '@/lib/types';
import { DayCard } from './day-card';
import { dayKeysOfMonth, dayKeyToDate, isoWeekOf, todayKey } from '@/lib/date-keys';
import { formatDuration } from '@/lib/utils';

interface DayCardListProps {
  monthKey: MonthKey;
  entries: EmployeeEntries;
  suggestionsId?: string;
  /** Ziel für den Autoscroll zum heutigen Tag. */
  todayRef?: React.RefObject<HTMLElement | null>;
  onFieldChange(
    dayKey: DayKey,
    field: 'project' | 'begin' | 'end' | 'pause',
    value: string | number | null
  ): void;
  onClear(dayKey: DayKey): void;
}

interface WeekGroup {
  week: number;
  dayKeys: DayKey[];
  total: number;
}

export function DayCardList({
  monthKey,
  entries,
  suggestionsId,
  todayRef,
  onFieldChange,
  onClear,
}: DayCardListProps) {
  const today = todayKey();

  const groups = React.useMemo<WeekGroup[]>(() => {
    const result: WeekGroup[] = [];
    for (const dayKey of dayKeysOfMonth(monthKey)) {
      const week = isoWeekOf(dayKey);
      let group = result[result.length - 1];
      if (!group || group.week !== week) {
        group = { week, dayKeys: [], total: 0 };
        result.push(group);
      }
      group.dayKeys.push(dayKey);
      group.total += entries[dayKey]?.total ?? 0;
    }
    return result;
  }, [monthKey, entries]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.week} aria-label={`Kalenderwoche ${group.week}`}>
          {/*
            Sticky auf dem Sektions-Header ist natives Browserverhalten -- jeder
            Header schiebt den vorigen weg. Kein IntersectionObserver nötig.
            `top-header` parkt ihn exakt unter der App-Kopfzeile.
          */}
          <h3 className="sticky top-header z-20 -mx-4 mb-2 flex items-center justify-between border-b bg-background/85 px-4 py-2 text-sm font-medium backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <span>
              KW {group.week}
              <span className="ml-2 font-normal text-muted-foreground">
                {formatRange(group.dayKeys)}
              </span>
            </span>
            <span className={group.total > 0 ? 'tabular text-success' : 'tabular text-muted-foreground'}>
              {formatDuration(group.total)}
            </span>
          </h3>

          <div className="space-y-2">
            {group.dayKeys.map((dayKey) => (
              <DayCard
                // Der Monat im key setzt den Auf-/Zuklapp-Zustand beim
                // Monatswechsel zurück.
                key={dayKey}
                dayKey={dayKey}
                entry={entries[dayKey]}
                isToday={dayKey === today}
                suggestionsId={suggestionsId}
                cardRef={dayKey === today ? todayRef : undefined}
                onFieldChange={onFieldChange}
                onClear={onClear}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function formatRange(dayKeys: DayKey[]): string {
  const first = dayKeyToDate(dayKeys[0]);
  const last = dayKeyToDate(dayKeys[dayKeys.length - 1]);
  if (!first || !last) return '';
  if (dayKeys.length === 1) return format(first, 'd. MMM', { locale: de });
  return `${format(first, 'd.', { locale: de })}–${format(last, 'd. MMM', { locale: de })}`;
}
