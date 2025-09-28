import Header from '@/components/header';
import TimeTracker from '@/components/time-tracker';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <TimeTracker />
      </main>
    </div>
  );
}
