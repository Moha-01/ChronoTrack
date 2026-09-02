/**
 * Datei-Download und -Auswahl, rein clientseitig.
 *
 * `output: 'export'` erlaubt keinen Server — es gibt also keinen Upload-Endpoint
 * und keine serverseitige Dateierzeugung. Alles läuft über Blob und File API.
 *
 * Die iOS-Eigenheiten sind hier bewusst zentralisiert:
 *  - Blob und Share müssen **synchron in der Klick-Geste** entstehen; aus einem
 *    `await`-Fortsetzungspunkt heraus blockiert Safari beides.
 *  - `URL.revokeObjectURL` darf nicht sofort laufen, sonst bricht der Download ab.
 */

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

/**
 * Bietet den Text als Datei an. **Synchron aus dem Klick-Handler aufrufen.**
 *
 * Auf iOS öffnet sich das Teilen-Menü ("In Dateien sichern"), sonst wird ein
 * klassischer Download ausgelöst.
 */
export function downloadTextFile(text: string, filename: string, mimeType = 'application/json') {
  const blob = new Blob([text], { type: mimeType });

  const shareApi = typeof navigator !== 'undefined' ? navigator : undefined;
  if (shareApi?.canShare && typeof File !== 'undefined') {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (shareApi.canShare({ files: [file] })) {
        shareApi
          .share({ files: [file], title: 'ChronoTrack Sicherung' })
          .catch((error: unknown) => {
            // Abbruch durch den Nutzer ist kein Fehler — dann nichts tun.
            if (isAbortError(error)) return;
            anchorDownload(blob, filename);
          });
        return;
      }
    } catch {
      /* File-Konstruktor oder canShare nicht verfügbar → Fallback */
    }
  }

  anchorDownload(blob, filename);
}

function anchorDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Sofortiges Freigeben bricht den Download auf iOS ab.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export type ReadFileResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function readTextFile(file: File): Promise<ReadFileResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'Die Datei ist zu groß (maximal 20 MB).' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Die Datei ist leer.' };
  }

  try {
    if (typeof file.text === 'function') {
      return { ok: true, text: await file.text() };
    }
    return { ok: true, text: await readViaFileReader(file) };
  } catch {
    return { ok: false, error: 'Die Datei konnte nicht gelesen werden.' };
  }
}

/** Fallback für ältere Safari-Versionen ohne `Blob.text()`. */
function readViaFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
