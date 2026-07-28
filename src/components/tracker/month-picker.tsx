'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentMonthKey, makeMonthKey, monthKeyToDate, parseMonthKey } from '@/lib/date-keys';

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) =>
  format(new Date(2000, index, 1), 'MMMM', { locale: de })
);

interface MonthPickerProps {
  monthKey: MonthKey;
  onChange(monthKey: MonthKey): void;
}

export function MonthPicker({ monthKey, onChange }: MonthPickerProps) {
  const parsed = parseMonthKey(monthKey) ?? parseMonthKey(currentMonthKey())!;
  const date = monthKeyToDate(monthKey) ?? new Date();

  const years = React.useMemo(() => {
    const thisYear = new Date().getFullYear();
    const from = Math.min(thisYear - 5, parsed.year);
    const to = Math.max(thisYear + 2, parsed.year);
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }, [parsed.year]);

  const shift = (delta: number) => {
    const next = new Date(parsed.year, parsed.month - 1 + delta, 1);
    onChange(makeMonthKey(next.getFullYear(), next.getMonth() + 1));
  };

  const isCurrent = monthKey === currentMonthKey();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border bg-card">
        <Button
          variant="ghost"
          size="touch"
          onClick={() => shift(-1)}
          aria-label="Vorheriger Monat"
          className="rounded-r-none"
        >
          <ChevronLeft />
        </Button>
        <span
          className="min-w-[9.5rem] px-2 text-center text-sm font-medium"
          aria-live="polite"
        >
          {format(date, 'MMMM yyyy', { locale: de })}
        </span>
        <Button
          variant="ghost"
          size="touch"
          onClick={() => shift(1)}
          aria-label="Nächster Monat"
          className="rounded-l-none"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="flex flex-1 gap-2 sm:flex-none">
        <div className="flex-1 sm:flex-none">
          <label htmlFor="month-select" className="sr-only">
            Monat
          </label>
          <Select
            value={String(parsed.month)}
            onValueChange={(value) => onChange(makeMonthKey(parsed.year, Number(value)))}
          >
            <SelectTrigger id="month-select" className="h-touch w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="year-select" className="sr-only">
            Jahr
          </label>
          <Select
            value={String(parsed.year)}
            onValueChange={(value) => onChange(makeMonthKey(Number(value), parsed.month))}
          >
            <SelectTrigger id="year-select" className="h-touch w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isCurrent ? (
        <Button variant="outline" size="touchWide" onClick={() => onChange(currentMonthKey())}>
          Heute
        </Button>
      ) : null}
    </div>
  );
}
