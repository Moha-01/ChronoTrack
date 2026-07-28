'use client';

import * as React from 'react';
import { Archive, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ToastAction } from '@/components/ui/toast';
import { useChronoActions } from '@/components/providers/data-provider';
import { useChronoData } from '@/hooks/use-chrono-data';
import { useToast } from '@/hooks/use-toast';
import { readPreImportSnapshot, readV0Backup, snapshotBeforeImport, type V0Backup } from '@/lib/storage';
import { migrateV0toV1 } from '@/lib/migrate';
import { countEntries } from '@/lib/backup';
import { downloadTextFile } from '@/lib/file-transfer';

/**
 * Zugriff auf die beim Umstieg gesicherten Rohdaten der alten Version.
 *
 * Beim Wechsel auf das neue Format werden die Originaldaten unverändert
 * aufbewahrt. Ohne diese Karte wären sie nur über die Entwicklerkonsole
 * erreichbar — hier lassen sie sich herunterladen oder erneut einlesen.
 */
export function LegacyBackupCard() {
  const actions = useChronoActions();
  const current = useChronoData();
  const { toast } = useToast();
  const [backup, setBackup] = React.useState<V0Backup | null>(null);

  // Nur clientseitig lesbar, deshalb nach dem Mounten.
  React.useEffect(() => {
    setBackup(readV0Backup());
  }, [current]);

  if (!backup) return null;

  const preview = migrateV0toV1(backup.employees, backup.entries);
  const employeeCount = preview.data.employees.length;
  const entryCount = countEntries(preview.data.entries);

  const handleDownload = () => {
    const text = JSON.stringify(
      {
        format: 'chronotrack.legacy-raw',
        migratedAt: backup.migratedAt || null,
        'chronotrack-employees': backup.employees,
        'chronotrack-entries': backup.entries,
      },
      null,
      2
    );
    downloadTextFile(text, 'chronotrack-alte-daten-roh.json');
    toast({
      title: 'Alte Rohdaten heruntergeladen',
      description: 'Unveränderte Kopie aus der vorherigen Version.',
    });
  };

  const handleRestore = () => {
    snapshotBeforeImport(current);
    const { data } = migrateV0toV1(backup.employees, backup.entries);
    actions.replaceAll(data);
    toast({
      title: 'Alter Stand wiederhergestellt',
      description: `${employeeCount} Mitarbeiter, ${entryCount} erfasste Tage.`,
      duration: 12000,
      action: (
        <ToastAction
          altText="Wiederherstellung rückgängig machen"
          onClick={() => {
            const snapshot = readPreImportSnapshot();
            if (snapshot) actions.replaceAll(snapshot);
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-4 w-4 text-muted-foreground" aria-hidden />
          Daten der vorherigen Version
        </CardTitle>
        <CardDescription>
          Beim Umstieg auf das neue Format wurde eine unveränderte Kopie Ihrer alten Daten
          aufbewahrt
          {backup.migratedAt ? ` (${formatDate(backup.migratedAt)})` : ''}. Sie enthält{' '}
          {employeeCount} {employeeCount === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} und {entryCount}{' '}
          erfasste {entryCount === 1 ? 'Tag' : 'Tage'} und wird nicht automatisch gelöscht.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="touchWide" onClick={handleDownload}>
          <Download />
          Rohdaten herunterladen
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="touchWide">
              <RotateCcw />
              Alten Stand wiederherstellen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alten Stand wiederherstellen?</AlertDialogTitle>
              <AlertDialogDescription>
                Der aktuelle Bestand ({current.employees.length} Mitarbeiter,{' '}
                {countEntries(current.entries)} Tage) wird durch die alten Daten ersetzt (
                {employeeCount} Mitarbeiter, {entryCount} Tage). Sie können den Vorgang direkt
                danach rückgängig machen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>Wiederherstellen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : `übernommen am ${date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}`;
}
