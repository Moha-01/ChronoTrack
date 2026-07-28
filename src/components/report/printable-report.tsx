import type { EmployeeEntries, MonthKey } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { dayKeysOfMonth, dayKeyToDate, isWeekendKey, monthKeyToDate } from '@/lib/date-keys';
import { formatDuration } from '@/lib/utils';

interface PrintableReportProps {
  employeeName: string;
  monthKey: MonthKey;
  entries: EmployeeEntries;
  totalMinutes: number;
}

/**
 * A4-Layout für den Monatsnachweis.
 *
 * Wird ausschließlich offscreen für die PDF-Aufnahme gerendert — nicht mehr
 * zusätzlich ins Live-Dokument. Die frühere Doppel-Einbindung hat bei jedem
 * Seitenaufruf eine globale @page-Regel injiziert und bei jedem Tastendruck
 * eine 31-Zeilen-Tabelle neu gerendert.
 *
 * Alle Farben sind hart gesetzt: die Komponente erbt sonst `text-foreground`
 * und wäre im Dark Mode nahezu weiß auf weiß.
 */
export function PrintableReport({
  employeeName,
  monthKey,
  entries,
  totalMinutes,
}: PrintableReportProps) {
  const monthDate = monthKeyToDate(monthKey);
  const monthLabel = monthDate ? format(monthDate, 'MMMM yyyy', { locale: de }) : monthKey;
  const dayKeys = dayKeysOfMonth(monthKey);

  return (
    <div className="prn">
      <style>{`
        .prn { display: block; width: 190mm; margin: 0 auto; background: #fff; color: #000;
               font-family: Arial, Helvetica, sans-serif; }
        .prn * { color: #000; box-sizing: border-box; }
        .prn .hdr { text-align: center; padding: 6mm 0 4mm; }
        .prn .hdr h2 { margin: 0 0 2mm 0; font-weight: 700; font-size: 12pt; }
        .prn .hdr h3 { margin: 0; font-size: 10pt; font-weight: 600; }
        .prn table { width: 100%; border-collapse: collapse; table-layout: fixed;
                     font-size: 9pt; line-height: 1.2; border: 0.4mm solid #000; }
        .prn th, .prn td { border: 0.4mm solid #000; padding: 1mm 2mm; overflow: hidden;
                           white-space: nowrap; text-overflow: ellipsis; height: 7mm;
                           vertical-align: middle; }
        .prn thead th, .prn tfoot td { font-weight: 700; background: #f2f2f2;
                                       -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .prn .c-date  { width: 20mm; }
        .prn .c-proj  { width: 70mm; }
        .prn .c-beg   { width: 20mm; text-align: center; }
        .prn .c-end   { width: 20mm; text-align: center; }
        .prn .c-break { width: 22mm; text-align: center; }
        .prn .c-total { width: 22mm; text-align: right; }
        .prn .wknd td { background: #ebebeb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .prn tr, .prn th, .prn td { page-break-inside: avoid; }
        .prn .sign { margin-top: 8mm; display: flex; justify-content: space-between; font-size: 9pt; }
        .prn .sign div { width: 70mm; border-top: 0.3mm solid #000; padding-top: 1.5mm; text-align: center; }
      `}</style>

      <div className="hdr">
        <h2>Zeiterfassung für {employeeName}</h2>
        <h3>{monthLabel}</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th className="c-date">Datum</th>
            <th className="c-proj">Objekt/Projekt</th>
            <th className="c-beg">Beginn</th>
            <th className="c-end">Ende</th>
            <th className="c-break">Pause (min)</th>
            <th className="c-total">Gesamt</th>
          </tr>
        </thead>
        <tbody>
          {dayKeys.map((dayKey) => {
            const entry = entries[dayKey];
            const date = dayKeyToDate(dayKey)!;
            return (
              <tr key={dayKey} className={isWeekendKey(dayKey) ? 'wknd' : undefined}>
                <td className="c-date">{format(date, 'dd.MM.', { locale: de })}</td>
                <td className="c-proj">{entry?.project ?? ''}</td>
                {/* Kein '00:00'-Sonderfall mehr nötig: leer ist jetzt null. */}
                <td className="c-beg">{entry?.begin ?? ''}</td>
                <td className="c-end">{entry?.end ?? ''}</td>
                <td className="c-break">{entry?.pause ? entry.pause : ''}</td>
                <td className="c-total">
                  {entry && entry.total > 0 ? formatDuration(entry.total) : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ textAlign: 'right' }}>
              Gesamtzeit des Monats
            </td>
            <td className="c-total">{formatDuration(totalMinutes)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="sign">
        <div>Datum, Unterschrift Mitarbeiter</div>
        <div>Datum, Unterschrift Vorgesetzter</div>
      </div>
    </div>
  );
}

export default PrintableReport;
