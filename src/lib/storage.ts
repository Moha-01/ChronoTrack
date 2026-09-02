import type { ChronoTrackData } from '@/lib/types';
import { SCHEMA_VERSION } from '@/lib/types';
import { migrateV0toV1, hasMigrationReportContent, type MigrationReport } from '@/lib/migrate';

export const STORAGE_KEY = 'chronotrack:v1';
/** Rohe v0-Strings, unverändert. Bleiben dauerhaft als Rettungsanker liegen. */
export const V0_BACKUP_KEY = 'chronotrack:v0-backup';
/** Snapshot direkt vor einem Ersetzen-Import, für "Rückgängig". */
export const PRE_IMPORT_KEY = 'chronotrack:pre-import';
export const THEME_KEY = 'chronotrack:theme';

const LEGACY_EMPLOYEES_KEY = 'chronotrack-employees';
const LEGACY_ENTRIES_KEY = 'chronotrack-entries';

const SAVE_DEBOUNCE_MS = 400;

export function emptyData(): ChronoTrackData {
  return {
    schemaVersion: SCHEMA_VERSION,
    employees: [],
    entries: {},
    updatedAt: new Date().toISOString(),
  };
}

export type LoadResult =
  | { status: 'ok'; data: ChronoTrackData; migration: MigrationReport | null }
  /** Lesen ist fehlgeschlagen. Es wurde **nichts** geschrieben; Speichern bleibt
   *  gesperrt, bis der Nutzer quittiert — sonst überschriebe ein Parse-Fehler
   *  die noch heilen Daten mit einem leeren Objekt. */
  | { status: 'recovered'; data: ChronoTrackData; error: string };

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Lädt den Datenbestand und migriert bei Bedarf einmalig von v0.
 *
 * Reihenfolge:
 *   1. chronotrack:v1 lesen — der Normalfall, ohne jede Migration.
 *   2. sonst v0-Schlüssel migrieren, Rohstrings sichern, v1 schreiben,
 *      v0-Schlüssel entfernen (macht die Migration idempotent).
 *   3. sonst leer starten.
 */
export function loadData(): LoadResult {
  if (!hasWindow()) {
    return { status: 'ok', data: emptyData(), migration: null };
  }

  const rawV1 = readKey(STORAGE_KEY);
  if (rawV1) {
    try {
      const parsed = JSON.parse(rawV1) as ChronoTrackData;
      const normalized = normalize(parsed);

      // Falls der v1-Stand komplett leer ist, prüfen wir, ob noch Altdaten
      // aus der früheren Version (main) vorliegen, und migrieren diese automatisch.
      if (normalized.employees.length === 0 && Object.keys(normalized.entries).length === 0) {
        const rawEmployees = readKey(LEGACY_EMPLOYEES_KEY);
        const rawEntries = readKey(LEGACY_ENTRIES_KEY);
        if (rawEmployees !== null || rawEntries !== null) {
          return applyAndSaveMigration(rawEmployees, rawEntries);
        }
        const rawV0Backup = readKey(V0_BACKUP_KEY);
        if (rawV0Backup) {
          try {
            const b = JSON.parse(rawV0Backup);
            if (b.employees || b.entries) {
              const preview = migrateV0toV1(b.employees, b.entries);
              if (preview.data.employees.length > 0) {
                return applyAndSaveMigration(b.employees, b.entries);
              }
            }
          } catch {
            /* ignore */
          }
        }
      }

      return { status: 'ok', data: normalized, migration: null };
    } catch (error) {
      return {
        status: 'recovered',
        data: emptyData(),
        error: describeError(error),
      };
    }
  }

  const rawEmployees = readKey(LEGACY_EMPLOYEES_KEY);
  const rawEntries = readKey(LEGACY_ENTRIES_KEY);

  if (rawEmployees === null && rawEntries === null) {
    return { status: 'ok', data: emptyData(), migration: null };
  }

  return applyAndSaveMigration(rawEmployees, rawEntries);
}

function applyAndSaveMigration(
  rawEmployees: string | null,
  rawEntries: string | null
): LoadResult {
  const { data, report } = migrateV0toV1(rawEmployees, rawEntries);

  // Die Reihenfolge ist bewusst so gewählt, dass an keiner Stelle Daten
  // verloren gehen können — auch nicht, wenn der Speicher voll ist (die
  // Sicherung verdoppelt den Bedarf kurzzeitig):
  //
  //   1. neuen Stand schreiben. Scheitert das, bleibt alles Alte unberührt.
  //   2. Rohdaten sichern.
  //   3. Alte Schlüssel NUR entfernen, wenn Schritt 2 geklappt hat — sonst
  //      sind sie selbst noch die einzige Sicherung und bleiben liegen.
  let v1Written = false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    v1Written = true;
  } catch (error) {
    console.error('Migrierter Stand konnte nicht gespeichert werden', error);
  }

  if (v1Written) {
    let backupWritten = false;
    try {
      window.localStorage.setItem(
        V0_BACKUP_KEY,
        JSON.stringify({
          employees: rawEmployees,
          entries: rawEntries,
          migratedAt: new Date().toISOString(),
        })
      );
      backupWritten = true;
    } catch (error) {
      console.error('Sicherung der alten Daten fehlgeschlagen', error);
    }

    if (backupWritten) {
      try {
        window.localStorage.removeItem(LEGACY_EMPLOYEES_KEY);
        window.localStorage.removeItem(LEGACY_ENTRIES_KEY);
      } catch (error) {
        console.error('Alte Schlüssel konnten nicht entfernt werden', error);
      }
    }
  }

  return {
    status: 'ok',
    data,
    migration: hasMigrationReportContent(report) ? report : null,
  };
}

