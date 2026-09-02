'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
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
import { countEntries } from '@/lib/backup';
import { emptyData, readPreImportSnapshot, snapshotBeforeImport } from '@/lib/storage';

export function DangerZone() {
  const actions = useChronoActions();
  const data = useChronoData();
  const { toast } = useToast();

  const employeeCount = data.employees.length;
  const entryCount = countEntries(data.entries);
  const isEmpty = employeeCount === 0 && entryCount === 0;

  const handleClear = () => {
    snapshotBeforeImport(data);
    actions.replaceAll(emptyData());
    toast({
      title: 'Alle Daten gelöscht',
      duration: 12000,
      action: (
        <ToastAction
          altText="Löschen rückgängig machen"
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
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Alle Daten löschen</CardTitle>
        <CardDescription>
          Entfernt alle Mitarbeiter und alle erfassten Zeiten aus diesem Browser. Erstellen Sie
          vorher eine Sicherung.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="touchWide" disabled={isEmpty} className="w-full sm:w-auto">
              <Trash2 />
              Alle Daten löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wirklich alle Daten löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                {employeeCount} {employeeCount === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} und{' '}
                {entryCount} erfasste {entryCount === 1 ? 'Tag' : 'Tage'} werden entfernt. Sie
                können den Vorgang direkt danach rückgängig machen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
