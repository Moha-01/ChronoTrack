'use client';

import { useState, useMemo } from 'react';
import EmployeeDashboard from '@/components/employee-dashboard';
import TimeTracker from '@/components/time-tracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/header';
import type { TimeEntry } from '@/lib/types';
import { calculateDuration } from '@/lib/utils';
import { getDaysInMonth, getYear, getMonth, format } from 'date-fns';

export default function Home() {
  const [employees, setEmployees] = useState<string[]>(['Max Mustermann', 'Erika Mustermann']);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [allEntries, setAllEntries] = useState<Record<string, Record<string, TimeEntry>>>({});

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
    setAllEntries(prev => {
      const newEntries = {...prev};
      delete newEntries[employeeName];
      return newEntries;
    });
  }

  const handleAddDemoEmployee = () => {
    const demoEmployeeName = 'Demo Mitarbeiter';
    if (employees.includes(demoEmployeeName)) {
      // Maybe show a toast message that demo employee already exists
      setSelectedEmployee(demoEmployeeName);
      return;
    }

    const currentDate = new Date();
    const year = getYear(currentDate);
    const month = getMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    
    const demoEntries: Record<string, TimeEntry> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      // Skip weekends (Saturday=6, Sunday=0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }
      
      const dayKey = `${format(currentDate, 'yyyy-MM')}-${day}`;
      const begin = '09:00';
      const end = '17:30';
      const pause = 60;
      const total = calculateDuration(begin, end, pause);

      demoEntries[dayKey] = {
        id: dayKey,
        day,
        project: 'Demo Projekt',
        begin,
        end,
        pause,
        total,
      };
    }
    
    setAllEntries(prev => ({
      ...prev,
      [demoEmployeeName]: demoEntries
    }));

    setEmployees(prev => [...prev, demoEmployeeName]);
    setSelectedEmployee(demoEmployeeName);
  };

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
          <TimeTracker 
            employee={selectedEmployee} 
            allEntries={allEntries}
            setAllEntries={setAllEntries}
          />
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
          onAddDemoEmployee={handleAddDemoEmployee}
        />
      </main>
    </div>
  );
}
