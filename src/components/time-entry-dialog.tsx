'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Info,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn, calculateDuration, formatDuration } from '@/lib/utils';
import type { TimeEntry } from '@/lib/types';

interface TimeEntryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  entry: TimeEntry | null;
  onSave: (data: Omit<TimeEntry, 'id' | 'total'> & { total: number }, id?: string) => void;
}

const formSchema = z.object({
  day: z.date({ required_error: 'A day is required.' }),
  project: z.string().min(1, 'Project name is required.'),
  notes: z.string().optional(),
  begin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time (HH:MM).'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time (HH:MM).'),
  pause: z.coerce.number().min(0, 'Pause cannot be negative.').default(0),
});

export function TimeEntryDialog({ isOpen, setIsOpen, entry, onSave }: TimeEntryDialogProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      day: entry?.day || new Date(),
      project: entry?.project || '',
      notes: entry?.notes || '',
      begin: entry?.begin || '09:00',
      end: entry?.end || '17:00',
      pause: entry?.pause || 60,
    },
  });

  const { watch } = form;
  const [begin, end, pause] = watch(['begin', 'end', 'pause']);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  useEffect(() => {
    setCalculatedTotal(calculateDuration(begin, end, pause));
  }, [begin, end, pause]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const total = calculateDuration(values.begin, values.end, values.pause);
    if (total <= 0 && (values.begin !== values.end)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Time Range',
        description: 'End time must be after begin time.',
      });
      return;
    }
    onSave({ ...values, notes: values.notes || '', total }, entry?.id);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
          <DialogDescription>
            {entry ? 'Update the details for your time log.' : 'Fill in the details for a new time log.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Day</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Project Phoenix" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / Keywords</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Worked on UI mockups for the new feature" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="begin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Begin Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pause"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pause (min)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Total calculated time:</span>
                <span className="font-semibold text-primary">{formatDuration(calculatedTotal)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Entry</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
