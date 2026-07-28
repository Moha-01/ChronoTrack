'use client';

import * as React from 'react';
import type {
  ChronoTrackData,
  DayKey,
  Employee,
  EmployeeEntries,
  EmployeeId,
  MonthKey,
  TimeEntry,
} from '@/lib/types';
import { useDataState } from '@/components/providers/data-provider';
import { hasContent } from '@/lib/entries';

const EMPTY_ENTRIES: EmployeeEntries = Object.freeze({});

export function useDataStatus(): 'loading' | 'ready' {
  return useDataState().status;
}

export function useIsReadOnly(): boolean {
  return useDataState().readOnly;
}

export function useEmployees(): Employee[] {
  return useDataState().data.employees;
}

export function useEmployee(id: EmployeeId | null | undefined): Employee | undefined {
  const employees = useEmployees();
  return React.useMemo(
    () => (id ? employees.find((employee) => employee.id === id) : undefined),
    [employees, id]
  );
}

export function useEmployeeEntries(id: EmployeeId | null | undefined): EmployeeEntries {
  const { data } = useDataState();
  return (id ? data.entries[id] : undefined) ?? EMPTY_ENTRIES;
}

/**
 * Alle Einträge eines Monats, aufsteigend nach Tag.
 *
 * Die Monatsfilterung ist ein Präfixvergleich auf dem Tagesschlüssel — genau
 * dafür sind die Schlüssel seit v1 zweistellig gepolstert.
 */
export function useMonthEntries(
  employeeId: EmployeeId | null | undefined,
  monthKey: MonthKey
): TimeEntry[] {
  const entries = useEmployeeEntries(employeeId);
  return React.useMemo(
    () =>
      Object.keys(entries)
        .filter((key) => key.startsWith(monthKey))
        .sort()
        .map((key) => entries[key]),
    [entries, monthKey]
  );
}

/** Einträge des Monats, die tatsächlich etwas enthalten (für Bericht und Statistik). */
export function useFilledMonthEntries(
  employeeId: EmployeeId | null | undefined,
  monthKey: MonthKey
): TimeEntry[] {
  const monthEntries = useMonthEntries(employeeId, monthKey);
  return React.useMemo(() => monthEntries.filter(hasContent), [monthEntries]);
}

export interface MonthSummary {
  totalMinutes: number;
  /** Tage mit Inhalt — nicht nur Tage mit total > 0 */
  filledDays: number;
  averageMinutes: number;
}

export function useMonthSummary(
  employeeId: EmployeeId | null | undefined,
  monthKey: MonthKey
): MonthSummary {
  const filled = useFilledMonthEntries(employeeId, monthKey);
  return React.useMemo(() => {
    const totalMinutes = filled.reduce((acc, entry) => acc + entry.total, 0);
    const workedDays = filled.filter((entry) => entry.total > 0).length;
    return {
      totalMinutes,
      filledDays: filled.length,
      averageMinutes: workedDays > 0 ? Math.round(totalMinutes / workedDays) : 0,
    };
  }, [filled]);
}

/** Gesamtminuten eines Mitarbeiters über alle Monate (für die Übersichtsliste). */
export function useEmployeeTotal(id: EmployeeId): number {
  const entries = useEmployeeEntries(id);
  return React.useMemo(
    () => Object.values(entries).reduce((acc, entry) => acc + entry.total, 0),
    [entries]
  );
}

export function useEntry(
  employeeId: EmployeeId | null | undefined,
  dayKey: DayKey
): TimeEntry | undefined {
  return useEmployeeEntries(employeeId)[dayKey];
}

/** Vollständiger Bestand — nur für Export und Statistiken auf der Datenseite. */
export function useChronoData(): ChronoTrackData {
  return useDataState().data;
}
