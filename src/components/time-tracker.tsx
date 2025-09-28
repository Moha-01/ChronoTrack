'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getDaysInMonth,
  format,
  setMonth,
  getMonth,
  getYear,
  setYear,
} from 'date-fns';

import type { TimeEntry } from '@/lib/types';
import { formatDuration, calculateDuration } from '@/lib/utils';
import { Label } from './ui/label';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), 'MMMM'),
}));

interface TimeTrackerProps {
  employee: string;
}

export default function TimeTracker({ employee }: TimeTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allEntries, setAllEntries] = useState<Record<string, Record<string, TimeEntry>>>({});

  const entries = useMemo(() => {
    return allEntries[employee] || {};
  }, [allEntries, employee]);

  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedDate),
    [selectedDate]
  );

  const handleEntryChange = (
    day: number,
    field: keyof Omit<TimeEntry, 'id' | 'day' | 'total'>,
    value: string | number
  ) => {
    const dayKey = `${format(selectedDate, 'yyyy-MM')}-${day}`;
    setAllEntries((prev) => {
      const employeeEntries = prev[employee] || {};
      const existingEntry = employeeEntries[dayKey] || {
        id: dayKey,
        day,
        project: '',
        begin: '00:00',
        end: '00:00',
        pause: 0,
        total: 0,
      };

      const updatedEntry: TimeEntry = { ...existingEntry, [field]: value };
      
      const total = calculateDuration(updatedEntry.begin, updatedEntry.end, updatedEntry.pause);
      updatedEntry.total = total;

      return {
        ...prev,
        [employee]: {
          ...employeeEntries,
          [dayKey]: updatedEntry,
        },
      };
    });
  };

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const totalMonthDuration = useMemo(() => {
    return Object.values(entries).reduce((acc, entry) => {
       if (entry.id.startsWith(format(selectedDate, 'yyyy-MM'))) {
        return acc + entry.total;
       }
       return acc;
    }, 0);
  }, [entries, selectedDate]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Monthly Time Sheet for {employee}</CardTitle>
          <CardDescription>
            Select a month, then log the time for each day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label>Month</Label>
                <Select
                  value={getMonth(selectedDate).toString()}
                  onValueChange={(value) =>
                    setSelectedDate((d) => setMonth(d, parseInt(value)))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label>Year</Label>
                 <Select
                  value={getYear(selectedDate).toString()}
                  onValueChange={(value) =>
                    setSelectedDate((d) => setYear(d, parseInt(value)))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] whitespace-nowrap">Day</TableHead>
                  <TableHead>Object/Project</TableHead>
                  <TableHead className="w-[100px]">Begin</TableHead>
                  <TableHead className="w-[100px]">End</TableHead>
                  <TableHead className="w-[100px]">Pause (min)</TableHead>
                  <TableHead className="text-right w-[120px] whitespace-nowrap">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthDays.map((day) => {
                  const dayKey = `${format(selectedDate, 'yyyy-MM')}-${day}`;
                  const entry = entries[dayKey];
                  const dayDate = new Date(getYear(selectedDate), getMonth(selectedDate), day);

                  return (
                    <TableRow key={dayKey}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(dayDate, 'EEE, MMM d')}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry?.project || ''}
                          onChange={(e) =>
                            handleEntryChange(day, 'project', e.target.value)
                          }
                          placeholder="e.g., Project Phoenix"
                          className="min-w-[150px]"
                        />
                      </TableCell>
                       <TableCell>
                        <Input
                          type="time"
                          value={entry?.begin || '00:00'}
                          onChange={(e) =>
                            handleEntryChange(day, 'begin', e.target.value)
                          }
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={entry?.end || '00:00'}
                          onChange={(e) =>
                            handleEntryChange(day, 'end', e.target.value)
                          }
                           className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={entry?.pause || 0}
                          onChange={(e) =>
                            handleEntryChange(day, 'pause', parseInt(e.target.value) || 0)
                          }
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary whitespace-nowrap">
                        {formatDuration(entry?.total || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                 <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={5} className="font-bold text-right">
                    Total Month Time
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary whitespace-nowrap">
                    {formatDuration(totalMonthDuration)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
