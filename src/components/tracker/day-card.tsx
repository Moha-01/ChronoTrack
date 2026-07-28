'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronDown, Eraser } from 'lucide-react';
import type { DayKey, TimeEntry } from '@/lib/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { TimeField } from './fields/time-field';
import { PauseField } from './fields/pause-field';
import { ProjectField } from './fields/project-field';
import { dayKeyToDate, isWeekendKey } from '@/lib/date-keys';
import { hasContent } from '@/lib/entries';
import { cn, formatDuration } from '@/lib/utils';

export interface DayCardProps {
  dayKey: DayKey;
  entry: TimeEntry | undefined;
  isToday: boolean;
  suggestionsId?: string;
  /** Wird nur an der Karte des heutigen Tages gesetzt (Autoscroll). */
  cardRef?: React.RefObject<HTMLElement | null>;
  onFieldChange(
    dayKey: DayKey,
    field: 'project' | 'begin' | 'end' | 'pause',
    value: string | number | null
  ): void;
  onClear(dayKey: DayKey): void;
}

function DayCardImpl({
  dayKey,
  entry,
  isToday,
  suggestionsId,
  cardRef,
  onFieldChange,
  onClear,
}: DayCardProps) {
  const date = dayKeyToDate(dayKey)!;
  const weekend = isWeekendKey(dayKey);
  const filled = hasContent(entry);

  // `defaultOpen` statt `open`: Wochenenden und leere Werktage starten
  // zugeklappt, aber ein manuelles Auf- oder Zuklappen bleibt bestehen.
  // Der key im Elternteil setzt das beim Monatswechsel zurück.
  const [open, setOpen] = React.useState(filled || isToday);

  return (
    <Collapsible
      ref={cardRef as React.Ref<HTMLDivElement>}
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'overflow-hidden rounded-lg border bg-card',
        weekend && 'bg-weekend',
        isToday && 'ring-2 ring-primary/40'
      )}
    >
      <CollapsibleTrigger asChild>
        {/* Die gesamte Zeile ist der Auslöser: 56px hohe Trefferfläche. */}
        <button
          type="button"
          className="flex h-14 w-full items-center gap-3 px-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span
            className={cn(
              'flex h-9 w-11 shrink-0 flex-col items-center justify-center rounded-md text-center leading-none',
              isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            <span className="text-[10px] uppercase">{format(date, 'EEE', { locale: de })}</span>
            <span className="text-sm font-semibold tabular">{format(date, 'd', { locale: de })}</span>
          </span>

          <span className="min-w-0 flex-1">
            {filled && entry?.project ? (
              <span className="block truncate text-sm">{entry.project}</span>
            ) : (
              <span className="block truncate text-sm text-muted-foreground">
                {weekend ? 'Wochenende' : 'Nicht erfasst'}
              </span>
            )}
            {filled && entry?.begin && entry?.end ? (
              <span className="block text-xs tabular text-muted-foreground">
                {entry.begin}–{entry.end}
                {entry.pause > 0 ? ` · ${entry.pause} min Pause` : ''}
              </span>
            ) : null}
          </span>

          <span
            className={cn(
              'shrink-0 text-sm font-semibold tabular',
              entry && entry.total > 0 ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {entry && entry.total > 0 ? formatDuration(entry.total) : '–'}
          </span>

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-4 border-t px-3 py-4">
          <ProjectField
            id={`project-${dayKey}`}
            value={entry?.project ?? ''}
            onChange={(value) => onFieldChange(dayKey, 'project', value)}
            suggestionsId={suggestionsId}
          />

          <div className="grid grid-cols-2 gap-3">
            <TimeField
              id={`begin-${dayKey}`}
              label="Beginn"
              value={entry?.begin ?? null}
              onChange={(value) => onFieldChange(dayKey, 'begin', value)}
            />
            <TimeField
              id={`end-${dayKey}`}
              label="Ende"
              value={entry?.end ?? null}
              onChange={(value) => onFieldChange(dayKey, 'end', value)}
            />
          </div>

          <PauseField
            id={`pause-${dayKey}`}
            value={entry?.pause ?? 0}
            onChange={(value) => onFieldChange(dayKey, 'pause', value)}
            showQuickValues
          />

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">
              Ergibt{' '}
              <strong className="tabular text-foreground">
                {formatDuration(entry?.total ?? 0)}
              </strong>
            </span>
            {filled ? (
              <Button
                type="button"
                variant="ghost"
                size="touchWide"
                className="text-muted-foreground"
                onClick={() => onClear(dayKey)}
              >
                <Eraser className="h-4 w-4" />
                Tag leeren
              </Button>
            ) : null}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const DayCard = React.memo(DayCardImpl);
