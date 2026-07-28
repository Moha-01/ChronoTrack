import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TimeOfDay } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_PER_DAY = 24 * 60;

/** Minuten seit Mitternacht, oder null bei leerem/ungültigem Wert. */
export function toMinutes(time: TimeOfDay | null | undefined): number | null {
  if (!time) return null;
  const m = HHMM_RE.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isValidTime(time: string | null | undefined): boolean {
  return toMinutes(time) !== null;
}

/**
 * Nettoarbeitszeit in Minuten.
 *
 * Reine Integer-Arithmetik statt Date-Objekten: das behebt zwei Fehler der
 * Vorgängerversion — Nachtschichten (Ende < Beginn) lieferten 0 statt der
 * korrekten Dauer, und an Zeitumstellungstagen rechnete `setHours` um eine
 * Stunde falsch.
 *
 * Grenzfall: `begin === end` ergibt 0, nicht 24 Stunden.
 */
export function calculateDuration(
  begin: TimeOfDay | null | undefined,
  end: TimeOfDay | null | undefined,
  pause: number
): number {
  const b = toMinutes(begin);
  const e = toMinutes(end);
  if (b === null || e === null) return 0;

  let span = e - b;
  if (span < 0) span += MINUTES_PER_DAY; // 22:00 → 06:00 = 480

  const breakMinutes = Number.isFinite(pause) ? Math.max(0, pause) : 0;
  const net = span - breakMinutes;
  return net > 0 ? net : 0;
}

/**
 * Kompakte Anzeige: "8:30 h" — die im deutschen Zeitnachweis übliche
 * Schreibweise. Richtet sich mit `tabular-nums` spaltenweise sauber aus.
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0:00 h';
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(Math.round(minutes % 60)).padStart(2, '0')} h`;
}

/** Ausgeschriebene Variante für Zusammenfassungen: "8 Std. 30 Min." */
export function formatDurationLong(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 Std.';
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} Min.`;
  if (rest === 0) return `${hours} Std.`;
  return `${hours} Std. ${rest} Min.`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
