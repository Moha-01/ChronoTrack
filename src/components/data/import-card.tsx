'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToastAction } from '@/components/ui/toast';
import { useChronoActions } from '@/components/providers/data-provider';
import { useChronoData } from '@/hooks/use-chrono-data';
import { useToast } from '@/hooks/use-toast';
import { readTextFile } from '@/lib/file-transfer';
import { countEntries, mergeBackup, parseBackup, replaceWithBackup } from '@/lib/backup';
import { readPreImportSnapshot, snapshotBeforeImport } from '@/lib/storage';
import {
  ImportPreviewDialog,
  type ImportMode,
  type PendingImport,
} from './import-preview-dialog';

export function ImportCard() {
  const actions = useChronoActions();
  const current = useChronoData();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<PendingImport | null>(null);
  const [error, setError] = React.useState<{ message: string; issues?: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    const read = await readTextFile(file);
    if (!read.ok) {
      setError({ message: read.error });
      return;
    }

    const parsed = parseBackup(read.text);
    if (!parsed.ok) {
      setError({ message: parsed.error, issues: parsed.issues });
      return;
    }

    setPending({
      payload: parsed.payload,
      exportedAt: parsed.exportedAt,
      repairs: parsed.repairs,
    });
  };

  const handleConfirm = (mode: ImportMode) => {
    if (!pending) return;

    // Sicherung des Ist-Zustands, damit "Rückgängig" auch nach dem Ersetzen geht.
    snapshotBeforeImport(current);

    if (mode === 'replace') {
      const next = replaceWithBackup(pending.payload);
      actions.replaceAll(next);
      setPending(null);
      toastWithUndo(
        'Daten ersetzt',
        `${next.employees.length} Mitarbeiter, ${countEntries(next.entries)} Tage übernommen.`
      );
      return;
    }

    const { data, report } = mergeBackup(current, pending.payload, mode);
    actions.replaceAll(data);
    setPending(null);
    toastWithUndo(
      'Sicherung importiert',
      [
        `${report.employeesAdded} Mitarbeiter neu`,
        `${report.entriesAdded} Tage ergänzt`,
        mode === 'incoming-wins'
          ? `${report.entriesOverwritten} überschrieben`
          : `${report.entriesSkipped} unverändert`,
      ].join(' · ')
    );
  };

  const toastWithUndo = (title: string, description: string) => {
    toast({
      title,
      description,
      duration: 12000,
      action: (
        <ToastAction
          altText="Import rückgängig machen"
          onClick={() => {
            const snapshot = readPreImportSnapshot();
            if (!snapshot) return;
            actions.replaceAll(snapshot);
            toast({ title: 'Import rückgängig gemacht' });
          }}
        >
          Rückgängig
        </ToastAction>
      ),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sicherung einlesen</CardTitle>
        <CardDescription>
          Vor dem Übernehmen sehen Sie genau, was sich ändert. Der bisherige Stand lässt sich
          direkt danach wiederherstellen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Zurücksetzen, sonst löst dieselbe Datei beim zweiten Mal kein
            // change-Ereignis aus.
            event.target.value = '';
            if (file) void handleFile(file);
          }}
        />
        <Button
          // Der Klick muss von einem echten Button kommen -- iOS öffnet den
          // Dateiauswahldialog sonst nicht.
          onClick={() => inputRef.current?.click()}
          variant="outline"
          size="touchWide"
          className="w-full sm:w-auto"
        >
          <Upload />
          Datei auswählen
        </Button>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <p className="font-medium text-destructive">{error.message}</p>
            {error.issues && error.issues.length > 0 ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-muted-foreground">Details</summary>
                <ul className="mt-1 list-inside list-disc font-mono text-xs text-muted-foreground">
                  {error.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <ImportPreviewDialog
        pending={pending}
        current={current}
        onCancel={() => setPending(null)}
        onConfirm={handleConfirm}
      />
    </Card>
  );
}
