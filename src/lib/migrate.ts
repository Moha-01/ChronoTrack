import type {
  ChronoTrackData,
  DayKey,
  Employee,
  EmployeeEntries,
  EntriesByEmployee,
  LegacyTimeEntry,
  TimeEntry,
} from '@/lib/types';
import { SCHEMA_VERSION } from '@/lib/types';
import { makeDayKey } from '@/lib/date-keys';
import { createId } from '@/lib/id';
import { calculateDuration, isValidTime } from '@/lib/utils';

/**
 * Migration v0 → v1.
 *
 * v0 speicherte unter zwei Schlüsseln:
 *   chronotrack-employees : string[]                              (Name = Identität)
 *   chronotrack-entries   : Record<Name, Record<dayKey, Entry>>   (dayKey ungepolstert)
 * und benutzte '00:00' als Sentinel für "nicht erfasst".
 *
 * Oberstes Gebot: **verlustfrei**. Es wird nie stillschweigend etwas verworfen —
 * Waisen-Einträge bekommen einen Mitarbeiter, unrettbare Schlüssel werden gezählt
 * und gemeldet. Zusätzlich sichert storage.ts vorher die Rohstrings.
 */

export interface MigrationReport {
  employees: number;
  entries: number;
  /** gepolsterter und ungepolsterter Schlüssel zeigten auf denselben Tag */
  keyCollisions: number;
  /** '00:00'-Sentinels, die zu null wurden */
  sentinelsCleared: number;
  /** Einträge unter einem Namen, der nicht in der Mitarbeiterliste stand */
  recoveredOrphans: number;
  /** Einträge, deren Tag sich nicht rekonstruieren ließ */
  unrecoverableEntries: number;
  /** 'employees' und/oder 'entries', falls JSON.parse fehlschlug */
  parseErrors: string[];
}

function emptyReport(): MigrationReport {
  return {
    employees: 0,
    entries: 0,
    keyCollisions: 0,
    sentinelsCleared: 0,
    recoveredOrphans: 0,
    unrecoverableEntries: 0,
    parseErrors: [],
  };
}

export function hasMigrationReportContent(report: MigrationReport): boolean {
  return report.employees > 0 || report.entries > 0 || report.parseErrors.length > 0;
}

const OLD_KEY_RE = /^(\d{4})-(\d{2})-(\d{1,2})$/;
const OLD_MONTH_PREFIX_RE = /^(\d{4})-(\d{2})/;

/**
 * Beide Rohstrings werden **unabhängig** geparst: ist einer defekt, geht der
 * andere trotzdem nicht verloren.
 */
export function migrateV0toV1(
  rawEmployees: string | null,
  rawEntries: string | null
): { data: ChronoTrackData; report: MigrationReport } {
  const report = emptyReport();

  const legacyNames = parseJson<unknown>(rawEmployees, () =>
    report.parseErrors.push('employees')
  );
  const legacyEntries = parseJson<unknown>(rawEntries, () =>
    report.parseErrors.push('entries')
  );

  const employees: Employee[] = [];
  const entries: EntriesByEmployee = {};
  /** getrimmt + kleingeschrieben → EmployeeId */
  const nameToId = new Map<string, string>();
  const nowIso = new Date().toISOString();

  const addEmployee = (rawName: string): string => {
    const name = String(rawName).trim();
    if (!name) return '';
    const lookup = name.toLowerCase();
    const existing = nameToId.get(lookup);
    if (existing) return existing;

    const id = createId();
    nameToId.set(lookup, id);
    employees.push({ id, name, createdAt: nowIso });
    return id;
  };

  // 1. Mitarbeiter in ursprünglicher Reihenfolge übernehmen.
  if (Array.isArray(legacyNames)) {
    for (const name of legacyNames) {
      if (typeof name === 'string') addEmployee(name);
    }
  }

  // 2. Einträge je Mitarbeiter umschlüsseln.
  if (isPlainObject(legacyEntries)) {
    for (const [employeeName, byDay] of Object.entries(legacyEntries)) {
      if (!isPlainObject(byDay)) continue;

      const lookup = employeeName.trim().toLowerCase();
      let employeeId = nameToId.get(lookup);
      if (!employeeId) {
        // Waise: Einträge ohne passenden Mitarbeiter. Anlegen statt verwerfen.
        employeeId = addEmployee(employeeName);
        if (!employeeId) continue;
        report.recoveredOrphans += 1;
      }

      const migrated: EmployeeEntries = {};
      /** merkt sich, ob der Quellschlüssel bereits gepolstert war */
      const wasPadded = new Map<DayKey, boolean>();

      for (const [oldKey, rawEntry] of Object.entries(byDay)) {
        if (!isPlainObject(rawEntry)) continue;
        const legacy = rawEntry as unknown as LegacyTimeEntry;

        const resolved = resolveDayKey(oldKey, legacy);
        if (!resolved) {
          report.unrecoverableEntries += 1;
          continue;
        }

        const candidate = convertEntry(resolved.key, legacy, report);
        const existing = migrated[resolved.key];

        if (!existing) {
          migrated[resolved.key] = candidate;
          wasPadded.set(resolved.key, resolved.padded);
          continue;
        }

        // Kollision: derselbe Tag kam gepolstert und ungepolstert vor.
        report.keyCollisions += 1;
        if (preferCandidate(candidate, existing, resolved.padded, wasPadded.get(resolved.key) ?? false)) {
          migrated[resolved.key] = candidate;
          wasPadded.set(resolved.key, resolved.padded);
        }
      }

      const count = Object.keys(migrated).length;
      if (count > 0) {
        entries[employeeId] = migrated;
        report.entries += count;
      }
    }
  }

  report.employees = employees.length;

  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      employees,
      entries,
      updatedAt: nowIso,
    },
    report,
  };
}

