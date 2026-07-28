'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Eraser } from 'lucide-react';
import type { DayKey, TimeEntry } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TimeField } from './fields/time-field';
import { PauseField } from './fields/pause-field';
import { ProjectField } from './fields/project-field';
import { dayKeyToDate, isWeekendKey } from '@/lib/date-keys';
import { hasContent } from '@/lib/entries';
import { cn, formatDuration } from '@/lib/utils';

export interface DayRowProps {
  dayKey: DayKey;
  entry: TimeEntry | undefined;
  isToday: boolean;
  suggestionsId?: string;
  /** Wird nur an der Zeile des heutigen Tages gesetzt (Autoscroll). */
  rowRef?: React.RefObject<HTMLElement | null>;
  onFieldChange(
    dayKey: DayKey,
    field: 'project' | 'begin' | 'end' | 'pause',
    value: string | number | null
  ): void;
  onClear(dayKey: DayKey): void;
}

function DayRowImpl({
  dayKey,
  entry,
  isToday,
  suggestionsId,
  rowRef,
  onFieldChange,
  onClear,
}: DayRowProps) {
  const date = dayKeyToDate(dayKey)!;
  const weekend = isWeekendKey(dayKey);
  const filled = hasContent(entry);

  return (
    <TableRow
      ref={rowRef as React.Ref<HTMLTableRowElement>}
      className={cn(weekend && 'bg-weekend', isToday && 'bg-primary/5')}
    >
      <TableCell className="whitespace-nowrap font-medium">
        <span className="flex items-center gap-2">
          {isToday ? (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          ) : null}
          <span className="tabular">{format(date, 'EEE, d. MMM', { locale: de })}</span>
        </span>
      </TableCell>
      <TableCell>
        <ProjectField
          id={`project-${dayKey}`}
          value={entry?.project ?? ''}
          onChange={(value) => onFieldChange(dayKey, 'project', value)}
          suggestionsId={suggestionsId}
          hideLabel
        />
      </TableCell>
      <TableCell>
        <TimeField
          id={`begin-${dayKey}`}
          label="Beginn"
          value={entry?.begin ?? null}
          onChange={(value) => onFieldChange(dayKey, 'begin', value)}
          hideLabel
        />
      </TableCell>
      <TableCell>
        <TimeField
          id={`end-${dayKey}`}
          label="Ende"
          value={entry?.end ?? null}
          onChange={(value) => onFieldChange(dayKey, 'end', value)}
          hideLabel
        />
      </TableCell>
      <TableCell>
        <PauseField
          id={`pause-${dayKey}`}
          value={entry?.pause ?? 0}
          onChange={(value) => onFieldChange(dayKey, 'pause', value)}
          hideLabel
        />
      </TableCell>
      <TableCell
        className={cn(
          'whitespace-nowrap text-right font-semibold tabular',
          entry && entry.total > 0 ? 'text-success' : 'text-muted-foreground'
        )}
      >
        {entry && entry.total > 0 ? formatDuration(entry.total) : '–'}
      </TableCell>
      <TableCell className="w-10 px-1">
        {filled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => onClear(dayKey)}
            aria-label={`Eintrag für ${format(date, 'd. MMMM', { locale: de })} leeren`}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

/** Memoisiert: Tippen in einer Zeile darf nicht 30 andere neu rendern. */
export const DayRow = React.memo(DayRowImpl);
