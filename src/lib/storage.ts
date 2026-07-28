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
      return { status: 'ok', data: normalize(parsed), migration: null };
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

  const { data, report } = migrateV0toV1(rawEmployees, rawEntries);

  try {
    // Zuerst die Rohdaten sichern — erst danach darf irgendetwas gelöscht werden.
    window.localStorage.setItem(
      V0_BACKUP_KEY,
      JSON.stringify({
        employees: rawEmployees,
        entries: rawEntries,
        migratedAt: new Date().toISOString(),
      })
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.localStorage.removeItem(LEGACY_EMPLOYEES_KEY);
    window.localStorage.removeItem(LEGACY_ENTRIES_KEY);
  } catch (error) {
    // Migration im Speicher gelungen, Persistieren nicht. Daten trotzdem
    // anzeigen; der nächste Save versucht es erneut.
    console.error('Migration konnte nicht gespeichert werden', error);
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

export function hasV0Backup(): boolean {
  return hasWindow() && readKey(V0_BACKUP_KEY) !== null;
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
