import { Briefcase } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Briefcase className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-headline">
              ChronoTrack
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
