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
    <div className="prn"> {/* <-- SCOPED ROOT */}
      <style>
        {`
          /* nur das hier ist global – notwendig für korrekte Seitengröße */
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
          }

          /* Ab hier alles scoped unter .prn --> beeinflusst nichts außerhalb */
          .prn { display: block; width: 190mm; margin: 0 auto; background: #fff; }
          .prn .hdr { text-align: center; padding: 8mm 0 5mm; }
          .prn .hdr h2 { margin: 0 0 2mm 0; font-weight: 700; font-size: 12pt; }
          .prn .hdr h3 { margin: 0; font-size: 10pt; font-weight: 600; }

          .prn table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; line-height: 1.2; border: 0.4mm solid #000; }
          .prn thead th, .prn tfoot td { font-weight: 700; background: #fafafa; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .prn th, .prn td { border: 0.4mm solid #000; padding: 1mm 2mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; height: 7mm; vertical-align: middle; }
          .prn .c-date  { width: 20mm; }
          .prn .c-proj  { width: 70mm; }
          .prn .c-beg   { width: 20mm; text-align: center; }
          .prn .c-end   { width: 20mm; text-align: center; }
          .prn .c-break { width: 22mm; text-align: center; }
          .prn .c-total { width: 22mm; text-align: right; }
          .prn .wknd td { background: #eee; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .prn tr, .prn th, .prn td { page-break-inside: avoid; }
        `}
      </style>

      <div className="hdr">
        <h2>Zeiterfassung für {employee}</h2>
        <h3>{monthName}</h3>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="c-date">Datum</TableHead>
            <TableHead className="c-proj">Objekt/Projekt</TableHead>
            <TableHead className="c-beg">Beginn</TableHead>
            <TableHead className="c-end">Ende</TableHead>
            <TableHead className="c-break">Pause (min)</TableHead>
            <TableHead className="c-total">Gesamt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthDays.map((day) => {
            const entry = entriesByDay.get(day);
            const dayDate = new Date(getYear(date), getMonth(date), day);
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            const begin = entry?.begin && entry.begin !== '00:00' ? entry.begin : '';
            const end   = entry?.end && entry.end !== '00:00' ? entry.end : '';
            return (
              <TableRow key={day} className={isWeekend ? 'wknd' : ''}>
                <TableCell className="c-date">{format(dayDate, 'dd.MM.', { locale: de })}</TableCell>
                <TableCell className="c-proj">{entry?.project || ''}</TableCell>
                <TableCell className="c-beg">{begin}</TableCell>
                <TableCell className="c-end">{end}</TableCell>
                <TableCell className="c-break">{entry?.pause || ''}</TableCell>
                <TableCell className="c-total">{entry ? formatDuration(entry.total) : ''}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>
              Gesamtzeit des Monats
            </TableCell>
            <TableCell className="c-total" style={{ fontWeight: 700 }}>
              {formatDuration(totalDuration)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
