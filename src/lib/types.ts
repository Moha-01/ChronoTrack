/** Kalendertag im ISO-Format, immer zweistellig gepolstert: '2026-07-09'.
 *  Ist zugleich der Schlüssel im Entries-Record und die `id` des Eintrags. */
export type DayKey = string;

/** Monat im Format 'yyyy-MM', z.B. '2026-07'. */
export type MonthKey = string;

/** Uhrzeit im 24h-Format 'HH:mm', immer zweistellig. */
export type TimeOfDay = string;

export type EmployeeId = string;

export interface Employee {
  id: EmployeeId;
  name: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface TimeEntry {
  /** identisch mit dem Schlüssel, unter dem der Eintrag steht */
  id: DayKey;
  /** Tag im Monat, 1..31 — redundant zum Schlüssel, aber für Sortierung und Bericht praktisch */
  day: number;
  project: string;
  /** null = nicht erfasst. Früher wurde dafür der Sentinel '00:00' benutzt,
   *  wodurch "leer" nicht von "Mitternacht" unterscheidbar war. */
  begin: TimeOfDay | null;
  end: TimeOfDay | null;
  /** Minuten */
  pause: number;
  /** abgeleitete Nettodauer in Minuten */
  total: number;
}

export type EmployeeEntries = Record<DayKey, TimeEntry>;
export type EntriesByEmployee = Record<EmployeeId, EmployeeEntries>;

export const SCHEMA_VERSION = 1 as const;

export interface ChronoTrackData {
  schemaVersion: typeof SCHEMA_VERSION;
  employees: Employee[];
  entries: EntriesByEmployee;
  /** ISO 8601 */
  updatedAt: string;
}

export const BACKUP_FORMAT = 'chronotrack.backup' as const;
export const BACKUP_FORMAT_VERSION = 1 as const;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  /** versioniert die Hülle */
  formatVersion: number;
  /** versioniert die Nutzdaten */
  schemaVersion: number;
  app?: { name?: string; version?: string };
  /** ISO 8601 */
  exportedAt: string;
  /** rein informativ, für die Vorschau vor dem Import */
  counts?: { employees: number; entries: number };
  payload: {
    employees: Employee[];
    entries: EntriesByEmployee;
  };
}

/* ------------------------------------------------------------------ *
 * Altbestand (v0). Wird ausschließlich von migrate.ts gelesen.
 * v0 kannte keine Mitarbeiter-IDs (der Name war der Schlüssel), keine
 * gepolsterten Tagesschlüssel und benutzte '00:00' als Leer-Sentinel.
 * ------------------------------------------------------------------ */

export interface LegacyTimeEntry {
  id: string;
  day: number;
  project: string;
  begin: string;
  end: string;
  pause: number;
  total: number;
}

/** Record<Mitarbeitername, Record<ungepolsterter dayKey, LegacyTimeEntry>> */
export type LegacyEntriesByName = Record<string, Record<string, LegacyTimeEntry>>;
