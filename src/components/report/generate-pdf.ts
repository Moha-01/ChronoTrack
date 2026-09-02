import type { EmployeeEntries, MonthKey } from '@/lib/types';

export interface GeneratePdfOptions {
  employeeName: string;
  monthKey: MonthKey;
  entries: EmployeeEntries;
  totalMinutes: number;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Erzeugt das PDF aus einer offscreen gerenderten Kopie des Berichts.
 *
 * jspdf und html2canvas sind zusammen rund 600 kB und werden deshalb erst hier
 * geladen — nicht im Haupt-Bundle für einen Knopf, den man einmal im Monat drückt.
 */
export async function generateReportPdf(options: GeneratePdfOptions): Promise<Blob> {
  const [{ default: jsPDF }, { default: html2canvas }, { createRoot }, React, { PrintableReport }] =
    await Promise.all([
      import('jspdf'),
      import('html2canvas'),
      import('react-dom/client'),
      import('react'),
      import('./printable-report'),
    ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.padding = '8mm 0 8mm 0';
  container.style.boxSizing = 'border-box';
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      React.createElement(PrintableReport, {
        employeeName: options.employeeName,
        monthKey: options.monthKey,
        entries: options.entries,
        totalMinutes: options.totalMinutes,
      })
    );

    await waitForRender();

    const canvas = await html2canvas(container, {
      scale: 3, // 300 DPI für gestochen scharfe Schrift ohne Artefakte
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // PNG ist für Textdokumente und Tabellen verlustfrei und erzeugt
    // im Gegensatz zu JPEG keinerlei Kantenunschärfe oder Artefakte um Buchstaben.
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const imageData = canvas.toDataURL('image/png');

    const renderedHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

    if (renderedHeightMm <= A4_HEIGHT_MM) {
      pdf.addImage(imageData, 'PNG', 0, 0, A4_WIDTH_MM, renderedHeightMm, 'report', 'FAST');
    } else {
      let offsetMm = 0;
      let page = 0;
      while (offsetMm < renderedHeightMm) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, -offsetMm, A4_WIDTH_MM, renderedHeightMm, 'report', 'FAST');
        offsetMm += A4_HEIGHT_MM;
        page += 1;
      }
    }

    return pdf.output('blob');
  } finally {
    root.unmount();
    container.remove();
  }
}

/**
 * Wartet auf fertige Schriften und zwei Frames.
 *
 * Vorher stand hier ein festes `setTimeout(..., 500)` — zu lang auf schnellen
 * Geräten und zu kurz, wenn die Schrift noch lud.
 */
async function waitForRender(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    /* ältere Browser ohne Font Loading API */
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
