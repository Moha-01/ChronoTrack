'use client';

import { useState } from 'react';
import EmployeeDashboard from '@/components/employee-dashboard';
import TimeTracker from '@/components/time-tracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/header';

export default function Home() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  if (selectedEmployee) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-4">
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
       <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6">
        <EmployeeDashboard onSelectEmployee={setSelectedEmployee} />
      </main>
    </div>
  );
}