/** Füllt fehlende Felder auf, damit ein von Hand verändertes v1-Objekt nicht crasht. */
function normalize(data: Partial<ChronoTrackData> | null): ChronoTrackData {
  return {
    schemaVersion: SCHEMA_VERSION,
    employees: Array.isArray(data?.employees) ? data!.employees : [],
    entries:
      data?.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)
        ? data.entries
        : {},
    updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Schreiben — entprellt.
 *
 * v0 serialisierte bei jedem Tastendruck den kompletten Datenbestand.
 * ------------------------------------------------------------------ */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: ChronoTrackData | null = null;
let quotaHandler: ((error: unknown) => void) | null = null;

/** Wird bei QuotaExceededError aufgerufen — der Provider hängt hier einen Toast ein. */
export function onSaveError(handler: ((error: unknown) => void) | null): void {
  quotaHandler = handler;
}

export function scheduleSave(data: ChronoTrackData): void {
  if (!hasWindow()) return;
  pending = data;
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
}

/** Schreibt sofort. Vor Export, Import, PDF und beim Verlassen der Seite aufrufen. */
export function flushSave(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pending || !hasWindow()) return;

  const data = pending;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    pending = null;
  } catch (error) {
    console.error('Speichern fehlgeschlagen', error);
    quotaHandler?.(error);
  }
}

export function writeNow(data: ChronoTrackData): boolean {
  if (!hasWindow()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    pending = null;
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    return true;
  } catch (error) {
    console.error('Speichern fehlgeschlagen', error);
    quotaHandler?.(error);
    return false;
  }
}

/**
 * Registriert die Flush-Auslöser.
 *
 * Bewusst `visibilitychange` + `pagehide` statt `beforeunload`: letzteres feuert
 * auf mobilem Safari unzuverlässig.
 */
export function registerFlushTriggers(): () => void {
  if (!hasWindow()) return () => {};

  const onHidden = () => {
    if (document.visibilityState === 'hidden') flushSave();
  };
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', flushSave);

  return () => {
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('pagehide', flushSave);
    flushSave();
  };
}

/** Hält zwei offene Tabs synchron, damit sie sich nicht gegenseitig überschreiben. */
export function subscribeCrossTab(callback: (data: ChronoTrackData) => void): () => void {
  if (!hasWindow()) return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      callback(normalize(JSON.parse(event.newValue) as ChronoTrackData));
    } catch {
      /* fremder Tab hat Unsinn geschrieben — ignorieren */
    }
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/* ------------------------------------------------------------------ *
 * Import-Sicherung
 * ------------------------------------------------------------------ */

export function snapshotBeforeImport(data: ChronoTrackData): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PRE_IMPORT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Snapshot vor Import fehlgeschlagen', error);
  }
}

export function readPreImportSnapshot(): ChronoTrackData | null {
  if (!hasWindow()) return null;
  const raw = readKey(PRE_IMPORT_KEY);
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw) as ChronoTrackData);
  } catch {
    return null;
  }
}

export function clearPreImportSnapshot(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(PRE_IMPORT_KEY);
  } catch {
    /* egal */
  }
}

/** Löscht die Nutzdaten. Die v0-Sicherung bleibt bewusst erhalten. */
export function clearAllData(): void {
  if (!hasWindow()) return;
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pending = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Löschen fehlgeschlagen', error);
  }
}

export interface V0Backup {
  /** die unveränderten Rohstrings aus der alten Version */
  employees: string | null;
  entries: string | null;
  migratedAt: string;
}

/**
 * Die beim Umstieg gesicherten Rohdaten der alten Version.
 *
 * Sie werden bewusst nie automatisch gelöscht — auch nicht von
 * `clearAllData()` — damit der ursprüngliche Stand jederzeit wieder
 * eingelesen werden kann.
 */
export function readV0Backup(): V0Backup | null {
  if (!hasWindow()) return null;

  const raw = readKey(V0_BACKUP_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as V0Backup;
      return {
        employees: typeof parsed.employees === 'string' ? parsed.employees : null,
        entries: typeof parsed.entries === 'string' ? parsed.entries : null,
        migratedAt: typeof parsed.migratedAt === 'string' ? parsed.migratedAt : '',
      };
    } catch {
      return null;
    }
  }

  // Sonderfall: die Migration lief noch nicht oder konnte die Sicherung nicht
  // schreiben — dann liegen die Originalschlüssel noch da.
  const employees = readKey(LEGACY_EMPLOYEES_KEY);
  const entries = readKey(LEGACY_ENTRIES_KEY);
  if (employees === null && entries === null) return null;
  return { employees, entries, migratedAt: '' };
}

export function hasV0Backup(): boolean {
  return readV0Backup() !== null;
}

export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22)
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
