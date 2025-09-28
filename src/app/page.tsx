import EmployeeDashboard from '@/components/employee-dashboard';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <EmployeeDashboard />
      </main>
    </div>
  );
}
