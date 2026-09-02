/**
 * Authentifizierungs- und Sperrlogik für ChronoTrack.
 *
 * Client-seitig implementiert (statische App):
 * - Festes Kennwort: `Admin124578!`
 * - Nach 20 Fehlversuchen wird das Cookie `ct_hacker_blocked=true` gesetzt
 *   und jede weitere Passworteingabe auf diesem Gerät gesperrt.
 */

export const APP_PASSWORD = 'Admin124578!';
export const MAX_FAILED_ATTEMPTS = 20;

export const HACKER_COOKIE_NAME = 'ct_hacker_blocked';
export const ATTEMPTS_STORAGE_KEY = 'chronotrack:failed_attempts';
export const AUTH_STORAGE_KEY = 'chronotrack:auth';
export const AUTH_COOKIE_NAME = 'ct_auth';
export const AUTH_SESSION_KEY = 'chronotrack:session_auth';

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (storage && typeof storage.getItem === 'function') return storage;
  } catch {
    return null;
  }
  return null;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.sessionStorage;
    if (storage && typeof storage.getItem === 'function') return storage;
  } catch {
    return null;
  }
  return null;
}

/** Liest ein Cookie anhand seines Namens aus. */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/** Setzt ein Cookie mit angegebener Gültigkeitsdauer in Tagen (Standard: 3650 Tage = 10 Jahre). */
export function setCookie(name: string, value: string, days = 3650): void {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

/** Entfernt ein Cookie (z.B. für Testläufe). */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Strict`;
}

/**
 * Prüft, ob dieses Gerät dauerhaft als Angreifer/Hacker gesperrt ist.
 * Greift wenn das Cookie `ct_hacker_blocked=true` gesetzt ist oder die Fehlversuche >= 20 sind.
 */
export function isHackerBlocked(): boolean {
  const cookieVal = getCookie(HACKER_COOKIE_NAME);
  if (cookieVal === 'true') {
    return true;
  }

  const attempts = getFailedAttempts();
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    // Cookie nachziehen, falls es gelöscht wurde aber localStorage noch vorhanden ist
    setCookie(HACKER_COOKIE_NAME, 'true');
    return true;
  }

  return false;
}

/** Liest die aktuelle Anzahl fehlerhafter Anmeldeversuche. */
export function getFailedAttempts(): number {
  const storage = getLocalStorage();
  if (!storage) return 0;
  try {
    const raw = storage.getItem(ATTEMPTS_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

/**
 * Protokolliert einen Fehlversuch.
 * Erreicht der Zähler 20, wird das Hacker-Cookie gesetzt und das Gerät blockiert.
 */
export function recordFailedAttempt(): { attempts: number; isBlocked: boolean } {
  const storage = getLocalStorage();
  const current = getFailedAttempts();
  const next = current + 1;

  if (storage) {
    try {
      storage.setItem(ATTEMPTS_STORAGE_KEY, String(next));
    } catch {
      /* Fallback falls localStorage voll */
    }
  }

  const isBlocked = next >= MAX_FAILED_ATTEMPTS;
  if (isBlocked) {
    setCookie(HACKER_COOKIE_NAME, 'true');
  }

  return { attempts: next, isBlocked };
}

/** Setzt die Fehlversuche zurück (z. B. nach erfolgreicher Passworteingabe). */
export function resetFailedAttempts(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(ATTEMPTS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Verifiziert das eingegebene Passwort gegen das feste Kennwort. */
export function verifyPassword(password: string): boolean {
  return password === APP_PASSWORD;
}

/** Prüft, ob der Nutzer auf diesem Gerät dauerhaft authentifiziert ist. */
export function isAuthenticated(): boolean {
  if (isHackerBlocked()) return false;

  // 1. Prüfe Cookie
  if (getCookie(AUTH_COOKIE_NAME) === 'authenticated') {
    return true;
  }

  // 2. Prüfe localStorage
  const storage = getLocalStorage();
  if (storage) {
    try {
      if (storage.getItem(AUTH_STORAGE_KEY) === 'authenticated') {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Fallback: prüfe SessionStorage falls vorher damit eingeloggt
  const session = getSessionStorage();
  if (session) {
    try {
      if (
        session.getItem(AUTH_STORAGE_KEY) === 'authenticated' ||
        session.getItem(AUTH_SESSION_KEY) === 'authenticated'
      ) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  return false;
}

export const AUTH_CHANGE_EVENT = 'chronotrack:auth-change';

/** Setzt oder widerruft den Authentifizierungsstatus dauerhaft (10 Jahre Gültigkeit). */
export function setAuthenticated(authenticated: boolean): void {
  const storage = getLocalStorage();
  const session = getSessionStorage();

  if (authenticated) {
    setCookie(AUTH_COOKIE_NAME, 'authenticated', 3650);
    if (storage) {
      try {
        storage.setItem(AUTH_STORAGE_KEY, 'authenticated');
      } catch {
        /* ignore */
      }
    }
    if (session) {
      try {
        session.setItem(AUTH_STORAGE_KEY, 'authenticated');
      } catch {
        /* ignore */
      }
    }
  } else {
    removeCookie(AUTH_COOKIE_NAME);
    if (storage) {
      try {
        storage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    if (session) {
      try {
        session.removeItem(AUTH_STORAGE_KEY);
        session.removeItem(AUTH_SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

/** Meldet den Nutzer ab und sperrt die Ansicht. */
export function logout(): void {
  setAuthenticated(false);
}
