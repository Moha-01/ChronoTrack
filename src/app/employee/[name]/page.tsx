import Header from '@/components/header';
import TimeTracker from '@/components/time-tracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
        <div className="mb-4">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <TimeTracker employee={employeeName} />
      </main>
    </div>
  );
}
