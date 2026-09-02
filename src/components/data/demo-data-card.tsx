'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChronoActions } from '@/components/providers/data-provider';
import { useEmployees } from '@/hooks/use-chrono-data';
import { useToast } from '@/hooks/use-toast';
import { DEMO_EMPLOYEE_NAME } from '@/lib/demo';
import { currentMonthKey } from '@/lib/date-keys';

export function DemoDataCard() {
  const actions = useChronoActions();
  const employees = useEmployees();
  const router = useRouter();
  const { toast } = useToast();

  const existing = employees.find((employee) => employee.name === DEMO_EMPLOYEE_NAME);

  const handleClick = () => {
    const employee = existing ?? actions.seedDemo();
    router.push(`/tracker?e=${encodeURIComponent(employee.id)}&m=${currentMonthKey()}`);
    if (!existing) {
      toast({
        title: 'Beispieldaten erstellt',
        description: 'Ein Mitarbeiter mit einem gefüllten aktuellen Monat wurde angelegt.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beispieldaten</CardTitle>
        <CardDescription>
          Legt einen Mitarbeiter mit einem vollständig gefüllten aktuellen Monat an, um die App
          auszuprobieren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="touchWide" onClick={handleClick} className="w-full sm:w-auto">
          <Sparkles />
          {existing ? 'Beispieldaten öffnen' : 'Beispieldaten erstellen'}
        </Button>
      </CardContent>
    </Card>
  );
}
