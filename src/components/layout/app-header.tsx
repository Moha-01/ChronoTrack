'use client';

import Link from 'next/link';
import { ArrowLeft, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  /** Ziel des Zurück-Wegs. Fehlt es, wird kein Zurück-Button gezeigt. */
  backHref?: string;
  backLabel?: string;
  /** Kontextzeile unter dem Titel, z.B. der Mitarbeitername. */
  subtitle?: string;
  showSettings?: boolean;
}

export function AppHeader({
  backHref,
  backLabel = 'Zurück zur Mitarbeiterliste',
  subtitle,
  showSettings = true,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-background/85 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/70',
        // Läuft unter der Notch durch, hält den Inhalt aber darunter.
        'pt-safe-t'
      )}
    >
      <div className="container mx-auto flex h-header items-center gap-1 px-3 sm:px-6">
        {backHref ? (
          // Bewusst ein Link auf ein festes Ziel statt router.back(): bei einem
          // direkt geöffneten Deep-Link führt die History sonst aus der App
          // heraus. Und bewusst auf ALLEN Breakpoints -- vorher war der Button
          // md:hidden, wodurch es auf dem Desktop keinen Weg zurück gab.
          <Button asChild variant="ghost" size="touch" className="shrink-0">
            <Link href={backHref} aria-label={backLabel}>
              <ArrowLeft />
            </Link>
          </Button>
        ) : (
          <span className="flex h-touch w-touch shrink-0 items-center justify-center text-primary">
            <Clock className="h-5 w-5" aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          {/* Bewusst kein Link: auf jeder Unterseite führt bereits der
              Zurück-Button hierher, und ein 20px hoher Textlink wäre ein zu
              kleines Touch-Ziel gewesen. */}
          <p className="truncate font-semibold leading-tight tracking-tight">ChronoTrack</p>
          {subtitle ? (
            <p className="truncate text-xs leading-tight text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle />
          {showSettings ? (
            <Button asChild variant="ghost" size="touch">
              <Link href="/settings" aria-label="Einstellungen und Daten">
                <Settings />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
