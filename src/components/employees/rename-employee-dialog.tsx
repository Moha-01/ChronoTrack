'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useChronoActions } from '@/components/providers/data-provider';
import { useEmployees } from '@/hooks/use-chrono-data';
import { employeeNameSchema, type EmployeeNameValues } from './employee-name-schema';
import { useToast } from '@/hooks/use-toast';

interface RenameEmployeeDialogProps {
  employee: Employee | null;
  onClose(): void;
}

/**
 * Umbenennen ist erst möglich, seit die Identität an einer stabilen ID hängt.
 * Vorher war der Name selbst der Speicherschlüssel.
 */
export function RenameEmployeeDialog({ employee, onClose }: RenameEmployeeDialogProps) {
  const employees = useEmployees();
  const actions = useChronoActions();
  const { toast } = useToast();

  const schema = React.useMemo(
    () => employeeNameSchema(employees, employee?.id),
    [employees, employee?.id]
  );

  const form = useForm<EmployeeNameValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    if (employee) form.reset({ name: employee.name });
  }, [employee, form]);

  const onSubmit = (values: EmployeeNameValues) => {
    if (!employee) return;
    const previous = employee.name;
    actions.renameEmployee(employee.id, values.name);
    onClose();
    toast({
      title: 'Mitarbeiter umbenannt',
      description: `„${previous}" heißt jetzt „${values.name.trim()}".`,
    });
  };

  return (
    <Dialog open={employee !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter umbenennen</DialogTitle>
          <DialogDescription>
            Alle erfassten Zeiten bleiben erhalten und werden mit übernommen.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus autoComplete="off" className="h-touch" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" size="touchWide" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" size="touchWide">
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
