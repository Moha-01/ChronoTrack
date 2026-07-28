'use client';

import * as React from 'react';
import type {
  ChronoTrackData,
  DayKey,
  Employee,
  EmployeeEntries,
  EmployeeId,
  TimeEntry,
} from '@/lib/types';
import { SCHEMA_VERSION } from '@/lib/types';
import {
  emptyData,
  flushSave,
  isQuotaError,
  loadData,
  onSaveError,
  registerFlushTriggers,
  scheduleSave,
  subscribeCrossTab,
} from '@/lib/storage';
import type { MigrationReport } from '@/lib/migrate';
import { createId } from '@/lib/id';
import { emptyEntry, withRecomputedTotal } from '@/lib/entries';
import { createDemoEmployee } from '@/lib/demo';
import { useToast } from '@/hooks/use-toast';

export type DataStatus = 'loading' | 'ready';

export interface DataState {
  status: DataStatus;
  data: ChronoTrackData;
  /** Nach einem Lesefehler gesperrt, damit ein defekter Speicher nicht
   *  versehentlich mit einem leeren Bestand überschrieben wird. */
  readOnly: boolean;
  loadError: string | null;
}

type Action =
  | { type: 'HYDRATE'; data: ChronoTrackData; readOnly?: boolean; loadError?: string | null }
  | { type: 'ADD_EMPLOYEE'; employee: Employee }
  | { type: 'RENAME_EMPLOYEE'; id: EmployeeId; name: string }
  | { type: 'DELETE_EMPLOYEE'; id: EmployeeId }
  | { type: 'RESTORE_EMPLOYEE'; employee: Employee; entries: EmployeeEntries; index: number }
  | { type: 'SEED_DEMO'; employee: Employee; entries: EmployeeEntries }
  | {
      type: 'SET_ENTRY_FIELD';
      employeeId: EmployeeId;
      dayKey: DayKey;
      field: 'project' | 'begin' | 'end' | 'pause';
      value: string | number | null;
    }
  | { type: 'CLEAR_DAY'; employeeId: EmployeeId; dayKey: DayKey }
  | { type: 'RESTORE_DAY'; employeeId: EmployeeId; dayKey: DayKey; entry: TimeEntry }
  | { type: 'REPLACE_ALL'; data: ChronoTrackData }
  | { type: 'UNLOCK' };

function touch(data: ChronoTrackData): ChronoTrackData {
  return { ...data, schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() };
}

function reducer(state: DataState, action: Action): DataState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        status: 'ready',
        data: action.data,
        readOnly: action.readOnly ?? false,
        loadError: action.loadError ?? null,
      };

    case 'UNLOCK':
      return { ...state, readOnly: false, loadError: null };

    case 'ADD_EMPLOYEE':
      return {
        ...state,
        data: touch({
          ...state.data,
          employees: [...state.data.employees, action.employee],
        }),
      };

    case 'RENAME_EMPLOYEE':
      return {
        ...state,
        data: touch({
          ...state.data,
          employees: state.data.employees.map((employee) =>
            employee.id === action.id ? { ...employee, name: action.name } : employee
          ),
        }),
      };

    case 'DELETE_EMPLOYEE': {
      const entries = { ...state.data.entries };
      delete entries[action.id];
      return {
        ...state,
        data: touch({
          ...state.data,
          employees: state.data.employees.filter((employee) => employee.id !== action.id),
          entries,
        }),
      };
    }

    case 'RESTORE_EMPLOYEE': {
      const employees = [...state.data.employees];
      employees.splice(Math.min(action.index, employees.length), 0, action.employee);
      return {
        ...state,
        data: touch({
          ...state.data,
          employees,
          entries: { ...state.data.entries, [action.employee.id]: action.entries },
        }),
      };
    }

    case 'SEED_DEMO':
      return {
        ...state,
        data: touch({
          ...state.data,
          employees: [...state.data.employees, action.employee],
          entries: { ...state.data.entries, [action.employee.id]: action.entries },
        }),
      };

    case 'SET_ENTRY_FIELD': {
      const { employeeId, dayKey, field, value } = action;
      const forEmployee = state.data.entries[employeeId] ?? {};
      const base = forEmployee[dayKey] ?? emptyEntry(dayKey);

      // `total` wird ausschließlich hier abgeleitet -- nicht in den Komponenten.
      const next = withRecomputedTotal({ ...base, [field]: value } as TimeEntry);

      return {
        ...state,
        data: touch({
          ...state.data,
          entries: {
            ...state.data.entries,
            [employeeId]: { ...forEmployee, [dayKey]: next },
          },
        }),
      };
    }

    case 'CLEAR_DAY': {
      const forEmployee = state.data.entries[action.employeeId];
      if (!forEmployee?.[action.dayKey]) return state;

      const nextForEmployee = { ...forEmployee };
      delete nextForEmployee[action.dayKey];

      return {
        ...state,
        data: touch({
          ...state.data,
          entries: { ...state.data.entries, [action.employeeId]: nextForEmployee },
        }),
      };
    }

    case 'RESTORE_DAY': {
      const forEmployee = state.data.entries[action.employeeId] ?? {};
      return {
        ...state,
        data: touch({
          ...state.data,
          entries: {
            ...state.data.entries,
            [action.employeeId]: { ...forEmployee, [action.dayKey]: action.entry },
          },
        }),
      };
    }

    case 'REPLACE_ALL':
      return { ...state, data: touch(action.data), readOnly: false, loadError: null };

    default:
      return state;
  }
}

