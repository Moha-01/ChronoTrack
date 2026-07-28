'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { DataProvider } from '@/components/providers/data-provider';
import { THEME_KEY } from '@/lib/storage';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_KEY}
      disableTransitionOnChange
    >
      {/* Liegt über der Route-Grenze, damit / und /tracker denselben Bestand
          teilen und ein Seitenwechsel nichts neu lädt. */}
      <DataProvider>
        {children}
        <Toaster />
      </DataProvider>
    </ThemeProvider>
  );
}
