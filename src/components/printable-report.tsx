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
    <div className="bg-white px-8">
      <div className="text-center py-4">
        <h2 className="text-lg font-bold mb-1">Zeitnachweis für {employee}</h2>
        <h3 className="text-base">{monthName}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] p-1 text-[10px]">Datum</TableHead>
            <TableHead className="p-1 text-[10px]">Objekt/Projekt</TableHead>
            <TableHead className="w-[70px] p-1 text-[10px]">Beginn</TableHead>
            <TableHead className="w-[70px] p-1 text-[10px]">Ende</TableHead>
            <TableHead className="w-[70px] p-1 text-[10px]">Pause</TableHead>
            <TableHead className="text-right w-[80px] p-1 text-[10px]">Gesamt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthDays.map((day) => {
            const entry = entriesByDay.get(day);
            const dayDate = new Date(getYear(date), getMonth(date), day);
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            return (
              <TableRow key={day} className={`${isWeekend ? 'bg-gray-100' : ''} text-[10px]`}>
                <TableCell className="p-1">{format(dayDate, 'dd.MM.', { locale: de })}</TableCell>
                <TableCell className="p-1">{entry?.project || ''}</TableCell>
                <TableCell className="p-1">{entry?.begin !== '00:00' ? entry?.begin : ''}</TableCell>
                <TableCell className="p-1">{entry?.end !== '00:00' ? entry?.end : ''}</TableCell>
                <TableCell className="p-1">{entry?.pause || ''}</TableCell>
                <TableCell className="text-right p-1">{entry ? formatDuration(entry.total) : ''}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="text-xs">
            <TableCell colSpan={5} className="text-right font-bold p-1">Gesamtzeit des Monats</TableCell>
            <TableCell className="text-right font-bold p-1">{formatDuration(totalDuration)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
