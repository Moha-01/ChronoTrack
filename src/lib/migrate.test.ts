import { describe, it, expect } from 'vitest';
import { migrateV0toV1 } from '@/lib/migrate';
import type { LegacyTimeEntry } from '@/lib/types';

function legacyEntry(over: Partial<LegacyTimeEntry> & { id: string; day: number }): LegacyTimeEntry {
  return {
    project: '',
    begin: '00:00',
    end: '00:00',
    pause: 0,
    total: 0,
    ...over,
  };
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('migrateV0toV1', () => {
  it('legt Mitarbeiter mit stabilen IDs an und behält die Reihenfolge', () => {
    const { data, report } = migrateV0toV1(
      JSON.stringify(['Anna Beispiel', 'Bert Muster', 'Carla Test']),
      null
    );

    expect(data.employees.map((e) => e.name)).toEqual([
      'Anna Beispiel',
      'Bert Muster',
      'Carla Test',
    ]);
    expect(new Set(data.employees.map((e) => e.id)).size).toBe(3);
    expect(report.employees).toBe(3);
    expect(data.schemaVersion).toBe(1);
  });

  it('polstert einstellige Tagesschlüssel auf', () => {
    const { data } = migrateV0toV1(
      JSON.stringify(['Anna']),
      JSON.stringify({
        Anna: {
          '2026-01-9': legacyEntry({
            id: '2026-01-9',
            day: 9,
            project: 'Halle 3',
            begin: '08:00',
            end: '16:30',
            pause: 30,
            total: 480,
          }),
        },
      })
    );

    const id = data.employees[0].id;
    expect(Object.keys(data.entries[id])).toEqual(['2026-01-09']);
    const entry = data.entries[id]['2026-01-09'];
    expect(entry.id).toBe('2026-01-09');
    expect(entry.day).toBe(9);
    expect(entry.project).toBe('Halle 3');
    expect(entry.total).toBe(480);
  });

  it('löst eine Kollision aus gepolstertem und ungepolstertem Schlüssel zugunsten des größeren total auf', () => {
    const { data, report } = migrateV0toV1(
      JSON.stringify(['Anna']),
      JSON.stringify({
        Anna: {
          '2026-01-9': legacyEntry({
            id: '2026-01-9',
            day: 9,
            project: 'wenig',
            begin: '09:00',
            end: '12:00',
            pause: 0,
            total: 180,
          }),
          '2026-01-09': legacyEntry({
            id: '2026-01-09',
            day: 9,
            project: 'viel',
            begin: '08:00',
            end: '17:00',
            pause: 0,
            total: 540,
          }),
        },
      })
    );

    const id = data.employees[0].id;
    expect(report.keyCollisions).toBe(1);
    expect(Object.keys(data.entries[id])).toEqual(['2026-01-09']);
    expect(data.entries[id]['2026-01-09'].project).toBe('viel');
    expect(data.entries[id]['2026-01-09'].total).toBe(540);
  });

  describe('Sentinel-Bereinigung', () => {
    it('macht aus 00:00/00:00 mit total 0 zwei null-Werte', () => {
      const { data, report } = migrateV0toV1(
        JSON.stringify(['Anna']),
        JSON.stringify({
          Anna: { '2026-01-05': legacyEntry({ id: '2026-01-05', day: 5 }) },
        })
      );

      const entry = data.entries[data.employees[0].id]['2026-01-05'];
      expect(entry.begin).toBeNull();
      expect(entry.end).toBeNull();
      expect(entry.total).toBe(0);
      expect(report.sentinelsCleared).toBe(2);
    });

    it('erzeugt aus 09:00 → 00:00 (total 0) KEINEN 15-Stunden-Tag', () => {
      const { data } = migrateV0toV1(
        JSON.stringify(['Anna']),
        JSON.stringify({
          Anna: {
            '2026-01-06': legacyEntry({
              id: '2026-01-06',
              day: 6,
              begin: '09:00',
              end: '00:00',
              total: 0,
            }),
          },
        })
      );

      const entry = data.entries[data.employees[0].id]['2026-01-06'];
      expect(entry.begin).toBe('09:00');
      expect(entry.end).toBeNull();
      expect(entry.total).toBe(0);
    });

    it('lässt einen echten Mitternachtsbeginn 00:00 → 08:00 unangetastet', () => {
      const { data, report } = migrateV0toV1(
        JSON.stringify(['Anna']),
        JSON.stringify({
          Anna: {
            '2026-01-07': legacyEntry({
              id: '2026-01-07',
              day: 7,
              begin: '00:00',
              end: '08:00',
              pause: 0,
              total: 480,
            }),
          },
        })
      );

      const entry = data.entries[data.employees[0].id]['2026-01-07'];
      expect(entry.begin).toBe('00:00');
      expect(entry.end).toBe('08:00');
      expect(entry.total).toBe(480);
      expect(report.sentinelsCleared).toBe(0);
    });
  });

  it('rechnet eine Nachtschicht neu, die v0 als 0 gespeichert hatte', () => {
    const { data } = migrateV0toV1(
      JSON.stringify(['Anna']),
      JSON.stringify({
        Anna: {
          '2026-01-08': legacyEntry({
            id: '2026-01-08',
            day: 8,
            begin: '22:00',
            end: '06:00',
            pause: 30,
            total: 0, // v0 lieferte hier fälschlich 0
          }),
        },
      })
    );

    expect(data.entries[data.employees[0].id]['2026-01-08'].total).toBe(450);
  });

  it('rettet Einträge, deren Mitarbeiter nicht in der Liste steht', () => {
    const { data, report } = migrateV0toV1(
      JSON.stringify(['Anna']),
      JSON.stringify({
        Anna: { '2026-01-05': legacyEntry({ id: '2026-01-05', day: 5, project: 'A' }) },
        Verwaist: {
          '2026-01-05': legacyEntry({ id: '2026-01-05', day: 5, project: 'wichtig' }),
        },
      })
    );

    expect(report.recoveredOrphans).toBe(1);
    expect(data.employees.map((e) => e.name)).toEqual(['Anna', 'Verwaist']);

    const orphanId = data.employees[1].id;
    expect(data.entries[orphanId]['2026-01-05'].project).toBe('wichtig');
  });

  describe('defekte Rohdaten', () => {
    it('zerstört bei kaputtem employees-JSON nicht die Einträge', () => {
      const { data, report } = migrateV0toV1(
        '{ das ist kein json',
        JSON.stringify({
          Anna: {
            '2026-01-05': legacyEntry({
              id: '2026-01-05',
              day: 5,
              project: 'gerettet',
              begin: '08:00',
              end: '16:00',
              total: 480,
            }),
          },
        })
      );

      expect(report.parseErrors).toEqual(['employees']);
      expect(data.employees).toHaveLength(1);
      expect(data.employees[0].name).toBe('Anna');
      expect(data.entries[data.employees[0].id]['2026-01-05'].project).toBe('gerettet');
    });

    it('zerstört bei kaputtem entries-JSON nicht die Mitarbeiter', () => {
      const { data, report } = migrateV0toV1(JSON.stringify(['Anna', 'Bert']), 'null}{');

      expect(report.parseErrors).toEqual(['entries']);
      expect(data.employees.map((e) => e.name)).toEqual(['Anna', 'Bert']);
      expect(data.entries).toEqual({});
    });

    it('kommt mit komplett leerem Speicher klar', () => {
      const { data, report } = migrateV0toV1(null, null);
      expect(data.employees).toEqual([]);
      expect(data.entries).toEqual({});
      expect(report.parseErrors).toEqual([]);
    });

    it('rekonstruiert den Tag aus entry.day, wenn der Schlüssel unbrauchbar ist', () => {
      const { data, report } = migrateV0toV1(
        JSON.stringify(['Anna']),
        JSON.stringify({
          Anna: {
            '2026-01-kaputt': legacyEntry({
              id: '2026-01-kaputt',
              day: 14,
              project: 'gerettet',
              begin: '08:00',
              end: '16:00',
              total: 480,
            }),
          },
        })
      );

      expect(report.unrecoverableEntries).toBe(0);
      expect(data.entries[data.employees[0].id]['2026-01-14'].project).toBe('gerettet');
    });

    it('zählt einen völlig unrettbaren Eintrag, statt ihn stumm zu schlucken', () => {
      const { data, report } = migrateV0toV1(
        JSON.stringify(['Anna']),
        JSON.stringify({
          Anna: { unsinn: legacyEntry({ id: 'unsinn', day: 0 }) },
        })
      );

      expect(report.unrecoverableEntries).toBe(1);
      expect(data.entries).toEqual({});
    });
  });

  describe('Invarianten über einen realistischen Monat', () => {
    const names = ['Anna Beispiel', 'Bert Muster'];
    const entries: Record<string, Record<string, LegacyTimeEntry>> = {};
    let expectedEntryCount = 0;

    for (const name of names) {
      entries[name] = {};
      for (let day = 1; day <= 31; day++) {
        const date = new Date(2026, 0, day);
        const weekend = date.getDay() === 0 || date.getDay() === 6;
        // v0 erzeugte ungepolsterte Schlüssel
        const key = `2026-01-${day}`;
        entries[name][key] = weekend
          ? legacyEntry({ id: key, day })
          : legacyEntry({
              id: key,
              day,
              project: `Projekt ${day}`,
              begin: '09:00',
              end: '17:30',
              pause: 60,
              total: 450,
            });
        expectedEntryCount += 1;
      }
    }

    const { data, report } = migrateV0toV1(JSON.stringify(names), JSON.stringify(entries));

    it('erhält die Mitarbeiterzahl', () => {
      expect(report.employees).toBe(2);
      expect(data.employees).toHaveLength(2);
    });

    it('erhält die Eintragszahl abzüglich Kollisionen', () => {
      expect(report.keyCollisions).toBe(0);
      expect(report.entries).toBe(expectedEntryCount);
    });

    it('erhält die Summe aller Minuten', () => {
      const sumBefore = Object.values(entries)
        .flatMap((byDay) => Object.values(byDay))
        .reduce((acc, e) => acc + e.total, 0);
      const sumAfter = Object.values(data.entries)
        .flatMap((byDay) => Object.values(byDay))
        .reduce((acc, e) => acc + e.total, 0);

      expect(sumAfter).toBe(sumBefore);
    });

    it('erzeugt ausschließlich gepolsterte Schlüssel, mit id und day synchron', () => {
      for (const byDay of Object.values(data.entries)) {
        for (const [key, entry] of Object.entries(byDay)) {
          expect(key).toMatch(DAY_KEY_RE);
          expect(entry.id).toBe(key);
          expect(entry.day).toBe(Number(key.slice(8, 10)));
        }
      }
    });

    it('lässt jeden Projektnamen unverändert', () => {
      const before = Object.values(entries)
        .flatMap((byDay) => Object.values(byDay))
        .map((e) => e.project)
        .sort();
      const after = Object.values(data.entries)
        .flatMap((byDay) => Object.values(byDay))
        .map((e) => e.project)
        .sort();

      expect(after).toEqual(before);
    });
  });
});
