'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function AddEmployeeForm() {
  const employees = useEmployees();
  const actions = useChronoActions();
  const { toast } = useToast();

  const schema = React.useMemo(() => employeeNameSchema(employees), [employees]);

  const form = useForm<EmployeeNameValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
    mode: 'onSubmit',
  });

  const onSubmit = (values: EmployeeNameValues) => {
    const employee = actions.addEmployee(values.name);
    if (!employee) {
      form.setError('name', {
        message: 'Ein Mitarbeiter mit diesem Namen existiert bereits.',
      });
      return;
    }
    form.reset({ name: '' });
    toast({
      title: 'Mitarbeiter hinzugefügt',
      description: `„${employee.name}" wurde angelegt.`,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Name des Mitarbeiters</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Name des Mitarbeiters"
                  autoComplete="off"
                  autoCapitalize="words"
                  className="h-touch"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="touchWide" className="sm:w-auto">
          <UserPlus />
          Hinzufügen
        </Button>
      </form>
    </Form>
  );
}
