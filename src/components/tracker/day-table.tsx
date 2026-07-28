'use client';

import type { DayKey, EmployeeEntries, MonthKey } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DayRow } from './day-row';
import { dayKeysOfMonth, todayKey } from '@/lib/date-keys';
import { formatDuration } from '@/lib/utils';

interface DayTableProps {
  monthKey: MonthKey;
  entries: EmployeeEntries;
  totalMinutes: number;
  suggestionsId?: string;
  onFieldChange(
    dayKey: DayKey,
    field: 'project' | 'begin' | 'end' | 'pause',
    value: string | number | null
  ): void;
  onClear(dayKey: DayKey): void;
}

export function DayTable({
  monthKey,
  entries,
  totalMinutes,
  suggestionsId,
  onFieldChange,
  onClear,
}: DayTableProps) {
  const today = todayKey();
  const dayKeys = dayKeysOfMonth(monthKey);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {/* Bleibt beim Scrollen unter der App-Kopfzeile stehen. */}
          <TableRow className="sticky top-header z-10 bg-card hover:bg-card">
            <TableHead className="w-[150px] whitespace-nowrap">Tag</TableHead>
            <TableHead className="min-w-[200px]">Objekt/Projekt</TableHead>
            <TableHead className="w-[120px]">Beginn</TableHead>
            <TableHead className="w-[120px]">Ende</TableHead>
            <TableHead className="w-[120px]">Pause (min)</TableHead>
            <TableHead className="w-[110px] whitespace-nowrap text-right">Gesamt</TableHead>
            <TableHead className="w-10 px-1">
              <span className="sr-only">Aktionen</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dayKeys.map((dayKey) => (
            <DayRow
              key={dayKey}
              dayKey={dayKey}
              entry={entries[dayKey]}
              isToday={dayKey === today}
              suggestionsId={suggestionsId}
              onFieldChange={onFieldChange}
              onClear={onClear}
            />
          ))}
          <TableRow className="sticky bottom-0 border-t-2 bg-muted hover:bg-muted">
            <TableCell colSpan={5} className="text-right font-semibold">
              Gesamtzeit des Monats
            </TableCell>
            <TableCell className="whitespace-nowrap text-right text-base font-bold tabular text-success">
              {formatDuration(totalMinutes)}
            </TableCell>
            <TableCell className="px-1" />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