export interface DeletedEmployeeSnapshot {
  employee: Employee;
  entries: EmployeeEntries;
  index: number;
}

export interface ChronoActions {
  /** @returns den angelegten Mitarbeiter, oder null bei leerem/doppeltem Namen */
  addEmployee(name: string): Employee | null;
  renameEmployee(id: EmployeeId, name: string): void;
  deleteEmployee(id: EmployeeId): DeletedEmployeeSnapshot | null;
  restoreEmployee(snapshot: DeletedEmployeeSnapshot): void;
  seedDemo(): Employee;
  setEntryField(
    employeeId: EmployeeId,
    dayKey: DayKey,
    field: 'project' | 'begin' | 'end' | 'pause',
    value: string | number | null
  ): void;
  clearDay(employeeId: EmployeeId, dayKey: DayKey): TimeEntry | null;
  restoreDay(employeeId: EmployeeId, dayKey: DayKey, entry: TimeEntry): void;
  replaceAll(data: ChronoTrackData): void;
  /** liest den aktuellen Bestand ohne Re-Render-Abhängigkeit (für Export/PDF) */
  snapshot(): ChronoTrackData;
  unlock(): void;
}

const DataStateContext = React.createContext<DataState | null>(null);
/** Getrennt vom State, damit reine Mutations-Konsumenten nicht bei jedem
 *  Tastendruck anderswo neu rendern. Die Identität bleibt dauerhaft stabil. */
