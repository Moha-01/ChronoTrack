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
import Link from 'next/link';
import { UserPlus, ChevronRight, Trash2 } from 'lucide-react';
import Header from './header';

const initialEmployees = ['John Doe', 'Jane Smith', 'Peter Jones'];

export default function EmployeeDashboard() {
  const [employees, setEmployees] = useState<string[]>(initialEmployees);
  const [newEmployee, setNewEmployee] = useState('');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployee.trim() && !employees.includes(newEmployee.trim())) {
      setEmployees([...employees, newEmployee.trim()]);
      setNewEmployee('');
    }
  };

  const handleDeleteEmployee = (employeeToDelete: string) => {
    setEmployees(employees.filter(employee => employee !== employeeToDelete));
  };

  return (
    <>
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Employee
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleAddEmployee}>
              <CardContent>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="employee-name">Employee Name</Label>
                  <Input
                    id="employee-name"
                    placeholder="e.g., Alice Johnson"
                    value={newEmployee}
                    onChange={(e) => setNewEmployee(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Add Employee
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Employee List</CardTitle>
              <CardDescription>
                Select an employee to view their time sheets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee}>
                      <TableCell className="font-medium">{employee}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" asChild>
                          <Link href={`/employee/${encodeURIComponent(employee)}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteEmployee(employee)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No employees added yet.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
