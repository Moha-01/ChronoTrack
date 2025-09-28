import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { TimeEntry } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { format, getDaysInMonth, getYear, getMonth } from 'date-fns';
import { de } from 'date-fns/locale';

interface PrintableReportProps {
  employee: string;
  date: Date;
  entries: TimeEntry[];
  totalDuration: number;
}

export default function PrintableReport({ employee, date, entries, totalDuration }: PrintableReportProps) {
  const monthName = format(date, 'MMMM yyyy', { locale: de });
  const daysInMonth = getDaysInMonth(date);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const entriesByDay = new Map(entries.map(entry => [entry.day, entry]));

  return (
    <div className="p-4 print:p-0">
      <h2 className="text-xl font-bold mb-2 print:text-lg">Zeitnachweis für {employee}</h2>
      <h3 className="text-lg mb-4 print:text-base">{monthName}</h3>
      <Table className="print:text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] print:p-1">Datum</TableHead>
            <TableHead className="print:p-1">Objekt/Projekt</TableHead>
            <TableHead className="w-[70px] print:p-1">Beginn</TableHead>
            <TableHead className="w-[70px] print:p-1">Ende</TableHead>
            <TableHead className="w-[80px] print:p-1">Pause (min)</TableHead>
            <TableHead className="text-right w-[80px] print:p-1">Gesamt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthDays.map((day) => {
            const entry = entriesByDay.get(day);
            const dayDate = new Date(getYear(date), getMonth(date), day);
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            return (
              <TableRow key={day} className={isWeekend ? 'bg-gray-100' : ''}>
                <TableCell className="print:p-1">{format(dayDate, 'dd.', { locale: de })}</TableCell>
                <TableCell className="print:p-1">{entry?.project || ''}</TableCell>
                <TableCell className="print:p-1">{entry?.begin !== '00:00' ? entry?.begin : ''}</TableCell>
                <TableCell className="print:p-1">{entry?.end !== '00:00' ? entry?.end : ''}</TableCell>
                <TableCell className="print:p-1">{entry?.pause || ''}</TableCell>
                <TableCell className="text-right print:p-1">{entry ? formatDuration(entry.total) : ''}</TableCell>
              </TableRow>
            );
          })}
          {monthDays.length === 0 && (
             <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground print:p-1">
                Keine Einträge für diesen Monat.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="text-right font-bold print:p-1">Gesamtzeit des Monats</TableCell>
            <TableCell className="text-right font-bold print:p-1">{formatDuration(totalDuration)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
