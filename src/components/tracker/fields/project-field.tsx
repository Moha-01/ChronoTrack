'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProjectFieldProps {
  id: string;
  value: string;
  onChange(value: string): void;
  /** id einer <datalist> mit den bereits verwendeten Projektnamen. */
  suggestionsId?: string;
  hideLabel?: boolean;
  className?: string;
}

export function ProjectField({
  id,
  value,
  onChange,
  suggestionsId,
  hideLabel,
  className,
}: ProjectFieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn('text-xs font-medium text-muted-foreground', hideLabel && 'sr-only')}
      >
        Objekt/Projekt
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="z.B. Projekt Phönix"
        autoComplete="off"
        // Ein natives datalist erspart eine eigene Autocomplete-Mechanik und
        // arbeitet mit dem Datenbestand, der ohnehin da ist -- ohne neues Feld.
        list={suggestionsId}
        className="h-touch"
      />
    </div>
  );
}
