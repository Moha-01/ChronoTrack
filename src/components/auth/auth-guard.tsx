'use client';

import * as React from 'react';
import { Lock, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import {
  isHackerBlocked,
  isAuthenticated,
  getFailedAttempts,
  verifyPassword,
  recordFailedAttempt,
  resetFailedAttempts,
  setAuthenticated,
  MAX_FAILED_ATTEMPTS,
  AUTH_CHANGE_EVENT,
} from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkStatus = React.useCallback(() => {
    const isBlockedNow = isHackerBlocked();
    setBlocked(isBlockedNow);
    setAuthed(isAuthenticated());
    setFailedAttempts(getFailedAttempts());
  }, []);

  React.useEffect(() => {
    checkStatus();
    setMounted(true);

    const handleAuthChange = () => {
      checkStatus();
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [checkStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;

    if (verifyPassword(password)) {
      resetFailedAttempts();
      setAuthenticated(true);
      setError(null);
      setPassword('');
      setAuthed(true);
      setFailedAttempts(0);
    } else {
      const result = recordFailedAttempt();
      setFailedAttempts(result.attempts);

      if (result.isBlocked) {
        setBlocked(true);
        setPassword('');
        setError(null);
      } else {
        setError('Falsches Passwort.');
        setPassword('');
      }
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Fall 1: Gerät ist nach 20 Fehlversuchen gesperrt (Hacker-Cookie aktiv)
  if (blocked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50 bg-card text-card-foreground shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-8 w-8" aria-hidden />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">
              Gerät dauerhaft gesperrt
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sicherheitswarnung: Unbefugter Zugriffsversuch erkannt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              Aufgrund von <strong>20 fehlerhaften Passworteingaben</strong> wurde dieses Gerät
              als Angreifer markiert. Ein Sicherheits-Cookie wurde hinterlegt.
            </div>
            <p>
              Passworteingaben sind auf diesem Gerät nicht mehr zulässig. Der Zugriff auf ChronoTrack
              bleibt vollständig blockiert.
            </p>
          </CardContent>
          <CardFooter className="justify-center pt-2">
            <p className="text-xs text-muted-foreground/75">
              Status: 20/20 Fehlversuche erreicht · Gerät markiert
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fall 2: Nicht authentifiziert -> Passwortabfrage anzeigen
  if (!authed) {
    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-7 w-7" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">ChronoTrack</CardTitle>
            <CardDescription>
              Diese Anwendung ist geschützt. Bitte geben Sie das Passwort ein, um fortzufahren.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <p className="font-semibold">{error}</p>
                  <p className="mt-1 text-xs">
                    Fehlversuch {failedAttempts} von {MAX_FAILED_ATTEMPTS}. Nach {MAX_FAILED_ATTEMPTS}{' '}
                    Versuchen wird dieses Gerät dauerhaft gesperrt (noch {remaining}{' '}
                    {remaining === 1 ? 'Versuch' : 'Versuche'}).
                  </p>
                </div>
              ) : failedAttempts > 0 ? (
                <p className="text-xs text-muted-foreground text-center">
                  Bisherige Fehlversuche: {failedAttempts} / {MAX_FAILED_ATTEMPTS}
                </p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="app-password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="app-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort eingeben"
                    autoFocus
                    required
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full">
                Entsperren
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Sicherheitsrichtlinie: Maximal {MAX_FAILED_ATTEMPTS} Versuche
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Fall 3: Authentifiziert
  return <>{children}</>;
}

