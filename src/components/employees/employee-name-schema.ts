import { z } from 'zod';
import type { Employee } from '@/lib/types';

/**
 * Gemeinsames Schema für Anlegen und Umbenennen.
 *
 * Vorher hat `handleAddEmployee` bei einem doppelten Namen still nichts getan —
 * der Nutzer sah einfach, dass nichts passiert. Jetzt gibt es eine
 * Feldmeldung.
 */
export function employeeNameSchema(employees: Employee[], ownId?: string) {
  const taken = new Set(
    employees
      .filter((employee) => employee.id !== ownId)
      .map((employee) => employee.name.trim().toLowerCase())
  );

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Bitte geben Sie einen Namen ein.')
      .max(120, 'Der Name darf höchstens 120 Zeichen lang sein.')
      .refine((value) => !taken.has(value.toLowerCase()), {
        message: 'Ein Mitarbeiter mit diesem Namen existiert bereits.',
      }),
  });
}

export type EmployeeNameValues = { name: string };
