'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logout } from '@/lib/auth';

export function SecurityCard() {
  const handleLock = () => {
    logout();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sicherheit & Zugriffsschutz</CardTitle>
        <CardDescription>
          Die Anwendung ist mit einem Passwort geschützt. Sie können den Zugriff hier manuell sperren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="touchWide" onClick={handleLock} className="w-full sm:w-auto">
          <Lock className="mr-2 h-4 w-4" />
          App jetzt sperren
        </Button>
      </CardContent>
    </Card>
  );
}

