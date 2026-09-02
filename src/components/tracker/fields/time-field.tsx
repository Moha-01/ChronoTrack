'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TimeOfDay } from '@/lib/types';

interface TimeFieldProps {
  id: string;
  label: string;
  value: TimeOfDay | null;
  onChange(value: TimeOfDay | null): void;
  className?: string;
  /** Sichtbares Label ausblenden (Tabellenansicht hat Spaltenköpfe). */
  hideLabel?: boolean;
}

/**
 * Zeiteingabe, die „nicht erfasst" von „Mitternacht" unterscheidet.
 *
 * Ein leeres `<input type="time">` liefert '' — das wird zu `null`, nicht zum
 * früheren Sentinel '00:00'.
 */
export function TimeField({
  id,
  label,
  value,
  onChange,
  className,
  hideLabel,
}: TimeFieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-xs font-medium text-muted-foreground',
          hideLabel && 'sr-only'
        )}
      >
        {label}
      </label>
      <Input
        id={id}
        type="time"
        // '' statt null: ein kontrolliertes Input darf nicht null bekommen.
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        // h-touch = 44px; text-base auf Mobil verhindert den iOS-Zoom beim Fokus.
        className="h-touch tabular"
      />
    </div>
  );
}
