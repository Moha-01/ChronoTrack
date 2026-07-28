'use client';

import type { Employee } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChronoActions } from '@/components/providers/data-provider';
import { useEmployeeEntries } from '@/hooks/use-chrono-data';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface DeleteEmployeeDialogProps {
  employee: Employee | null;
  onClose(): void;
}

/**
 * Bewusst **eine** Instanz auf Listenebene, gesteuert über `employee`.
 * Vorher wurde pro Zeile ein vollständiger Dialog gerendert, und der
 * Auswahl-State blieb beim Schließen per Esc oder Overlay-Klick stehen.
 */
export function DeleteEmployeeDialog({ employee, onClose }: DeleteEmployeeDialogProps) {
  const actions = useChronoActions();
  const { toast } = useToast();
  const entries = useEmployeeEntries(employee?.id);
  const entryCount = Object.keys(entries).length;

  const handleDelete = () => {
    if (!employee) return;
    const snapshot = actions.deleteEmployee(employee.id);
    onClose();
    if (!snapshot) return;

    toast({
      title: 'Mitarbeiter gelöscht',
      description: `„${snapshot.employee.name}" wurde entfernt.`,
      duration: 8000,
      action: (
        <ToastAction altText="Löschen rückgängig machen" onClick={() => actions.restoreEmployee(snapshot)}>
          Rückgängig
        </ToastAction>
      ),
    });
  };

  return (
    <AlertDialog open={employee !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>„{employee?.name}" löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {entryCount > 0
              ? `Dabei werden auch ${entryCount} erfasste ${
                  entryCount === 1 ? 'Tag' : 'Tage'
                } entfernt. Sie können den Vorgang direkt danach rückgängig machen.`
              : 'Für diesen Mitarbeiter sind noch keine Zeiten erfasst.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
