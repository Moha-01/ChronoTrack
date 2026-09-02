import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TrackerView } from '@/components/tracker/tracker-view';
import { TrackerSkeleton } from '@/components/tracker/tracker-skeleton';

/**
 * Die Suspense-Grenze ist Pflicht, nicht Kosmetik: `useSearchParams()` ohne
 * <Suspense> lässt den statischen Export-Build fehlschlagen.
 */
export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <AppShell backHref="/">
          <TrackerSkeleton />
        </AppShell>
      }
    >
      <TrackerView />
    </Suspense>
  );
}
