'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ChronoTrackData, Employee, EntriesByEmployee } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { countEntries, mergeBackup, type RepairReport } from '@/lib/backup';

export type ImportMode = 'incoming-wins' | 'local-wins' | 'replace';

export interface PendingImport {
  payload: { employees: Employee[]; entries: EntriesByEmployee };
  exportedAt: string;
  repairs: RepairReport;
}

interface ImportPreviewDialogProps {
  pending: PendingImport | null;
  current: ChronoTrackData;
  onCancel(): void;
  onConfirm(mode: ImportMode): void;
}

export function ImportPreviewDialog({
  pending,
  current,
  onCancel,
  onConfirm,
}: ImportPreviewDialogProps) {
  const [mode, setMode] = React.useState<ImportMode>('incoming-wins');

  React.useEffect(() => {
    if (pending) setMode('incoming-wins');
  }, [pending]);

  // Trockenlauf mit **derselben** Funktion, die der Import danach ausführt.
  // Dadurch stimmt die angezeigte Vorschau garantiert mit dem Ergebnis überein.
  const preview = React.useMemo(() => {
    if (!pending || mode === 'replace') return null;
    return mergeBackup(current, pending.payload, mode).report;
  }, [pending, current, mode]);

  if (!pending) return null;

  const incomingEmployees = pending.payload.employees.length;
  const incomingEntries = countEntries(pending.payload.entries);
  const currentEntries = countEntries(current.entries);
  const repairNotes = describeRepairs(pending.repairs);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sicherung importieren</DialogTitle>
          <DialogDescription>
            Die Datei enthält {incomingEmployees}{' '}
            {incomingEmployees === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} und {incomingEntries}{' '}
            {incomingEntries === 1 ? 'erfassten Tag' : 'erfasste Tage'}
            {pending.exportedAt ? ` (erstellt am ${formatDate(pending.exportedAt)})` : ''}.
          </DialogDescription>
        </DialogHeader>

        {repairNotes.length > 0 ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
              Beim Einlesen korrigiert
            </p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {repairNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <RadioGroup value={mode} onValueChange={(value) => setMode(value as ImportMode)}>
          <Option
            value="incoming-wins"
            title="Zusammenführen"
            description="Bei gleichen Tagen werden die importierten Werte übernommen."
          />
          <Option
            value="local-wins"
            title="Nur fehlende Tage ergänzen"
            description="Vorhandene Einträge auf diesem Gerät bleiben unverändert."
          />
          <Option
            value="replace"
            title="Alles ersetzen"
            description={`Der bisherige Bestand (${current.employees.length} Mitarbeiter, ${currentEntries} Tage) wird gelöscht.`}
            destructive
          />
        </RadioGroup>

        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="mb-1 font-medium">Ergebnis</p>
          {mode === 'replace' ? (
            <p className="text-muted-foreground">
              Danach sind genau {incomingEmployees} Mitarbeiter und {incomingEntries} Tage
              vorhanden. Sie können den Import direkt danach rückgängig machen.
            </p>
          ) : (
            <ul className="space-y-0.5 text-muted-foreground">
              <li>
                {preview?.employeesAdded ?? 0} Mitarbeiter neu,{' '}
                {preview?.employeesMatched ?? 0} bereits vorhanden
              </li>
              <li>{preview?.entriesAdded ?? 0} Tage ergänzt</li>
              <li>
                {mode === 'incoming-wins'
                  ? `${preview?.entriesOverwritten ?? 0} Tage überschrieben`
                  : `${preview?.entriesSkipped ?? 0} Tage unverändert gelassen`}
              </li>
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="touchWide" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            size="touchWide"
            variant={mode === 'replace' ? 'destructive' : 'default'}
            onClick={() => onConfirm(mode)}
          >
            {mode === 'replace' ? 'Ersetzen' : 'Importieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Option({
  value,
  title,
  description,
  destructive,
}: {
  value: string;
  title: string;
  description: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <RadioGroupItem value={value} id={`import-${value}`} className="mt-0.5" />
      <div className="grid gap-0.5">
        <Label
          htmlFor={`import-${value}`}
          className={destructive ? 'font-medium text-destructive' : 'font-medium'}
        >
          {title}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function describeRepairs(repairs: RepairReport): string[] {
  const notes: string[] = [];
  if (repairs.orphanEmployeesCreated > 0) {
    notes.push(
      `${repairs.orphanEmployeesCreated} Datensätze ohne zugeordneten Mitarbeiter wurden gerettet`
    );
  }
  if (repairs.keysNormalized > 0) notes.push(`${repairs.keysNormalized} Datumsangaben vereinheitlicht`);
  if (repairs.totalsRecomputed > 0) notes.push(`${repairs.totalsRecomputed} Summen neu berechnet`);
  if (repairs.entriesDropped > 0) {
    notes.push(`${repairs.entriesDropped} Einträge ohne erkennbares Datum übersprungen`);
  }
  return notes;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
