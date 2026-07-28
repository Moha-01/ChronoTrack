import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Wird gezeigt, solange der Speicher noch nicht gelesen ist.
 * Vorher blitzte beim Laden immer kurz „Noch keine Mitarbeiter" auf.
 */
export function EmployeeListSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-1">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
