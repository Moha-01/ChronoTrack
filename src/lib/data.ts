import type { TimeEntry } from '@/lib/types';
import { subDays } from 'date-fns';

export const initialTimeEntries: TimeEntry[] = [
  {
    id: '1',
    day: new Date(),
    project: 'Project Phoenix',
    notes: 'Initial setup and component scaffolding for the new dashboard.',
    begin: '09:00',
    end: '17:30',
    pause: 60,
    total: 450, // 7h 30m
  },
  {
    id: '2',
    day: subDays(new Date(), 1),
    project: 'Website Redesign',
    notes: 'Client meeting and feedback implementation on the homepage mockups.',
    begin: '10:15',
    end: '18:00',
    pause: 45,
    total: 420, // 7h 0m
  },
  {
    id: '3',
    day: subDays(new Date(), 2),
    project: 'API Integration',
    notes: 'Debugging authentication flow with third-party service.',
    begin: '09:30',
    end: '16:00',
    pause: 30,
    total: 360, // 6h 0m
  },
   {
    id: '4',
    day: subDays(new Date(), 3),
    project: 'Mobile App UI',
    notes: 'Designing the user profile and settings screens.',
    begin: '11:00',
    end: '19:00',
    pause: 60,
    total: 420, // 7h 0m
  },
];
