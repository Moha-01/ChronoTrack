import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { TimeEntry } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PrintableReportProps {
  employee: string;
  date: Date;
  entries: TimeEntry[];
  totalDuration: number;
}

export default function PrintableReport({ employee, date, entries, totalDuration }: PrintableReportProps) {
  const monthName = format(date, 'MMMM yyyy', { locale: de });

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Zeitnachweis für {employee}</h2>
      <h3 className="text-lg mb-4">{monthName}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Datum</TableHead>
            <TableHead>Objekt/Projekt</TableHead>
            <TableHead className="w-[80px]">Beginn</TableHead>
            <TableHead className="w-[80px]">Ende</TableHead>
            <TableHead className="w-[100px]">Pause (min)</TableHead>
            <TableHead className="text-right w-[100px]">Gesamt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{format(new Date(getYear(date), getMonth(date), entry.day), 'd. MMM yyyy', { locale: de })}</TableCell>
                <TableCell>{entry.project}</TableCell>
                <TableCell>{entry.begin}</TableCell>
                <TableCell>{entry.end}</TableCell>
                <TableCell>{entry.pause}</TableCell>
                <TableCell className="text-right">{formatDuration(entry.total)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Keine Einträge für diesen Monat.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="text-right font-bold">Gesamtzeit des Monats</TableCell>
            <TableCell className="text-right font-bold">{formatDuration(totalDuration)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function getYear(date: Date) {
  return date.getFullYear();
}

function getMonth(date: Date) {
    return date.getMonth();
}
