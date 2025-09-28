'use client';

import { useState, useMemo } from 'react';
import EmployeeDashboard from '@/components/employee-dashboard';
import TimeTracker from '@/components/time-tracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/header';

export default function Home() {
  const [employees, setEmployees] = useState<string[]>(['Max Mustermann', 'Erika Mustermann']);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const handleSelectEmployee = (employeeName: string) => {
    setSelectedEmployee(employeeName);
  };
  
  const handleAddEmployee = (employeeName: string) => {
    if (employeeName && !employees.includes(employeeName)) {
      setEmployees([...employees, employeeName]);
    }
  };

  const handleDeleteEmployee = (employeeName: string) => {
    setEmployees(employees.filter(e => e !== employeeName));
    if (selectedEmployee === employeeName) {
      setSelectedEmployee(null);
    }
  }

  if (selectedEmployee) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-4 print:hidden">
            <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </Button>
          </div>
          <TimeTracker employee={selectedEmployee} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="print:hidden">
        <Header />
      </div>
      <main className="flex-1 container mx-auto p-4 sm:p-6">
        <EmployeeDashboard 
          employees={employees}
          onSelectEmployee={handleSelectEmployee}
          onAddEmployee={handleAddEmployee}
          onDeleteEmployee={handleDeleteEmployee}
        />
      </main>
    </div>
  );
}
