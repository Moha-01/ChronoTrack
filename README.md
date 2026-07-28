# ChronoTrack

Monatliche Arbeitszeiterfassung für Mitarbeiter. Läuft vollständig im Browser —
kein Server, kein Konto, keine Datenübertragung.

Live: https://moha-01.github.io/ChronoTrack/

## Funktionen

- Mitarbeiter anlegen, umbenennen, löschen (mit Rückgängig)
- Monatsnachweis pro Mitarbeiter: Objekt/Projekt, Beginn, Ende, Pause
- Automatische Summen je Tag, Woche und Monat; Nachtschichten über Mitternacht
  werden korrekt gerechnet
- PDF-Bericht im A4-Format zum Ausdrucken und Unterschreiben
- **Sicherung als JSON** — Export, Import mit Vorschau, Merge oder Ersetzen
- Hell/Dunkel/System, installierbar als App (PWA)

## Wichtig: Daten liegen nur lokal

Alle Daten stehen im `localStorage` dieses einen Browsers. Sie werden nirgendwo
hochgeladen — und sind weg, wenn der Browserspeicher geleert wird oder das
Gerät wechselt. Safari räumt den Speicher zudem nach längerer Inaktivität auf.

**Die JSON-Sicherung unter „Daten & Einstellungen" ist die einzige Absicherung.**

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:9002
npm run typecheck
npm run test
npm run build      # statischer Export nach out/
```

### Produktionsstand lokal nachstellen

Auf GitHub Pages liegt die App unter dem Pfad `/ChronoTrack`. Der basePath
steckt in `next.config.ts` und wird über eine Umgebungsvariable aktiviert:

```bash
GITHUB_PAGES=true npm run build
```

Ohne diesen Schritt bleiben basePath-Fehler bis zum Deploy unsichtbar, weil der
Dev-Server ohne Präfix läuft.

### Node-Version

Die CI nutzt Node 20. Unter Node ≥ 25 gibt es serverseitig ein unvollständiges
globales `localStorage`, über das Next' Dev-Overlay stolpert — `npm run dev`
würde sonst mit HTTP 500 antworten. `scripts/dev.mjs` entschärft das; Details
stehen dort im Kopfkommentar.

## Aufbau

```
src/app/                Routen: / (Mitarbeiter), /tracker, /settings
src/components/
  layout/               Kopfzeile, Grundgerüst, Theme-Umschalter
  employees/            Liste, Anlegen, Umbenennen, Löschen
  tracker/              Monatsauswahl, Tabelle (Desktop), Karten (Mobil)
  report/               PDF-Erzeugung und A4-Layout
  data/                 Sicherung, Import, Beispieldaten
  ui/                   shadcn/ui-Bausteine
src/lib/
  types.ts              Datenmodell (Schema-Version 1)
  storage.ts            localStorage, entprelltes Schreiben
  migrate.ts            verlustfreie Migration vom Altformat
  backup.ts             Export, Validierung, Zusammenführen
  date-keys.ts          Tages- und Monatsschlüssel
```

### Routing und statischer Export

Die App wird als statisches HTML exportiert (`output: 'export'`). Dynamische
Routen-Segmente wie `/tracker/[id]` sind damit nicht möglich, weil
Mitarbeiter-IDs erst zur Laufzeit im Browser entstehen und nicht vorgerendert
werden können. Die Identität steht deshalb im Query-String:
`/tracker?e=<id>&m=<yyyy-MM>`.

Navigation läuft ausschließlich über `next/link` und `useRouter` — nur so wird
der basePath automatisch vorangestellt.

### Datenformat

`localStorage`-Schlüssel `chronotrack:v1`:

```jsonc
{
  "schemaVersion": 1,
  "employees": [{ "id": "e_…", "name": "…", "createdAt": "…" }],
  "entries": {
    "e_…": {
      "2026-07-09": {
        "id": "2026-07-09", "day": 9, "project": "…",
        "begin": "09:00", "end": "17:30",  // null = nicht erfasst
        "pause": 60, "total": 450          // Minuten
      }
    }
  }
}
```

Beim ersten Start nach dem Umbau werden Daten aus dem Altformat einmalig
migriert. Die ursprünglichen Rohdaten bleiben unter `chronotrack:v0-backup`
liegen.
