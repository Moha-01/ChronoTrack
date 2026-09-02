import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dient doppelt: als Ladezustand für den Speicher **und** als Messfenster für
 * die Viewport-Breite. Dadurch kostet die Entscheidung zwischen Tabelle und
 * Kartenliste keinen zusätzlichen Frame.
 */
export function TrackerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-touch w-64" />
        <Skeleton className="h-touch w-40" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
