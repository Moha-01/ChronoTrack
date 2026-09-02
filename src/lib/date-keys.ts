import type { DayKey, MonthKey } from '@/lib/types';

/**
 * Zentrale Erzeugung und Auswertung der Tages-/Monatsschlüssel.
 *
 * Vor v1 wurde `${format(date,'yyyy-MM')}-${day}` an vier Stellen inline
 * dupliziert und erzeugte ungepolsterte Schlüssel ('2026-07-9'). Dadurch waren
 * die Schlüssel nicht sortierbar und je nach Erzeugungsort uneinheitlich.
 * Seit v1 gilt ausschließlich das gepolsterte ISO-Format '2026-07-09'.
 */

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function toDayKey(date: Date): DayKey {
  return makeDayKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** @param month 1-basiert (Januar = 1) */
export function makeDayKey(year: number, month: number, day: number): DayKey {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function toMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** @param month 1-basiert */
export function makeMonthKey(year: number, month: number): MonthKey {
  return `${year}-${pad2(month)}`;
}

export function isDayKey(value: string): boolean {
  return DAY_KEY_RE.test(value);
}

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_RE.test(value);
}

/** @returns `month` ist 1-basiert. `null`, wenn der Schlüssel nicht dem Format entspricht. */
export function parseDayKey(
  key: string
): { year: number; month: number; day: number } | null {
  const m = DAY_KEY_RE.exec(key);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = MONTH_KEY_RE.exec(key);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

/** Lokales Date-Objekt zum Schlüssel (Mitternacht Ortszeit). */
export function dayKeyToDate(key: DayKey): Date | null {
  const p = parseDayKey(key);
  if (!p) return null;
  return new Date(p.year, p.month - 1, p.day);
}

export function monthKeyToDate(key: MonthKey): Date | null {
  const p = parseMonthKey(key);
  if (!p) return null;
  return new Date(p.year, p.month - 1, 1);
}

/** Der Monat, zu dem ein Tagesschlüssel gehört. */
export function monthKeyOf(key: DayKey): MonthKey {
  return key.slice(0, 7);
}

/** Ob ein Tagesschlüssel auf Samstag oder Sonntag fällt. */
export function isWeekendKey(key: DayKey): boolean {
  const d = dayKeyToDate(key);
  if (!d) return false;
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

export function daysInMonth(monthKey: MonthKey): number {
  const p = parseMonthKey(monthKey);
  if (!p) return 0;
  // Tag 0 des Folgemonats = letzter Tag dieses Monats
  return new Date(p.year, p.month, 0).getDate();
}

/** Alle Tagesschlüssel eines Monats, aufsteigend. */
export function dayKeysOfMonth(monthKey: MonthKey): DayKey[] {
  const p = parseMonthKey(monthKey);
  if (!p) return [];
  const count = daysInMonth(monthKey);
  return Array.from({ length: count }, (_, i) => makeDayKey(p.year, p.month, i + 1));
}

/** ISO-8601-Kalenderwoche (Montag als erster Tag). */
export function isoWeekOf(key: DayKey): number {
  const d = dayKeyToDate(key);
  if (!d) return 0;
  // Auf den Donnerstag derselben Woche schieben — dieser bestimmt die KW.
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7; // Mo = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const diffDays = Math.round((target.getTime() - firstThursday.getTime()) / 86_400_000);
  return 1 + Math.floor(diffDays / 7);
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(new Date());
}
