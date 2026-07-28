'use client';

import * as React from 'react';
import { Users } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { useDataStatus, useEmployees } from '@/hooks/use-chrono-data';
import { AddEmployeeForm } from './add-employee-form';
import { EmployeeRow } from './employee-row';
import { EmployeeListSkeleton } from './employee-list-skeleton';
import { DeleteEmployeeDialog } from './delete-employee-dialog';
import { RenameEmployeeDialog } from './rename-employee-dialog';

export function EmployeeList() {
  const status = useDataStatus();
  const employees = useEmployees();

  const [pendingRename, setPendingRename] = React.useState<Employee | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Employee | null>(null);

  // Stabile Referenzen, damit die memoisierten Zeilen nicht bei jeder
  // Zustandsänderung der Liste neu rendern.
  const handleRename = React.useCallback((employee: Employee) => setPendingRename(employee), []);
  const handleDelete = React.useCallback((employee: Employee) => setPendingDelete(employee), []);

  if (status === 'loading') return <EmployeeListSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Mitarbeiter</CardTitle>
          <CardDescription>
            {employees.length === 0
              ? 'Legen Sie zunächst einen Mitarbeiter an.'
              : `${employees.length} ${employees.length === 1 ? 'Person' : 'Personen'} · Tippen zum Öffnen`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Noch keine Mitarbeiter"
              description="Fügen Sie unten den ersten Mitarbeiter hinzu, um mit der Zeiterfassung zu beginnen."
            />
          ) : (
            <ul className="-mx-3 divide-y-0">
              {employees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mitarbeiter hinzufügen</CardTitle>
        </CardHeader>
        <CardContent>
          <AddEmployeeForm />
        </CardContent>
      </Card>

      <RenameEmployeeDialog employee={pendingRename} onClose={() => setPendingRename(null)} />
      <DeleteEmployeeDialog employee={pendingDelete} onClose={() => setPendingDelete(null)} />
    </div>
  );
}
