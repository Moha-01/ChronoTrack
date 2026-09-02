/**
 * Erzeugt eine stabile, kollisionsarme Mitarbeiter-ID.
 *
 * Vor v1 war der Mitarbeitername der Speicherschlüssel — dadurch war Umbenennen
 * unmöglich und zwei gleichnamige Personen kollidierten. Diese ID entkoppelt das.
 */
export function createId(prefix = 'e'): string {
  return `${prefix}_${randomHex(10)}`;
}

function randomHex(length: number): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  // Bevorzugt: randomUUID. Braucht einen sicheren Kontext — localhost und
  // GitHub Pages (HTTPS) erfüllen das, daher ist das praktisch immer der Pfad.
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID().replace(/-/g, '').slice(0, length);
  }

  // Fallback für ältere Safari-Versionen.
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length);
  }

  // Letzte Rettung — nur relevant, wenn die Crypto-API komplett fehlt.
  let out = '';
  while (out.length < length) {
    out += Math.random().toString(16).slice(2);
  }
  return out.slice(0, length);
}
