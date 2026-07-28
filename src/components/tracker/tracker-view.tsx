'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { DayKey } from '@/lib/types';
import { AppShell } from '@/components/layout/app-shell';
import { ScrollToTop } from '@/components/layout/scroll-to-top';
import { MonthPicker } from './month-picker';
import { MonthSummary } from './month-summary';
import { DayTable } from './day-table';
import { DayCardList } from './day-card-list';
import { TrackerSkeleton } from './tracker-skeleton';
import { ExportPdfButton } from '@/components/report/export-pdf-button';
import {
  useDataStatus,
  useEmployee,
  useEmployeeEntries,
  useMonthSummary,
} from '@/hooks/use-chrono-data';
import { useChronoActions } from '@/components/providers/data-provider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import {
  currentMonthKey,
  daysInMonth,
  isMonthKey,
  monthKeyToDate,
} from '@/lib/date-keys';

const SUGGESTIONS_ID = 'project-suggestions';

/**
 * Die einzige Komponente, die `useSearchParams()` liest.
 *
 * Unter `output: 'export'` sind dynamische Routen-Segmente nicht möglich —
 * Mitarbeiter-IDs entstehen erst zur Laufzeit im Browser und lassen sich nicht
 * vorrendern. Deshalb steckt die Identität im Query-String, und die Route
 * selbst bleibt statisch. Das Elternteil muss diese Komponente in <Suspense>
 * wrappen, sonst bricht der Export-Build.
 */
export function TrackerView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useDataStatus();
  const actions = useChronoActions();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const employeeId = searchParams.get('e');
  const monthParam = searchParams.get('m');
  const monthKey = monthParam && isMonthKey(monthParam) ? monthParam : currentMonthKey();

  const employee = useEmployee(employeeId);
  const entries = useEmployeeEntries(employeeId);
  const summary = useMonthSummary(employeeId, monthKey);

  // Unbekannte oder fehlende ID: zurück zur Liste, statt eine leere Seite zu zeigen.
  React.useEffect(() => {
    if (status !== 'ready') return;
    if (!employeeId || !employee) {
      router.replace('/');
      toast({
        variant: 'destructive',
        title: 'Mitarbeiter nicht gefunden',
        description: 'Der Eintrag existiert nicht mehr.',
      });
    }
  }, [status, employeeId, employee, router, toast]);

  const setMonth = React.useCallback(
    (next: string) => {
      // replace statt push: sonst braucht man zwölf Zurück-Schritte, um den
      // Tracker wieder zu verlassen.
      router.replace(`/tracker?e=${encodeURIComponent(employeeId ?? '')}&m=${next}`, {
        scroll: false,
      });
    },
    [router, employeeId]
  );

  const handleFieldChange = React.useCallback(
    (
      dayKey: DayKey,
      field: 'project' | 'begin' | 'end' | 'pause',
      value: string | number | null
    ) => {
      if (!employeeId) return;
      actions.setEntryField(employeeId, dayKey, field, value);
    },
    [actions, employeeId]
  );

  const handleClear = React.useCallback(
    (dayKey: DayKey) => {
      if (!employeeId) return;
      const removed = actions.clearDay(employeeId, dayKey);
      if (!removed) return;

      toast({
        title: 'Tag geleert',
        description: format(new Date(removed.id), 'EEEE, d. MMMM yyyy', { locale: de }),
        duration: 8000,
        action: (
          <ToastAction
            altText="Leeren rückgängig machen"
            onClick={() => actions.restoreDay(employeeId, dayKey, removed)}
          >
            Rückgängig
          </ToastAction>
        ),
      });
    },
    [actions, employeeId, toast]
  );

  // Bereits verwendete Projektnamen als native Vorschlagsliste — ohne neues
  // Datenfeld, allein aus dem vorhandenen Bestand.
  const projectSuggestions = React.useMemo(() => {
    const names = new Set<string>();
    for (const entry of Object.values(entries)) {
      const name = entry.project.trim();
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'de'));
  }, [entries]);

  const monthLabel = React.useMemo(() => {
    const date = monthKeyToDate(monthKey);
    return date ? format(date, 'MMMM yyyy', { locale: de }) : monthKey;
  }, [monthKey]);

  const body =
    // `isMobile === undefined` bedeutet: die Breite ist noch nicht gemessen.
    // Der Skeleton, den wir für den Speicherzugriff ohnehin brauchen, dient
    // hier zugleich als Messfenster. So ist immer nur EINE der beiden
    // Darstellungen im DOM -- vorher waren es beide, mit ~248 Eingabefeldern.
    status !== 'ready' || isMobile === undefined ? (
      <TrackerSkeleton />
    ) : (
      <div className="space-y-5">
        <MonthPicker monthKey={monthKey} onChange={setMonth} />
        <MonthSummary summary={summary} daysInMonth={daysInMonth(monthKey)} />

        <datalist id={SUGGESTIONS_ID}>
          {projectSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {isMobile ? (
          <DayCardList
            key={monthKey}
            monthKey={monthKey}
            entries={entries}
            suggestionsId={SUGGESTIONS_ID}
            onFieldChange={handleFieldChange}
            onClear={handleClear}
          />
        ) : (
          <DayTable
            monthKey={monthKey}
            entries={entries}
            totalMinutes={summary.totalMinutes}
            suggestionsId={SUGGESTIONS_ID}
            onFieldChange={handleFieldChange}
            onClear={handleClear}
          />
        )}
      </div>
    );

  return (
    <AppShell backHref="/" subtitle={employee?.name}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {employee?.name ?? 'Zeitnachweis'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Monatsnachweis {monthLabel}</p>
        </div>
        {employee ? (
          <ExportPdfButton
            employee={employee}
            monthKey={monthKey}
            entries={entries}
            totalMinutes={summary.totalMinutes}
          />
        ) : null}
      </div>

      {body}
      <ScrollToTop />
    </AppShell>
  );
}
