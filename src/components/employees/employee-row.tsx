'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEmployeeTotal } from '@/hooks/use-chrono-data';
import { formatDuration } from '@/lib/utils';
import { currentMonthKey } from '@/lib/date-keys';

interface EmployeeRowProps {
  employee: Employee;
  onRename(employee: Employee): void;
  onDelete(employee: Employee): void;
}

function EmployeeRowImpl({ employee, onRename, onDelete }: EmployeeRowProps) {
  const total = useEmployeeTotal(employee.id);

  return (
    <li className="flex items-stretch gap-1 border-b last:border-b-0">
      {/* Die ganze Zeile ist das Touch-Ziel, nicht nur ein 40px-Icon. */}
      <Link
        href={`/tracker?e=${encodeURIComponent(employee.id)}&m=${currentMonthKey()}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{employee.name}</span>
          <span className="block text-xs text-muted-foreground">
            {total > 0 ? `${formatDuration(total)} erfasst` : 'Noch keine Zeiten erfasst'}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="touch"
            className="my-auto shrink-0"
            aria-label={`Aktionen für ${employee.name}`}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onRename(employee)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Umbenennen
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDelete(employee)}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export const EmployeeRow = React.memo(EmployeeRowImpl);
