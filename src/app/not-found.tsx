import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

/**
 * Wird zu out/404.html — GitHub Pages liefert diese Datei für unbekannte Pfade.
 */
export default function NotFound() {
  return (
    <AppShell width="narrow" showSettings={false}>
      <EmptyState
        icon={FileQuestion}
        title="Seite nicht gefunden"
        description="Diese Adresse gibt es nicht (mehr)."
        action={
          <Button asChild size="touchWide">
            <Link href="/">Zur Mitarbeiterliste</Link>
          </Button>
        }
      />
    </AppShell>
  );
}