const ChronoActionsContext = React.createContext<ChronoActions | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, {
    status: 'loading',
    data: emptyData(),
    readOnly: false,
    loadError: null,
  });
  const { toast } = useToast();

  // Immer aktueller Bestand, ohne dass die Actions ihre Identität ändern.
  const dataRef = React.useRef(state.data);
  React.useEffect(() => {
    dataRef.current = state.data;
  }, [state.data]);

  const statusRef = React.useRef(state.status);
  statusRef.current = state.status;

  // Einmaliges Laden inklusive v0-Migration.
  React.useEffect(() => {
    const result = loadData();

    if (result.status === 'recovered') {
      dispatch({ type: 'HYDRATE', data: result.data, readOnly: true, loadError: result.error });
      toast({
        variant: 'destructive',
        title: 'Gespeicherte Daten konnten nicht gelesen werden',
        description:
          'Zur Sicherheit wird nichts überschrieben. Bitte exportieren Sie eine Sicherung, bevor Sie fortfahren.',
        duration: 15000,
      });
      return;
    }

    dispatch({ type: 'HYDRATE', data: result.data });

    if (result.migration) {
      showMigrationToast(result.migration, toast);
    }
  }, [toast]);

  // Speichern -- der status-Gate macht die frühere Race strukturell unmöglich:
  // vor 'ready' wird grundsätzlich nicht geschrieben.
  React.useEffect(() => {
    if (state.status !== 'ready' || state.readOnly) return;
    scheduleSave(state.data);
  }, [state.data, state.status, state.readOnly]);

  React.useEffect(() => registerFlushTriggers(), []);

  React.useEffect(() => {
    onSaveError((error) => {
      toast({
        variant: 'destructive',
        title: isQuotaError(error) ? 'Der Speicher des Browsers ist voll' : 'Speichern fehlgeschlagen',
        description: isQuotaError(error)
          ? 'Bitte exportieren Sie eine Sicherung und löschen Sie alte Daten.'
          : 'Die letzten Änderungen konnten nicht gespeichert werden.',
        duration: 12000,
      });
    });
    return () => onSaveError(null);
  }, [toast]);

  // Zwei offene Tabs halten sich synchron, statt sich zu überschreiben.
  React.useEffect(
    () =>
      subscribeCrossTab((data) => {
        if (statusRef.current !== 'ready') return;
        dispatch({ type: 'HYDRATE', data });
      }),
    []
  );

  const actions = React.useMemo<ChronoActions>(
    () => ({
      addEmployee(name) {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const exists = dataRef.current.employees.some(
          (employee) => employee.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) return null;

        const employee: Employee = {
          id: createId(),
          name: trimmed,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_EMPLOYEE', employee });
        return employee;
      },

      renameEmployee(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        dispatch({ type: 'RENAME_EMPLOYEE', id, name: trimmed });
      },

      deleteEmployee(id) {
        const current = dataRef.current;
        const index = current.employees.findIndex((employee) => employee.id === id);
        if (index === -1) return null;

        const snapshot: DeletedEmployeeSnapshot = {
          employee: current.employees[index],
          entries: current.entries[id] ?? {},
          index,
        };
        dispatch({ type: 'DELETE_EMPLOYEE', id });
        return snapshot;
      },

      restoreEmployee(snapshot) {
        dispatch({ type: 'RESTORE_EMPLOYEE', ...snapshot });
      },

      seedDemo() {
        const { employee, entries } = createDemoEmployee();
        dispatch({ type: 'SEED_DEMO', employee, entries });
        return employee;
      },

      setEntryField(employeeId, dayKey, field, value) {
        dispatch({ type: 'SET_ENTRY_FIELD', employeeId, dayKey, field, value });
      },

      clearDay(employeeId, dayKey) {
        const existing = dataRef.current.entries[employeeId]?.[dayKey] ?? null;
        if (!existing) return null;
        dispatch({ type: 'CLEAR_DAY', employeeId, dayKey });
        return existing;
      },

      restoreDay(employeeId, dayKey, entry) {
        dispatch({ type: 'RESTORE_DAY', employeeId, dayKey, entry });
      },

      replaceAll(data) {
        dispatch({ type: 'REPLACE_ALL', data });
        // Import und Export dürfen nichts verlieren -- sofort schreiben.
        queueMicrotask(flushSave);
      },

      snapshot() {
        flushSave();
        return dataRef.current;
      },

      unlock() {
        dispatch({ type: 'UNLOCK' });
      },
    }),
    []
  );

  return (
    <DataStateContext.Provider value={state}>
      <ChronoActionsContext.Provider value={actions}>{children}</ChronoActionsContext.Provider>
    </DataStateContext.Provider>
  );
}

export function useDataState(): DataState {
  const context = React.useContext(DataStateContext);
  if (!context) throw new Error('useDataState muss innerhalb von <DataProvider> stehen.');
  return context;
}

export function useChronoActions(): ChronoActions {
  const context = React.useContext(ChronoActionsContext);
  if (!context) throw new Error('useChronoActions muss innerhalb von <DataProvider> stehen.');
  return context;
}

function showMigrationToast(
  report: MigrationReport,
  toast: ReturnType<typeof useToast>['toast']
) {
  const parts: string[] = [];
  if (report.employees > 0) {
    parts.push(`${report.employees} Mitarbeiter`);
  }
  if (report.entries > 0) {
    parts.push(plural(report.entries, 'Eintrag', 'Einträge'));
  }

  const notes: string[] = [];
  if (report.recoveredOrphans > 0) {
    notes.push(
      `${plural(report.recoveredOrphans, 'nicht zugeordneter Datensatz', 'nicht zugeordnete Datensätze')} wiederhergestellt`
    );
  }
  if (report.keyCollisions > 0) {
    notes.push(`${plural(report.keyCollisions, 'doppelter Tag', 'doppelte Tage')} zusammengeführt`);
  }
  if (report.unrecoverableEntries > 0) {
    notes.push(
      `${plural(report.unrecoverableEntries, 'Eintrag', 'Einträge')} ohne erkennbares Datum übersprungen`
    );
  }
  if (report.parseErrors.length > 0) {
    notes.push('Teile des alten Speichers waren beschädigt');
  }

  toast({
    title: 'Daten auf das neue Format aktualisiert',
    description: [
      parts.length > 0 ? `Übernommen: ${parts.join(', ')}.` : 'Es waren keine Daten vorhanden.',
      notes.length > 0 ? `${notes.join('. ')}.` : '',
      'Eine Kopie der alten Daten bleibt im Browser gespeichert.',
    ]
      .filter(Boolean)
      .join(' '),
    duration: 12000,
  });
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Für Tests. */
export { reducer as __dataReducer };
export type { Action as __DataAction };
