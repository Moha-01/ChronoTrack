'use client';

import * as React from 'react';

/**
 * Scrollt einmalig zum heutigen Tag, wenn ein Mitarbeiter geöffnet wird.
 *
 * `once` identifiziert den Vorgang — solange sich dieser Wert nicht ändert,
 * wird nicht erneut gescrollt. Damit bleibt der frühere Fehler aus, bei dem der
 * Sprung bei *jedem* Monatswechsel erneut ausgelöst wurde und die Ansicht
 * mitten in der Eingabe weggerissen hat.
 *
 * @param active  nur true, wenn der angezeigte Monat den heutigen Tag enthält
 * @param once    stabile Kennung des Vorgangs (hier: die Mitarbeiter-ID)
 * @returns Ref, die an das Element des heutigen Tages gehängt wird
 */
export function useScrollToToday<T extends HTMLElement>(
  active: boolean,
  once: string | null | undefined
) {
  const ref = React.useRef<T | null>(null);
  const handledFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!active || !once) return;
    if (handledFor.current === once) return;

    const element = ref.current;
    if (!element) return;

    handledFor.current = once;

    // Zwei Frames warten, damit Liste und Sticky-Header ihre endgültige Höhe
    // haben — sonst zielt scrollIntoView auf eine veraltete Position.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const reduceMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        element.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          // center statt start: so verschwindet die Zeile nicht unter der
          // Kopfzeile und dem Wochen-Header.
          block: 'center',
        });
      });
    });

    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [active, once]);

  return ref;
}
