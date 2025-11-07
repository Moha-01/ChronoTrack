import { Briefcase, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({ showBackButton = false, onBack }: HeaderProps) {
  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            {showBackButton && (
               <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                <ArrowLeft />
                <span className="sr-only">Zurück</span>
              </Button>
            )}
            <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-headline">
              ChronoTrack
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
