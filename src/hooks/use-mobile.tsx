'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * @returns `undefined`, solange die Breite noch nicht gemessen wurde.
 *
 * Vorher wurde das `undefined` mit `!!isMobile` zu `false` verschluckt. Dadurch
 * hätten Mobilgeräte für einen Frame die Desktop-Variante bekommen und React
 * hätte eine Hydration-Abweichung gemeldet. Der Aufrufer soll den
 * Unbekannt-Zustand explizit behandeln.
 */
export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };

    onChange(query);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
