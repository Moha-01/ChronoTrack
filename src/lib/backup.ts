import type {
  BackupFile,
  ChronoTrackData,
  Employee,
  EmployeeEntries,
  EntriesByEmployee,
  TimeEntry,
} from '@/lib/types';
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, SCHEMA_VERSION } from '@/lib/types';
import { backupSchema } from '@/lib/backup-schema';
import { isDayKey, makeDayKey, parseDayKey } from '@/lib/date-keys';
import { createId } from '@/lib/id';
import { calculateDuration } from '@/lib/utils';

export const APP_VERSION = '1.0.0';
export const ORPHAN_EMPLOYEE_NAME = 'Unbekannt (importiert)';

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export function countEntries(entries: EntriesByEmployee): number {
  return Object.values(entries).reduce((acc, byDay) => acc + Object.keys(byDay).length, 0);
}

export function createBackup(data: ChronoTrackData, now = new Date()): BackupFile {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    app: { name: 'ChronoTrack', version: APP_VERSION },
    exportedAt: now.toISOString(),
    counts: {
      employees: data.employees.length,
      entries: countEntries(data.entries),
    },
    payload: {
      employees: data.employees,
      entries: data.entries,
    },
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function backupFilename(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(
    now.getHours()
  )}${p(now.getMinutes())}`;
  return `chronotrack-backup-${stamp}.json`;
}

/* ------------------------------------------------------------------ *
 * Import: Validierung + Reparatur
 * ------------------------------------------------------------------ */

export interface RepairReport {
  idsFixed: number;
  daysFixed: number;
  totalsRecomputed: number;
  keysNormalized: number;
  orphanEmployeesCreated: number;
  entriesDropped: number;
}

export type ParseBackupResult =
  | {
      ok: true;
      payload: { employees: Employee[]; entries: EntriesByEmployee };
      exportedAt: string;
      repairs: RepairReport;
    }
  | { ok: false; error: string; issues?: string[] };

export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: 'Die Datei konnte nicht gelesen werden. Ist es eine gültige JSON-Datei?',
    };
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Diese Datei ist keine ChronoTrack-Sicherung.',
      issues: parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || '(Wurzel)'}: ${issue.message}`),
    };
  }

  if (parsed.data.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Diese Sicherung stammt aus einer neueren Version von ChronoTrack.',
    };
  }

  const { payload, repairs } = repairPayload(parsed.data.payload);

  if (payload.employees.length === 0 && countEntries(payload.entries) === 0) {
    return { ok: false, error: 'Die Sicherung enthält keine Daten.' };
  }

  return { ok: true, payload, exportedAt: parsed.data.exportedAt, repairs };
}

/**
 * Bringt die Nutzdaten in einen konsistenten Zustand, statt sie abzulehnen.
 * Quelle der Wahrheit für `total` sind immer begin/end/pause.
 */
function repairPayload(payload: {
  employees: Employee[];
  entries: Record<string, Record<string, TimeEntry>>;
}): { payload: { employees: Employee[]; entries: EntriesByEmployee }; repairs: RepairReport } {
  const repairs: RepairReport = {
    idsFixed: 0,
    daysFixed: 0,
    totalsRecomputed: 0,
    keysNormalized: 0,
    orphanEmployeesCreated: 0,
    entriesDropped: 0,
  };

  const employees: Employee[] = [];
  const seenIds = new Set<string>();
  for (const employee of payload.employees) {
    if (seenIds.has(employee.id)) continue; // doppelte IDs verwerfen
    seenIds.add(employee.id);
    employees.push(employee);
  }

  const entries: EntriesByEmployee = {};

  for (const [employeeId, byDay] of Object.entries(payload.entries)) {
    let targetId = employeeId;

    if (!seenIds.has(employeeId)) {
      // Einträge ohne passenden Mitarbeiter: Platzhalter anlegen statt verwerfen.
      targetId = employeeId || createId();
      seenIds.add(targetId);
      employees.push({
        id: targetId,
        name: ORPHAN_EMPLOYEE_NAME,
        createdAt: new Date().toISOString(),
      });
      repairs.orphanEmployeesCreated += 1;
    }

    const repaired: EmployeeEntries = {};

    for (const [key, entry] of Object.entries(byDay)) {
      const normalizedKey = normalizeKey(key, entry);
      if (!normalizedKey) {
        repairs.entriesDropped += 1;
        continue;
      }
      if (normalizedKey !== key) repairs.keysNormalized += 1;

      const day = parseDayKey(normalizedKey)!.day;
      const next: TimeEntry = { ...entry, id: normalizedKey, day };

      if (entry.id !== normalizedKey) repairs.idsFixed += 1;
      if (entry.day !== day) repairs.daysFixed += 1;

      const total = calculateDuration(next.begin, next.end, next.pause);
      if (total !== entry.total) {
        repairs.totalsRecomputed += 1;
        next.total = total;
      }

      repaired[normalizedKey] = next;
    }

    if (Object.keys(repaired).length > 0) {
      entries[targetId] = { ...(entries[targetId] ?? {}), ...repaired };
    }
  }

  return { payload: { employees, entries }, repairs };
}

