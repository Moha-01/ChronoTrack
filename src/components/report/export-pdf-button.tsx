'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Loader2 } from 'lucide-react';
import type { Employee, EmployeeEntries, MonthKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { flushSave } from '@/lib/storage';
import { monthKeyToDate } from '@/lib/date-keys';

interface ExportPdfButtonProps {
  employee: Employee;
  monthKey: MonthKey;
  entries: EmployeeEntries;
  totalMinutes: number;
}

export function ExportPdfButton({
  employee,
  monthKey,
  entries,
  totalMinutes,
}: ExportPdfButtonProps) {
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    // Die letzten Sekunden Tippen sollen im Bericht stehen.
    flushSave();

    try {
      const { generateReportPdf } = await import('./generate-pdf');
      const blob = await generateReportPdf({
        employeeName: employee.name,
        monthKey,
        entries,
        totalMinutes,
      });

      const monthDate = monthKeyToDate(monthKey);
      const filename = `Zeitnachweis_${slug(employee.name)}_${
        monthDate ? format(monthDate, 'yyyy-MM', { locale: de }) : monthKey
      }.pdf`;

      savePdf(blob, filename);
      toast({ title: 'Bericht erstellt', description: filename });
    } catch (error) {
      console.error('PDF konnte nicht erstellt werden', error);
      toast({
        variant: 'destructive',
        title: 'Bericht konnte nicht erstellt werden',
        description: 'Bitte versuchen Sie es erneut.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={busy} size="touchWide" className="w-full sm:w-auto">
      {busy ? <Loader2 className="animate-spin" /> : <FileText />}
      {busy ? 'Wird erstellt…' : 'Bericht als PDF'}
    </Button>
  );
}

/**
 * Speichert statt `window.open` mit einer Blob-URL.
 *
 * Das alte Vorgehen wurde von iOS-Safari als Popup blockiert, weil der Aufruf
 * aus einem asynchronen Fortsetzungspunkt kam. Ein Download-Anchor mit
 * Dateinamen funktioniert überall und liefert nebenbei einen sinnvollen Namen.
 */
function savePdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Kombinierende Akzente entfernen
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