/**
 * Ermittelt den neuen, gepolsterten Schlüssel.
 * Fallback: Monatspräfix des alten Schlüssels kombiniert mit `entry.day`.
 */
function resolveDayKey(
  oldKey: string,
  entry: LegacyTimeEntry
): { key: DayKey; padded: boolean } | null {
  const m = OLD_KEY_RE.exec(oldKey);
  if (m) {
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { key: makeDayKey(Number(m[1]), month, day), padded: m[3].length === 2 };
    }
  }

  const prefix = OLD_MONTH_PREFIX_RE.exec(oldKey);
  const fallbackDay = Number(entry?.day);
  if (prefix) {
    const month = Number(prefix[2]);
    if (
      month >= 1 &&
      month <= 12 &&
      Number.isInteger(fallbackDay) &&
      fallbackDay >= 1 &&
      fallbackDay <= 31
    ) {
      return { key: makeDayKey(Number(prefix[1]), month, fallbackDay), padded: false };
    }
  }

  return null;
}

function convertEntry(
  key: DayKey,
  legacy: LegacyTimeEntry,
  report: MigrationReport
): TimeEntry {
  let begin: string | null = typeof legacy.begin === 'string' ? legacy.begin : null;
  let end: string | null = typeof legacy.end === 'string' ? legacy.end : null;

  const legacyTotal = Number(legacy.total);

  // Sentinel-Bereinigung — nur wenn der alte Eintrag 0 Minuten hatte.
  //
  // Der Schutz ist essenziell: die neue Berechnung schlägt über Mitternacht um.
  // Ein alter Eintrag '09:00' → '00:00' (Ende nie ausgefüllt, altes total 0)
  // würde sonst zu einem falschen 15-Stunden-Tag. Umgekehrt bleibt ein echter
  // Mitternachtsbeginn '00:00' → '08:00' (altes total 480) unangetastet.
  if (legacyTotal === 0) {
    if (begin === '00:00') {
      begin = null;
      report.sentinelsCleared += 1;
    }
    if (end === '00:00') {
      end = null;
      report.sentinelsCleared += 1;
    }
  }

  if (!isValidTime(begin)) begin = null;
  if (!isValidTime(end)) end = null;

  const rawPause = Number(legacy.pause);
  const pause = Number.isFinite(rawPause) ? Math.max(0, Math.round(rawPause)) : 0;

  return {
    id: key,
    day: Number(key.slice(8, 10)),
    project: typeof legacy.project === 'string' ? legacy.project : '',
    begin,
    end,
    pause,
    total: calculateDuration(begin, end, pause),
  };
}

/** Kollisionsregel: größeres total, dann mehr gefüllte Felder, dann der bereits gepolsterte. */
function preferCandidate(
  candidate: TimeEntry,
  existing: TimeEntry,
  candidatePadded: boolean,
  existingPadded: boolean
): boolean {
  if (candidate.total !== existing.total) return candidate.total > existing.total;

  const candidateScore = filledFields(candidate);
  const existingScore = filledFields(existing);
  if (candidateScore !== existingScore) return candidateScore > existingScore;

  return candidatePadded && !existingPadded;
}

function filledFields(entry: TimeEntry): number {
  let score = 0;
  if (entry.begin) score += 1;
  if (entry.end) score += 1;
  if (entry.project.trim()) score += 1;
  if (entry.pause > 0) score += 1;
  return score;
}

function parseJson<T>(raw: string | null, onError: () => void): T | null {
  if (raw === null || raw === '') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    onError();
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
