'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, ChevronRight, Trash2, Rocket } from 'lucide-react';

interface EmployeeDashboardProps {
  employees: string[];
  onSelectEmployee: (employeeName: string) => void;
  onAddEmployee: (employeeName: string) => void;
  onDeleteEmployee: (employeeName: string) => void;
  onAddDemoEmployee: () => void;
}

export default function EmployeeDashboard({ 
  employees, 
  onSelectEmployee,
  onAddEmployee,
  onDeleteEmployee,
  onAddDemoEmployee,
}: EmployeeDashboardProps) {
  const [newEmployee, setNewEmployee] = useState('');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployee.trim()) {
      onAddEmployee(newEmployee.trim());
      setNewEmployee('');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        <div className="md:col-span-1 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserPlus className="h-5 w-5" />
                Neuen Mitarbeiter hinzufügen
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleAddEmployee}>
              <CardContent>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="employee-name">Mitarbeitername</Label>
                  <Input
                    id="employee-name"
                    placeholder="z.B. Alice Johnson"
                    value={newEmployee}
                    onChange={(e) => setNewEmployee(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Mitarbeiter hinzufügen
                </Button>
              </CardFooter>
            </form>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Rocket className="h-5 w-5" />
                    Schnellstart
                </CardTitle>
                <CardDescription>
                    Erstellen Sie einen Demo-Mitarbeiter mit Beispieldaten für den aktuellen Monat.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onAddDemoEmployee} className="w-full">
                    Demo erstellen
                </Button>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Mitarbeiterliste</CardTitle>
              <CardDescription>
                Wählen Sie einen Mitarbeiter aus, um dessen Zeitnachweise anzuzeigen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mitarbeitername</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee}>
                        <TableCell className="font-medium whitespace-nowrap">{employee}</TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => onSelectEmployee(employee)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => onDeleteEmployee(employee)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {employees.length === 0 && (
                       <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                              Noch keine Mitarbeiter hinzugefügt.
                          </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
