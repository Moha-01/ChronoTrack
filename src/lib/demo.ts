import type { Employee, EmployeeEntries } from '@/lib/types';
import { currentMonthKey, dayKeysOfMonth, isWeekendKey, parseDayKey } from '@/lib/date-keys';
import { createId } from '@/lib/id';
import { calculateDuration } from '@/lib/utils';

export const DEMO_EMPLOYEE_NAME = 'Demo Mitarbeiter';

const PROJECTS = ['Projekt Phönix', 'Halle 3 – Wartung', 'Baustelle Nordring'];

/** Erzeugt einen gefüllten aktuellen Monat: Werktage 09:00–17:30 mit 60 min Pause. */
export function createDemoEmployee(): { employee: Employee; entries: EmployeeEntries } {
  const employee: Employee = {
    id: createId(),
    name: DEMO_EMPLOYEE_NAME,
    createdAt: new Date().toISOString(),
  };

  const entries: EmployeeEntries = {};
  let weekdayIndex = 0;

  for (const dayKey of dayKeysOfMonth(currentMonthKey())) {
    if (isWeekendKey(dayKey)) continue;

    const begin = '09:00';
    const end = '17:30';
    const pause = 60;

    entries[dayKey] = {
      id: dayKey,
      day: parseDayKey(dayKey)!.day,
      project: PROJECTS[weekdayIndex % PROJECTS.length],
      begin,
      end,
      pause,
      total: calculateDuration(begin, end, pause),
    };
    weekdayIndex += 1;
  }

  return { employee, entries };
}
