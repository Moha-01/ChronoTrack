import { z } from 'zod';
import { BACKUP_FORMAT } from '@/lib/types';

/**
 * Validierung importierter Sicherungen.
 *
 * Bewusst zweistufig gewichtet:
 *  - **streng** bei der Struktur (format, formatVersion, employees-Array,
 *    entries-Record) — eine fremde Datei muss laut scheitern, nicht stumm
 *    Unsinn importieren.
 *  - **tolerant** bei einzelnen Skalaren (`.catch(...)`) — ein einziger
 *    kaputter Pausenwert darf kein Backup aus drei Jahren ablehnen.
 */

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dayKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);

export const timeEntrySchema = z.object({
  id: z.string(),
  day: z.number().int().min(1).max(31).catch(1),
  project: z.string().max(500).catch(''),
  begin: timeOfDay.nullable().catch(null),
  end: timeOfDay.nullable().catch(null),
  pause: z.number().int().min(0).max(1440).catch(0),
  total: z.number().int().min(0).max(1440).catch(0),
});

export const employeeSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  createdAt: z
    .string()
    .catch(() => new Date().toISOString()),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
  app: z
    .object({ name: z.string().optional(), version: z.string().optional() })
    .optional(),
  exportedAt: z.string(),
  counts: z
    .object({ employees: z.number(), entries: z.number() })
    .optional(),
  payload: z.object({
    employees: z.array(employeeSchema).max(1000),
    // Schlüssel wird bewusst nicht auf dayKey eingeengt: ein abweichender
    // Schlüssel soll im Reparaturlauf korrigiert und gezählt werden, nicht
    // die ganze Datei zu Fall bringen.
    entries: z.record(z.string(), z.record(z.string(), timeEntrySchema)),
  }),
});

export type ParsedBackup = z.infer<typeof backupSchema>;

export { dayKey as dayKeySchema, timeOfDay as timeOfDaySchema };
