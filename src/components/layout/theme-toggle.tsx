'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { value: 'light', label: 'Hell', icon: Sun },
  { value: 'dark', label: 'Dunkel', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Vor dem Mounten ist das aufgelöste Theme unbekannt. Ein neutraler
  // Platzhalter gleicher Größe verhindert Hydration-Warnung und Layout-Sprung.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="touch"
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none opacity-0"
      >
        <Sun />
      </Button>
    );
  }

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="touch" aria-label={`Design: ${active.label}. Ändern`}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className="gap-2"
            aria-current={theme === value}
          >
            <Icon className="h-4 w-4" />
            <span className={theme === value ? 'font-medium' : undefined}>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
