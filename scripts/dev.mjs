/**
 * Startet den Next-Dev-Server und entfernt vorher ein kaputtes globales
 * `localStorage`.
 *
 * Hintergrund: Node 25 stellt serverseitig ein globales `localStorage`-Objekt
 * bereit, dessen Methoden aber fehlen, solange kein `--localstorage-file`
 * gesetzt ist:
 *
 *     typeof localStorage          -> 'object'
 *     typeof localStorage.getItem  -> 'undefined'
 *
 * Next' Dev-Overlay prüft an mehreren Stellen nur `typeof localStorage !==
 * 'undefined'` und ruft dann `getItem` auf (react-dev-overlay/.../preferences.js
 * Zeile 68, shadow-portal.js Zeile 29). Beim Rendern auf dem Server wirft das,
 * und jede Seite antwortet im Dev-Modus mit 500 — auch ohne jeden App-Code.
 *
 * Betroffen ist ausschließlich `next dev` unter Node >= 25. `next build` läuft
 * durch, und die CI nutzt Node 20. Serverseitig soll es gar kein localStorage
 * geben; das Entfernen stellt genau den erwarteten Zustand her.
 *
 * Der eigentliche Dev-Server läuft in einem Kindprozess, deshalb wird das
 * Preload-Modul über NODE_OPTIONS vererbt statt hier direkt angewendet.
 *
 * Sobald Next die Aufrufe absichert oder Node das Verhalten ändert, kann dieses
 * Skript ersatzlos entfallen (dev-Skript dann wieder auf `next dev`).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const NODE_MAJOR = Number(process.versions.node.split('.')[0]);

if (NODE_MAJOR >= 25) {
  const storage = globalThis.localStorage;
  if (storage && typeof storage.getItem !== 'function') {
    // Forward Slashes: NODE_OPTIONS wird wie eine Kommandozeile zerlegt und
    // deutet Backslashes als Escape-Zeichen -- ein Windows-Pfad käme verstümmelt an.
    const preload = path
      .join(path.dirname(fileURLToPath(import.meta.url)), 'strip-node25-localstorage.cjs')
      .replace(/\\/g, '/');

    delete globalThis.localStorage;
    process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--require "${preload}"`]
      .filter(Boolean)
      .join(' ');

    console.log(
      `[dev] Node ${process.versions.node}: unvollständiges globales localStorage entfernt ` +
        '(siehe scripts/dev.mjs).'
    );
  }
}

await import('next/dist/bin/next');
