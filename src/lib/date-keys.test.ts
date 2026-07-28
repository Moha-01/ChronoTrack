import { describe, it, expect } from 'vitest';
import {
  dayKeysOfMonth,
  dayKeyToDate,
  daysInMonth,
  isoWeekOf,
  isWeekendKey,
  makeDayKey,
  monthKeyOf,
  parseDayKey,
  toDayKey,
  toMonthKey,
} from '@/lib/date-keys';

describe('Schlüsselerzeugung', () => {
  it('polstert immer auf zwei Stellen', () => {
    expect(makeDayKey(2026, 1, 9)).toBe('2026-01-09');
    expect(makeDayKey(2026, 12, 31)).toBe('2026-12-31');
  });

  it('leitet Schlüssel aus einem Date ab', () => {
    const d = new Date(2026, 6, 9); // Juli ist Monat 6 (0-basiert)
    expect(toDayKey(d)).toBe('2026-07-09');
    expect(toMonthKey(d)).toBe('2026-07');
  });

  it('gibt den Monat eines Tagesschlüssels zurück', () => {
    expect(monthKeyOf('2026-07-09')).toBe('2026-07');
  });
});

describe('parseDayKey', () => {
  it('liefert 1-basierte Monate', () => {
    expect(parseDayKey('2026-07-09')).toEqual({ year: 2026, month: 7, day: 9 });
  });

  it('weist ungepolsterte oder kaputte Schlüssel zurück', () => {
    expect(parseDayKey('2026-07-9')).toBeNull();
    expect(parseDayKey('2026-07')).toBeNull();
    expect(parseDayKey('unsinn')).toBeNull();
  });

  it('erzeugt ein lokales Date zur Mitternacht', () => {
    const d = dayKeyToDate('2026-07-09')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(0);
  });
});

describe('Monatslängen', () => {
  it('kennt Schaltjahre', () => {
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2000-02')).toBe(29);
    expect(daysInMonth('1900-02')).toBe(28);
  });

  it('listet alle Tage eines Monats auf', () => {
    const keys = dayKeysOfMonth('2026-02');
    expect(keys).toHaveLength(28);
    expect(keys[0]).toBe('2026-02-01');
    expect(keys[27]).toBe('2026-02-28');
  });

  it('sortiert lexikografisch korrekt — der Grund für die Polsterung', () => {
    const keys = dayKeysOfMonth('2026-07');
    expect([...keys].sort()).toEqual(keys);
  });
});

describe('isWeekendKey', () => {
  it('erkennt Samstag und Sonntag', () => {
    expect(isWeekendKey('2026-07-04')).toBe(true); // Samstag
    expect(isWeekendKey('2026-07-05')).toBe(true); // Sonntag
    expect(isWeekendKey('2026-07-06')).toBe(false); // Montag
  });
});

describe('isoWeekOf', () => {
  it('rechnet nach ISO 8601 mit Montag als Wochenstart', () => {
    expect(isoWeekOf('2026-01-01')).toBe(1); // Donnerstag → KW 1
    expect(isoWeekOf('2026-12-31')).toBe(53);
    expect(isoWeekOf('2024-12-30')).toBe(1); // Montag, gehört schon zu KW 1/2025
  });
});
