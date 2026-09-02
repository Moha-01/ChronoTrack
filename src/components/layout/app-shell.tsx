import { AppHeader } from '@/components/layout/app-header';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  subtitle?: string;
  showSettings?: boolean;
  /** Enger Container für Formularseiten. */
  width?: 'default' | 'narrow';
}

export function AppShell({
  children,
  backHref,
  backLabel,
  subtitle,
  showSettings,
  width = 'default',
}: AppShellProps) {
  return (
    // 100dvh statt 100vh: die mobile Browserleiste fährt ein und aus.
    <div className="flex min-h-[100dvh] flex-col">
      <AppHeader
        backHref={backHref}
        backLabel={backLabel}
        subtitle={subtitle}
        showSettings={showSettings}
      />
      <main
        className={cn(
          'container mx-auto w-full flex-1 px-4 py-5 sm:px-6 sm:py-8',
          // Platz für den Home-Indikator und den schwebenden Button.
          'pb-[calc(theme(spacing.safe-b)+5rem)]',
          width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl'
        )}
      >
        {children}
      </main>
    </div>
  );
}
