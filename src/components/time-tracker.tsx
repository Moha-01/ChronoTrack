'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  getDate,
} from 'date-fns';
import { de } from 'date-fns/locale';

import type { TimeEntry } from '@/lib/types';
import { formatDuration, calculateDuration } from '@/lib/utils';
import { Label } from './ui/label';
import { ArrowUp, Printer } from 'lucide-react';
import PrintableReport from './printable-report';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), 'MMMM', { locale: de }),
}));

interface TimeTrackerProps {
  employee: string;
  allEntries: Record<string, Record<string, TimeEntry>>;
  setAllEntries: React.Dispatch<React.SetStateAction<Record<string, Record<string, TimeEntry>>>>;
}

export default function TimeTracker({ employee, allEntries, setAllEntries }: TimeTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Scroll to today's card on mobile, but only if the selected month is the current month
    const today = new Date();
    if (getMonth(selectedDate) === getMonth(today) && getYear(selectedDate) === getYear(today)) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedDate, employee]);


  const entries = useMemo(() => {
    const employeeKey = employee || 'default';
    return allEntries[employeeKey] || {};
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
    const employeeKey = employee || 'default';
    setAllEntries((prev) => {
      const employeeEntries = prev[employeeKey] || {};
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
        [employeeKey]: {
          ...employeeEntries,
          [dayKey]: updatedEntry,
        },
      };
    });
  };
  
  const handleGeneratePdf = () => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm';
    document.body.appendChild(tempContainer);

    const reportElement = (
      <PrintableReport
        employee={employee}
        date={selectedDate}
        entries={monthEntries}
        totalDuration={totalMonthDuration}
      />
    );

    const root = createRoot(tempContainer);
    root.render(reportElement);

    setTimeout(() => {
      html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

          const pdfBlob = pdf.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, '_blank');
        })
        .catch((error) => {
          console.error('Error generating PDF:', error);
        })
        .finally(() => {
          root.unmount();
          document.body.removeChild(tempContainer);
        });
    }, 500); // Give React some time to render
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
  
  const monthEntries = useMemo(() => {
    return Object.values(entries).filter(entry => 
      entry.id.startsWith(format(selectedDate, 'yyyy-MM')) && entry.total > 0
    ).sort((a, b) => a.day - b.day);
  }, [entries, selectedDate]);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Monatlicher Zeitnachweis für {employee}</CardTitle>
            <CardDescription>
              Wählen Sie einen Monat aus und protokollieren Sie die Zeit für jeden Tag.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div className="flex gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label>Monat</Label>
                  <Select
                    value={getMonth(selectedDate).toString()}
                    onValueChange={(value) =>
                      setSelectedDate((d) => setMonth(d, parseInt(value)))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Monat auswählen" />
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
                  <Label>Jahr</Label>
                  <Select
                    value={getYear(selectedDate).toString()}
                    onValueChange={(value) =>
                      setSelectedDate((d) => setYear(d, parseInt(value)))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue placeholder="Jahr auswählen" />
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
              <div className="grid w-full sm:w-auto items-center gap-1.5">
                  <Label className="hidden sm:block">&nbsp;</Label>
                  <Button onClick={handleGeneratePdf} className="w-full">
                    <Printer className="mr-2 h-4 w-4" />
                    Bericht drucken
                  </Button>
              </div>
            </div>
            
            {/* Desktop Table */}
            <div className="relative w-full overflow-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px] whitespace-nowrap">Tag</TableHead>
                      <TableHead>Objekt/Projekt</TableHead>
                      <TableHead className="w-[100px]">Beginn</TableHead>
                      <TableHead className="w-[100px]">Ende</TableHead>
                      <TableHead className="w-[100px]">Pause (min)</TableHead>
                      <TableHead className="text-right w-[120px] whitespace-nowrap">Gesamt</TableHead>
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
                            {format(dayDate, 'EEE, d. MMM', { locale: de })}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={entry?.project || ''}
                              onChange={(e) =>
                                handleEntryChange(day, 'project', e.target.value)
                              }
                              placeholder="z.B. Projekt Phönix"
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
                        Gesamtzeit des Monats
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary whitespace-nowrap">
                        {formatDuration(totalMonthDuration)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {monthDays.map((day) => {
                  const dayKey = `${format(selectedDate, 'yyyy-MM')}-${day}`;
                  const entry = entries[dayKey];
                  const dayDate = new Date(getYear(selectedDate), getMonth(selectedDate), day);
                  const isToday = getDate(new Date()) === day && getMonth(new Date()) === getMonth(selectedDate) && getYear(new Date()) === getYear(selectedDate);
                  
                  return (
                    <Card key={dayKey} className="w-full" ref={isToday ? todayRef : null}>
                      <CardHeader>
                        <CardTitle className="text-base flex justify-between items-center">
                          <span>{format(dayDate, 'EEE, d. MMM', { locale: de })}</span>
                          <span className="text-primary font-semibold text-lg">{formatDuration(entry?.total || 0)}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor={`project-${dayKey}`}>Objekt/Projekt</Label>
                          <Input
                            id={`project-${dayKey}`}
                            value={entry?.project || ''}
                            onChange={(e) => handleEntryChange(day, 'project', e.target.value)}
                            placeholder="z.B. Projekt Phönix"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor={`begin-${dayKey}`}>Beginn</Label>
                            <Input
                              id={`begin-${dayKey}`}
                              type="time"
                              value={entry?.begin || '00:00'}
                              onChange={(e) => handleEntryChange(day, 'begin', e.target.value)}
                            />
                          </div>
                          <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor={`end-${dayKey}`}>Ende</Label>
                            <Input
                              id={`end-${dayKey}`}
                              type="time"
                              value={entry?.end || '00:00'}
                              onChange={(e) => handleEntryChange(day, 'end', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor={`pause-${dayKey}`}>Pause (Minuten)</Label>
                          <Input
                            id={`pause-${dayKey}`}
                            type="number"
                            value={entry?.pause || 0}
                            onChange={(e) => handleEntryChange(day, 'pause', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <Card className="bg-muted/50">
                  <CardHeader className='p-4'>
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>Gesamtzeit des Monats</span>
                      <span className="text-primary font-bold text-lg">
                        {formatDuration(totalMonthDuration)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

          </CardContent>
        </Card>
      </div>
      <div id="printable-report" className="hidden print:block">
        <PrintableReport 
            employee={employee}
            date={selectedDate}
            entries={monthEntries}
            totalDuration={totalMonthDuration}
          />
      </div>
       {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
          size="icon"
        >
          <ArrowUp className="h-6 w-6" />
          <span className="sr-only">Nach oben scrollen</span>
        </Button>
      )}
    </>
  );
}
