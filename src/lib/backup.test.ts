import { describe, it, expect } from 'vitest';
import {
  backupFilename,
  countEntries,
  createBackup,
  mergeBackup,
  parseBackup,
  replaceWithBackup,
  serializeBackup,
} from '@/lib/backup';
import type { ChronoTrackData, Employee, TimeEntry } from '@/lib/types';

function employee(id: string, name: string): Employee {
  return { id, name, createdAt: '2026-01-01T00:00:00.000Z' };
}

function entry(over: Partial<TimeEntry> & { id: string }): TimeEntry {
  const day = Number(over.id.slice(8, 10));
  return {
    day,
    project: '',
    begin: '09:00',
    end: '17:00',
    pause: 0,
    total: 480,
    ...over,
  };
}

function data(over: Partial<ChronoTrackData> = {}): ChronoTrackData {
  return {
    schemaVersion: 1,
    employees: [employee('e_anna', 'Anna')],
    entries: {
      e_anna: { '2026-01-05': entry({ id: '2026-01-05', project: 'Halle 3' }) },
    },
    updatedAt: '2026-01-31T12:00:00.000Z',
    ...over,
  };
}

describe('Export', () => {
  it('erzeugt eine vollständige, versionierte Hülle', () => {
    const backup = createBackup(data(), new Date('2026-07-28T20:11:03.412Z'));

    expect(backup.format).toBe('chronotrack.backup');
    expect(backup.formatVersion).toBe(1);
    expect(backup.schemaVersion).toBe(1);
    expect(backup.exportedAt).toBe('2026-07-28T20:11:03.412Z');
    expect(backup.counts).toEqual({ employees: 1, entries: 1 });
  });

  it('baut einen sortierbaren Dateinamen mit Zeitstempel', () => {
    expect(backupFilename(new Date(2026, 6, 28, 22, 11))).toBe(
      'chronotrack-backup-2026-07-28-2211.json'
    );
  });
});

describe('Round-Trip', () => {
  it('überlebt Export → Serialisieren → Parsen unverändert', () => {
    const original = data();
    const text = serializeBackup(createBackup(original));
    const result = parseBackup(text);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.employees).toEqual(original.employees);
    expect(result.payload.entries).toEqual(original.entries);
    expect(result.repairs.totalsRecomputed).toBe(0);
    expect(result.repairs.idsFixed).toBe(0);

    // Ersetzen muss den Ausgangszustand exakt wiederherstellen.
    const restored = replaceWithBackup(result.payload);
    expect(restored.employees).toEqual(original.employees);
    expect(restored.entries).toEqual(original.entries);
  });
});

