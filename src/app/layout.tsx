import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Selbst gehostet über next/font: keine blockierende Anfrage an Google, korrekt
// unter dem GitHub-Pages-basePath, und offline verfügbar.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'ChronoTrack',
    template: '%s · ChronoTrack',
  },
  description:
    'Eine strukturierte Zeiterfassungs-App für Mitarbeiter zur Verwaltung der individuellen Arbeitsstunden.',
  applicationName: 'ChronoTrack',
  appleWebApp: {
    capable: true,
    title: 'ChronoTrack',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lässt den Inhalt bis in die Notch-Bereiche laufen; die sicheren Abstände
  // setzen die Komponenten selbst über die safe-t/safe-b-Utilities.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#14161c' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning ist nötig, weil next-themes die Theme-Klasse
    // per Inline-Skript noch vor dem ersten Paint setzt.
    <html lang="de" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
