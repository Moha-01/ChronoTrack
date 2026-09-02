'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChronoActions } from '@/components/providers/data-provider';
import { useChronoData } from '@/hooks/use-chrono-data';
import { backupFilename, countEntries, createBackup, serializeBackup } from '@/lib/backup';
import { downloadTextFile } from '@/lib/file-transfer';
import { useToast } from '@/hooks/use-toast';

export function ExportCard() {
  const actions = useChronoActions();
  const data = useChronoData();
  const { toast } = useToast();

  const employeeCount = data.employees.length;
  const entryCount = countEntries(data.entries);
  const isEmpty = employeeCount === 0 && entryCount === 0;

  const handleExport = () => {
    // Alles synchron im Klick-Handler: iOS blockiert Download und Teilen-Menü,
    // wenn sie aus einem await-Fortsetzungspunkt heraus ausgelöst werden.
    const snapshot = actions.snapshot();
    const text = serializeBackup(createBackup(snapshot));
    const filename = backupFilename();

    downloadTextFile(text, filename);
    toast({
      title: 'Sicherung erstellt',
      description: `${filename} · ${snapshot.employees.length} Mitarbeiter, ${countEntries(
        snapshot.entries
      )} Einträge`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daten sichern</CardTitle>
        <CardDescription>
          Speichert alle Mitarbeiter und alle Monate als JSON-Datei. Nutzen Sie das für
          Sicherungen und für den Wechsel auf ein anderes Gerät.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted-foreground">Mitarbeiter</dt>
            <dd className="text-lg font-semibold tabular">{employeeCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Erfasste Tage</dt>
            <dd className="text-lg font-semibold tabular">{entryCount}</dd>
          </div>
        </dl>
        <Button onClick={handleExport} disabled={isEmpty} size="touchWide" className="w-full sm:w-auto">
          <Download />
          Sicherung herunterladen
        </Button>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            Es sind noch keine Daten vorhanden, die gesichert werden könnten.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