describe('Import-Validierung', () => {
  it('lehnt kaputtes JSON ab', () => {
    const result = parseBackup('{ nope');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('konnte nicht gelesen werden');
  });

  it('lehnt eine fremde JSON-Datei ab und nennt die Stellen', () => {
    const result = parseBackup(JSON.stringify({ hello: 'world' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('Diese Datei ist keine ChronoTrack-Sicherung.');
    expect(result.issues?.length).toBeGreaterThan(0);
  });

  it('erkennt und importiert Rohdaten-Backups aus der früheren Version (main)', () => {
    const legacyJson = JSON.stringify({
      format: 'chronotrack.legacy-raw',
      migratedAt: '2026-08-01T10:00:00.000Z',
      'chronotrack-employees': JSON.stringify(['Max Mustermann', 'Erika Musterfrau']),
      'chronotrack-entries': JSON.stringify({
        'Max Mustermann': {
          '2026-08-1': {
            id: '2026-08-1',
            day: 1,
            project: 'Projekt Alt',
            begin: '08:00',
            end: '16:30',
            pause: 30,
            total: 480,
          },
        },
      }),
    });

    const result = parseBackup(legacyJson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.employees.length).toBe(2);
    expect(result.payload.employees[0].name).toBe('Max Mustermann');
    expect(result.payload.employees[1].name).toBe('Erika Musterfrau');

    // Prüfe, ob Datumsschlüssel gepolstert wurde
    const maxId = result.payload.employees[0].id;
    expect(result.payload.entries[maxId]?.['2026-08-01']).toBeDefined();
    expect(result.payload.entries[maxId]?.['2026-08-01'].project).toBe('Projekt Alt');
  });

  it('lehnt eine Sicherung aus einer neueren Version ab', () => {
    const backup = createBackup(data());
    const result = parseBackup(JSON.stringify({ ...backup, schemaVersion: 99 }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('neueren Version');
  });

  it('lehnt eine leere Sicherung ab', () => {
    const empty = createBackup({
      schemaVersion: 1,
      employees: [],
      entries: {},
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const result = parseBackup(serializeBackup(empty));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('keine Daten');
  });

  it('rettet ein Backup, bei dem ein einzelner Skalar kaputt ist', () => {
    const backup = createBackup(data());
    // pause absichtlich zerstören
    (backup.payload.entries.e_anna['2026-01-05'] as unknown as Record<string, unknown>).pause =
      'viel';

    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.entries.e_anna['2026-01-05'].pause).toBe(0);
  });
});

describe('Import-Reparatur', () => {
  it('rechnet ein falsches total neu und zählt das', () => {
    const backup = createBackup(data());
    backup.payload.entries.e_anna['2026-01-05'].total = 9999;

    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.entries.e_anna['2026-01-05'].total).toBe(480);
    expect(result.repairs.totalsRecomputed).toBe(1);
  });

  it('synchronisiert id und day mit dem Schlüssel', () => {
    const backup = createBackup(data());
    backup.payload.entries.e_anna['2026-01-05'].id = 'falsch';
    backup.payload.entries.e_anna['2026-01-05'].day = 99;

    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fixed = result.payload.entries.e_anna['2026-01-05'];
    expect(fixed.id).toBe('2026-01-05');
    expect(fixed.day).toBe(5);
    expect(result.repairs.idsFixed).toBe(1);
    expect(result.repairs.daysFixed).toBe(1);
  });

  it('legt für Einträge ohne Mitarbeiter einen Platzhalter an, statt sie zu verwerfen', () => {
    const backup = createBackup(data());
    backup.payload.entries['e_geist'] = {
      '2026-01-06': entry({ id: '2026-01-06', project: 'wichtig' }),
    };

    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.repairs.orphanEmployeesCreated).toBe(1);
    expect(result.payload.entries['e_geist']['2026-01-06'].project).toBe('wichtig');
    expect(result.payload.employees.map((e) => e.name)).toContain('Unbekannt (importiert)');
  });

  it('polstert einen ungepolsterten Schlüssel auf', () => {
    const backup = createBackup(data());
    backup.payload.entries.e_anna = {
      '2026-1-5': entry({ id: '2026-1-5', day: 5, project: 'alt' }),
    };

    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.payload.entries.e_anna)).toEqual(['2026-01-05']);
    expect(result.repairs.keysNormalized).toBe(1);
  });
});

describe('mergeBackup — Identitätsauflösung', () => {
  it('Regel 1: gleiche ID und gleicher Name → dieselbe Person', () => {
    const current = data();
    const { data: merged, report } = mergeBackup(
      current,
      {
        employees: [employee('e_anna', 'Anna')],
        entries: { e_anna: { '2026-01-06': entry({ id: '2026-01-06' }) } },
      },
      'incoming-wins'
    );

    expect(report.employeesMatched).toBe(1);
    expect(report.employeesAdded).toBe(0);
    expect(merged.employees).toHaveLength(1);
    expect(Object.keys(merged.entries.e_anna).sort()).toEqual(['2026-01-05', '2026-01-06']);
  });

  it('Regel 1: der lokale Name gewinnt bei gleicher ID', () => {
    const current = data({ employees: [employee('e_anna', 'Anna Neu')] });
    const { data: merged } = mergeBackup(
      current,
      { employees: [employee('e_anna', 'Anna Alt')], entries: {} },
      'incoming-wins'
    );

    expect(merged.employees[0].name).toBe('Anna Neu');
  });

  it('Regel 2: gleicher Name bei anderer ID wird zusammengeführt statt dupliziert', () => {
    // Der reale Fall: zwei Geräte haben unabhängig von v0 migriert und dabei
    // je eigene IDs vergeben.
    const current = data();
    const { data: merged, report } = mergeBackup(
      current,
      {
        employees: [employee('e_anderesGeraet', 'anna')], // andere ID, andere Schreibweise
        entries: { e_anderesGeraet: { '2026-01-07': entry({ id: '2026-01-07' }) } },
      },
      'incoming-wins'
    );

    expect(report.employeesMatched).toBe(1);
    expect(report.employeesAdded).toBe(0);
    expect(merged.employees).toHaveLength(1);
    // Einträge landen unter der lokalen ID
    expect(Object.keys(merged.entries.e_anna).sort()).toEqual(['2026-01-05', '2026-01-07']);
    expect(merged.entries.e_anderesGeraet).toBeUndefined();
  });

  it('Regel 3: gleiche ID bei anderem Namen wird als andere Person behandelt', () => {
    const current = data();
    const { data: merged, report } = mergeBackup(
      current,
      {
        employees: [employee('e_anna', 'Bert')],
        entries: { e_anna: { '2026-01-08': entry({ id: '2026-01-08' }) } },
      },
      'incoming-wins'
    );

    expect(report.employeesAdded).toBe(1);
    expect(report.employeesRenamedOnConflict).toBe(1);
    expect(merged.employees).toHaveLength(2);
    expect(merged.employees[1].name).toBe('Bert (importiert)');
    // Annas Bestand bleibt unangetastet
    expect(Object.keys(merged.entries.e_anna)).toEqual(['2026-01-05']);
  });

  it('Regel 4: unbekannte Person wird angelegt', () => {
    const current = data();
    const { data: merged, report } = mergeBackup(
      current,
      {
        employees: [employee('e_carla', 'Carla')],
        entries: { e_carla: { '2026-01-09': entry({ id: '2026-01-09' }) } },
      },
      'incoming-wins'
    );

    expect(report.employeesAdded).toBe(1);
    expect(merged.employees.map((e) => e.name)).toEqual(['Anna', 'Carla']);
    expect(merged.entries.e_carla['2026-01-09']).toBeDefined();
  });
});

describe('mergeBackup — Konfliktmodi', () => {
  const incoming = {
    employees: [employee('e_anna', 'Anna')],
    entries: {
      e_anna: { '2026-01-05': entry({ id: '2026-01-05', project: 'IMPORTIERT' }) },
    },
  };

  it('incoming-wins überschreibt den gleichen Tag', () => {
    const { data: merged, report } = mergeBackup(data(), incoming, 'incoming-wins');

    expect(merged.entries.e_anna['2026-01-05'].project).toBe('IMPORTIERT');
    expect(report.entriesOverwritten).toBe(1);
    expect(report.entriesSkipped).toBe(0);
  });

  it('local-wins ergänzt nur fehlende Tage', () => {
    const { data: merged, report } = mergeBackup(data(), incoming, 'local-wins');

    expect(merged.entries.e_anna['2026-01-05'].project).toBe('Halle 3');
    expect(report.entriesOverwritten).toBe(0);
    expect(report.entriesSkipped).toBe(1);
  });

  it('verändert den Ausgangsbestand nicht (reine Funktion)', () => {
    const current = data();
    const snapshot = JSON.parse(JSON.stringify(current));

    mergeBackup(current, incoming, 'incoming-wins');

    expect(current).toEqual(snapshot);
  });

  it('liefert bei identischem Aufruf identische Zahlen — Vorschau == Ausführung', () => {
    const current = data();
    const preview = mergeBackup(current, incoming, 'incoming-wins');
    const actual = mergeBackup(current, incoming, 'incoming-wins');

    expect(actual.report).toEqual(preview.report);
    expect(actual.data.entries).toEqual(preview.data.entries);
  });
});

describe('countEntries', () => {
  it('zählt über alle Mitarbeiter hinweg', () => {
    expect(
      countEntries({
        a: { '2026-01-01': entry({ id: '2026-01-01' }) },
        b: {
          '2026-01-01': entry({ id: '2026-01-01' }),
          '2026-01-02': entry({ id: '2026-01-02' }),
        },
      })
    ).toBe(3);
  });
});