/** Repariert einen abweichenden Schlüssel über das Monatspräfix und `entry.day`. */
function normalizeKey(key: string, entry: TimeEntry): string | null {
  if (isDayKey(key)) return key;

  const loose = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key);
  if (loose) {
    const month = Number(loose[2]);
    const day = Number(loose[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return makeDayKey(Number(loose[1]), month, day);
    }
  }

  const prefix = /^(\d{4})-(\d{1,2})/.exec(key);
  if (prefix && Number.isInteger(entry.day) && entry.day >= 1 && entry.day <= 31) {
    const month = Number(prefix[2]);
    if (month >= 1 && month <= 12) {
      return makeDayKey(Number(prefix[1]), month, entry.day);
    }
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Zusammenführen
 * ------------------------------------------------------------------ */

export type MergeMode =
  /** Bei gleichem Tag gewinnen die importierten Werte. */
  | 'incoming-wins'
  /** Nur fehlende Tage ergänzen — lokale Werte bleiben unangetastet. */
  | 'local-wins';

export interface MergeReport {
  employeesAdded: number;
  employeesMatched: number;
  employeesRenamedOnConflict: number;
  entriesAdded: number;
  entriesOverwritten: number;
  entriesSkipped: number;
}

function emptyMergeReport(): MergeReport {
  return {
    employeesAdded: 0,
    employeesMatched: 0,
    employeesRenamedOnConflict: 0,
    entriesAdded: 0,
    entriesOverwritten: 0,
    entriesSkipped: 0,
  };
}

/**
 * Führt eine Sicherung mit dem aktuellen Bestand zusammen.
 *
 * Reine Funktion — die Vorschau vor dem Import ruft exakt dieselbe Funktion als
 * Trockenlauf auf. Was der Dialog verspricht, passiert deshalb auch.
 *
 * Identitätsauflösung, in dieser Reihenfolge:
 *  1. ID existiert lokal → dieselbe Person, **lokaler Name gewinnt**.
 *  2. ID neu, aber Name trifft (getrimmt, case-insensitiv) → dieselbe Person,
 *     die eingehende ID wird umgeschrieben. Ohne diese Regel dupliziert ein
 *     Backup von einem anderen Browser jeden Mitarbeiter, weil v0 keine IDs
 *     kannte und jedes Gerät eigene vergeben hat.
 *  3. ID trifft, Name unterscheidet sich → andere Person, neue ID + Namenszusatz.
 *  4. sonst → neu anlegen.
 */
export function mergeBackup(
  current: ChronoTrackData,
  incoming: { employees: Employee[]; entries: EntriesByEmployee },
  mode: MergeMode
): { data: ChronoTrackData; report: MergeReport } {
  const report = emptyMergeReport();

  const employees: Employee[] = current.employees.map((e) => ({ ...e }));
  const byId = new Map(employees.map((e) => [e.id, e]));
  const byName = new Map(employees.map((e) => [normalizeName(e.name), e]));

  /** eingehende ID → lokale ID */
  const idMap = new Map<string, string>();

  for (const incomingEmployee of incoming.employees) {
    const localById = byId.get(incomingEmployee.id);

    if (localById) {
      if (normalizeName(localById.name) === normalizeName(incomingEmployee.name)) {
        // Regel 1: dieselbe Person, lokaler Name bleibt.
        idMap.set(incomingEmployee.id, localById.id);
        report.employeesMatched += 1;
      } else {
        // Regel 3: ID-Kollision zwischen verschiedenen Personen.
        const fresh = makeUniqueEmployee(
          { ...incomingEmployee, id: createId(), name: `${incomingEmployee.name} (importiert)` },
          byName
        );
        employees.push(fresh);
        byId.set(fresh.id, fresh);
        byName.set(normalizeName(fresh.name), fresh);
        idMap.set(incomingEmployee.id, fresh.id);
        report.employeesAdded += 1;
        report.employeesRenamedOnConflict += 1;
      }
      continue;
    }

    const localByName = byName.get(normalizeName(incomingEmployee.name));
    if (localByName) {
      // Regel 2: gleiche Person, unterschiedliche IDs (typisch nach v0-Migration
      // auf zwei Geräten).
      idMap.set(incomingEmployee.id, localByName.id);
      report.employeesMatched += 1;
      continue;
    }

    // Regel 4
    const added: Employee = { ...incomingEmployee };
    employees.push(added);
    byId.set(added.id, added);
    byName.set(normalizeName(added.name), added);
    idMap.set(incomingEmployee.id, added.id);
    report.employeesAdded += 1;
  }

  const entries: EntriesByEmployee = {};
  for (const [employeeId, byDay] of Object.entries(current.entries)) {
    entries[employeeId] = { ...byDay };
  }

  for (const [incomingId, byDay] of Object.entries(incoming.entries)) {
    const targetId = idMap.get(incomingId) ?? incomingId;
    const target = entries[targetId] ?? {};

    for (const [dayKey, entry] of Object.entries(byDay)) {
      const existing = target[dayKey];

      if (!existing) {
        target[dayKey] = { ...entry };
        report.entriesAdded += 1;
        continue;
      }

      if (mode === 'incoming-wins') {
        target[dayKey] = { ...entry };
        report.entriesOverwritten += 1;
      } else {
        report.entriesSkipped += 1;
      }
    }

    entries[targetId] = target;
  }

  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      employees,
      entries,
      updatedAt: new Date().toISOString(),
    },
    report,
  };
}

/** Ersetzt den gesamten Bestand. Der Aufrufer sichert vorher per `snapshotBeforeImport`. */
export function replaceWithBackup(incoming: {
  employees: Employee[];
  entries: EntriesByEmployee;
}): ChronoTrackData {
  return {
    schemaVersion: SCHEMA_VERSION,
    employees: incoming.employees.map((e) => ({ ...e })),
    entries: Object.fromEntries(
      Object.entries(incoming.entries).map(([id, byDay]) => [id, { ...byDay }])
    ),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function makeUniqueEmployee(employee: Employee, byName: Map<string, Employee>): Employee {
  if (!byName.has(normalizeName(employee.name))) return employee;

  let suffix = 2;
  let candidate = `${employee.name} ${suffix}`;
  while (byName.has(normalizeName(candidate))) {
    suffix += 1;
    candidate = `${employee.name} ${suffix}`;
  }
  return { ...employee, name: candidate };
}
