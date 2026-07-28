/**
 * Preload-Modul: entfernt ein unvollständiges globales `localStorage`.
 *
 * Wird über NODE_OPTIONS=--require geladen, damit es auch in den von Next
 * gestarteten Kindprozessen greift (der eigentliche Dev-Server läuft in
 * next/dist/server/lib/start-server.js). Erklärung siehe scripts/dev.mjs.
 */
const major = Number(process.versions.node.split('.')[0]);

if (major >= 25) {
  const storage = globalThis.localStorage;
  if (storage && typeof storage.getItem !== 'function') {
    delete globalThis.localStorage;
  }
}
