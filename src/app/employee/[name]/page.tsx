import Header from '@/components/header';
import TimeTracker from '@/components/time-tracker';
import { notFound } from 'next/navigation';

interface EmployeePageProps {
  params: {
    name: string;
  };
}

export default function EmployeePage({ params }: EmployeePageProps) {
  const employeeName = decodeURIComponent(params.name);

  if (!employeeName) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <TimeTracker employee={employeeName} />
      </main>
    </div>
  );
}
