import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  APP_PASSWORD,
  MAX_FAILED_ATTEMPTS,
  HACKER_COOKIE_NAME,
  verifyPassword,
  getFailedAttempts,
  recordFailedAttempt,
  resetFailedAttempts,
  isHackerBlocked,
  setCookie,
  getCookie,
  removeCookie,
  isAuthenticated,
  setAuthenticated,
  logout,
} from './auth';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('auth helper', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  let mockLocalStorage: MemoryStorage;
  let mockSessionStorage: MemoryStorage;
  let cookieStore: Map<string, string>;

  beforeEach(() => {
    mockLocalStorage = new MemoryStorage();
    mockSessionStorage = new MemoryStorage();
    cookieStore = new Map();

    const mockDoc = {
      get cookie() {
        return Array.from(cookieStore.entries())
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('; ');
      },
      set cookie(val: string) {
        const [pair] = val.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx !== -1) {
          const key = decodeURIComponent(pair.slice(0, eqIdx).trim());
          const value = decodeURIComponent(pair.slice(eqIdx + 1).trim());
          if (val.includes('max-age=0')) {
            cookieStore.delete(key);
          } else {
            cookieStore.set(key, value);
          }
        }
      },
    };

    const mockWin = {
      localStorage: mockLocalStorage,
      sessionStorage: mockSessionStorage,
      document: mockDoc,
      dispatchEvent: () => true,
    };

    const target = globalThis as unknown as {
      window: unknown;
      document: unknown;
      localStorage: unknown;
    };

    target.window = mockWin;
    target.document = mockDoc;
    target.localStorage = mockLocalStorage;
  });

  afterEach(() => {
    const target = globalThis as unknown as {
      window: unknown;
      document: unknown;
      localStorage: unknown;
    };

    target.window = originalWindow;
    target.document = originalDocument;
    target.localStorage = originalLocalStorage;
  });

  describe('verifyPassword', () => {
    it('succeeds for the correct fixed password Admin124578!', () => {
      expect(verifyPassword('Admin124578!')).toBe(true);
      expect(APP_PASSWORD).toBe('Admin124578!');
    });

    it('rejects wrong passwords', () => {
      expect(verifyPassword('admin124578!')).toBe(false);
      expect(verifyPassword('123456')).toBe(false);
      expect(verifyPassword('')).toBe(false);
      expect(verifyPassword('Admin124578')).toBe(false);
    });
  });

  describe('cookie helpers', () => {
    it('sets and gets cookies correctly', () => {
      expect(getCookie('test_cookie')).toBeNull();
      setCookie('test_cookie', 'test_value');
      expect(getCookie('test_cookie')).toBe('test_value');
      removeCookie('test_cookie');
      expect(getCookie('test_cookie')).toBeNull();
    });
  });

  describe('failed attempts and hacker lockout', () => {
    it('starts with 0 failed attempts and not blocked', () => {
      expect(getFailedAttempts()).toBe(0);
      expect(isHackerBlocked()).toBe(false);
    });

    it('increments failed attempts without blocking before 20 attempts', () => {
      for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
        const res = recordFailedAttempt();
        expect(res.attempts).toBe(i);
        expect(res.isBlocked).toBe(false);
        expect(getFailedAttempts()).toBe(i);
        expect(isHackerBlocked()).toBe(false);
        expect(getCookie(HACKER_COOKIE_NAME)).toBeNull();
      }
    });

    it('blocks on the 20th failed attempt and sets hacker cookie', () => {
      for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }

      const res20 = recordFailedAttempt();
      expect(res20.attempts).toBe(20);
      expect(res20.isBlocked).toBe(true);
      expect(isHackerBlocked()).toBe(true);

      // Verify the cookie is set
      expect(getCookie(HACKER_COOKIE_NAME)).toBe('true');
    });

    it('remains blocked on subsequent attempts and keeps the cookie', () => {
      for (let i = 1; i <= 25; i++) {
        recordFailedAttempt();
      }
      expect(isHackerBlocked()).toBe(true);
      expect(getCookie(HACKER_COOKIE_NAME)).toBe('true');
    });

    it('detects blocked state if cookie was already present', () => {
      setCookie(HACKER_COOKIE_NAME, 'true');
      expect(isHackerBlocked()).toBe(true);
    });

    it('resets failed attempts when requested', () => {
      recordFailedAttempt();
      recordFailedAttempt();
      expect(getFailedAttempts()).toBe(2);

      resetFailedAttempts();
      expect(getFailedAttempts()).toBe(0);
    });
  });

  describe('persistent authentication', () => {
    it('tracks authentication in localStorage and cookie permanently', () => {
      expect(isAuthenticated()).toBe(false);

      setAuthenticated(true);
      expect(isAuthenticated()).toBe(true);

      // Simuliere Schließen des Browser-Tabs (sessionStorage gelöscht)
      mockSessionStorage.clear();
      // Bleibt dank localStorage und Cookie weiterhin angemeldet!
      expect(isAuthenticated()).toBe(true);

      // Logout entfernt die Berechtigung
      logout();
      expect(isAuthenticated()).toBe(false);
    });

    it('does not allow authentication if hacker is blocked', () => {
      setAuthenticated(true);
      expect(isAuthenticated()).toBe(true);

      // Angreifer-Cookie setzen
      setCookie(HACKER_COOKIE_NAME, 'true');
      expect(isAuthenticated()).toBe(false);
    });
  });
});
