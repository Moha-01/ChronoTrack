'use client';

import { useState, useMemo, useEffect } from 'react';
import EmployeeDashboard from '@/components/employee-dashboard';
import TimeTracker from '@/components/time-tracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/header';
import type { TimeEntry } from '@/lib/types';
import { calculateDuration } from '@/lib/utils';
import { getDaysInMonth, getYear, getMonth, format } from 'date-fns';

const EMPLOYEES_STORAGE_KEY = 'chronotrack-employees';
const ENTRIES_STORAGE_KEY = 'chronotrack-entries';

export default function Home() {
  const [employees, setEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [allEntries, setAllEntries] = useState<Record<string, Record<string, TimeEntry>>>({});
  
  // Load initial data from localStorage
  useEffect(() => {
    try {
      const storedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (storedEmployees) {
        setEmployees(JSON.parse(storedEmployees));
      } else {
        // Default value if nothing is stored
        setEmployees(['Max Mustermann', 'Erika Mustermann']);
      }

      const storedEntries = localStorage.getItem(ENTRIES_STORAGE_KEY);
      if (storedEntries) {
        setAllEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      // Fallback to default values
      setEmployees(['Max Mustermann', 'Erika Mustermann']);
      setAllEntries({});
    }
  }, []);

  // Save employees to localStorage
  useEffect(() => {
    try {
      if(employees.length > 0) {
        localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
      }
    } catch (error) {
      console.error("Failed to save employees to localStorage", error);
    }
  }, [employees]);

  // Save entries to localStorage
  useEffect(() => {
    try {
      if(Object.keys(allEntries).length > 0) {
        localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(allEntries));
      }
    } catch (error) {
      console.error("Failed to save entries to localStorage", error);
    }
  }, [allEntries]);


  const handleSelectEmployee = (employeeName: string) => {
    setSelectedEmployee(employeeName);
  };
  
  const handleAddEmployee = (employeeName: string) => {
    if (employeeName && !employees.includes(employeeName)) {
      setEmployees([...employees, employeeName]);
    }
  };

  const handleDeleteEmployee = (employeeName: string) => {
    const updatedEmployees = employees.filter(e => e !== employeeName);
    setEmployees(updatedEmployees);
    
    if (selectedEmployee === employeeName) {
      setSelectedEmployee(null);
    }
    
    const newEntries = {...allEntries};
    delete newEntries[employeeName];
    setAllEntries(newEntries);

    // Also update localStorage after deletion
    if (updatedEmployees.length === 0) {
      localStorage.removeItem(EMPLOYEES_STORAGE_KEY);
    }
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(newEntries));
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
