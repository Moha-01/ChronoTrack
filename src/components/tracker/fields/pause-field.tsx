'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, clamp } from '@/lib/utils';

const QUICK_VALUES = [0, 30, 45, 60];
const MAX_PAUSE = 1440;

interface PauseFieldProps {
  id: string;
  value: number;
  onChange(value: number): void;
  /** Schnellauswahl unter dem Feld — nur in der Kartenansicht sinnvoll. */
  showQuickValues?: boolean;
  hideLabel?: boolean;
  className?: string;
}

/**
 * Pauseneingabe in Minuten.
 *
 * Vorher: `parseInt(e.target.value) || 0`. Das Leeren des Feldes sprang sofort
 * auf 0 zurück, sodass man von einem leeren Feld aus keine mehrstellige Zahl
 * tippen konnte. Hier hält die Komponente den Rohtext lokal und erlaubt den
 * leeren Zwischenzustand.
 */
export function PauseField({
  id,
  value,
  onChange,
  showQuickValues,
  hideLabel,
  className,
}: PauseFieldProps) {
  const [draft, setDraft] = React.useState<string | null>(null);

  // Externe Änderungen (z.B. Schnellauswahl, Undo) beenden den Tippvorgang.
  React.useEffect(() => {
    setDraft(null);
  }, [value]);

  const display = draft ?? (value === 0 ? '' : String(value));

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setDraft(digits);
    if (digits === '') {
      onChange(0);
      return;
    }
    onChange(clamp(Number(digits), 0, MAX_PAUSE));
  };

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn('text-xs font-medium text-muted-foreground', hideLabel && 'sr-only')}
      >
        Pause (min)
      </label>
      <Input
        id={id}
        // Kein type="number": das erlaubt Wischen am Zahlenfeld, blockiert aber
        // saubere Zwischenzustände. inputMode gibt trotzdem die Zifferntastatur.
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="0"
        value={display}
        onChange={(event) => commit(event.target.value)}
        onBlur={() => setDraft(null)}
        className="h-touch tabular"
      />
      {showQuickValues ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {QUICK_VALUES.map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant={value === minutes ? 'default' : 'outline'}
              size="touchWide"
              className="px-4 tabular"
              aria-pressed={value === minutes}
              onClick={() => {
                setDraft(null);
                onChange(minutes);
              }}
            >
              {minutes === 0 ? 'keine' : `${minutes} min`}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
