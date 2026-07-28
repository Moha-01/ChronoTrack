import { describe, it, expect } from 'vitest';
import { calculateDuration, formatDuration, formatDurationLong, toMinutes } from '@/lib/utils';

describe('toMinutes', () => {
  it('parst gültige Zeiten', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('weist Ungültiges und Leeres zurück', () => {
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes('')).toBeNull();
    expect(toMinutes('24:00')).toBeNull();
    expect(toMinutes('8:30')).toBeNull(); // nicht gepolstert
    expect(toMinutes('12:60')).toBeNull();
    expect(toMinutes('abc')).toBeNull();
  });
});

describe('calculateDuration', () => {
  it('rechnet eine normale Schicht', () => {
    expect(calculateDuration('09:00', '17:30', 60)).toBe(450);
    expect(calculateDuration('08:00', '16:00', 0)).toBe(480);
  });

  it('schlägt bei einer Nachtschicht über Mitternacht um', () => {
    expect(calculateDuration('22:00', '06:00', 0)).toBe(480);
    expect(calculateDuration('22:00', '06:00', 30)).toBe(450);
    expect(calculateDuration('23:30', '00:30', 0)).toBe(60);
  });

  it('behandelt fehlende Zeiten als 0', () => {
    expect(calculateDuration(null, '17:00', 0)).toBe(0);
    expect(calculateDuration('09:00', null, 0)).toBe(0);
    expect(calculateDuration(null, null, 60)).toBe(0);
  });

  it('ergibt bei gleichem Beginn und Ende 0, nicht 24 Stunden', () => {
    expect(calculateDuration('09:00', '09:00', 0)).toBe(0);
  });

  it('lässt eine überlange Pause nicht negativ werden', () => {
    expect(calculateDuration('09:00', '10:00', 120)).toBe(0);
  });

  it('ignoriert eine negative oder ungültige Pause', () => {
    expect(calculateDuration('09:00', '17:00', -60)).toBe(480);
    expect(calculateDuration('09:00', '17:00', NaN)).toBe(480);
  });
});

describe('formatDuration', () => {
  it('formatiert deutsch als H:MM h', () => {
    expect(formatDuration(450)).toBe('7:30 h');
    expect(formatDuration(480)).toBe('8:00 h');
    expect(formatDuration(5)).toBe('0:05 h');
    expect(formatDuration(1500)).toBe('25:00 h');
  });

  it('fängt 0 und Unsinn ab', () => {
    expect(formatDuration(0)).toBe('0:00 h');
    expect(formatDuration(-10)).toBe('0:00 h');
    expect(formatDuration(NaN)).toBe('0:00 h');
  });
});

describe('formatDurationLong', () => {
  it('schreibt Stunden und Minuten aus', () => {
    expect(formatDurationLong(450)).toBe('7 Std. 30 Min.');
    expect(formatDurationLong(480)).toBe('8 Std.');
    expect(formatDurationLong(30)).toBe('30 Min.');
    expect(formatDurationLong(0)).toBe('0 Std.');
  });
});
