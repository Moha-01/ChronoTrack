'use client';

import React, { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import type { TimeEntry } from '@/lib/types';
import { initialTimeEntries } from '@/lib/data';
import { TimeEntryDialog } from './time-entry-dialog';
import { formatDuration } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TimeTracker() {
  const [entries, setEntries] = useState<TimeEntry[]>(initialTimeEntries);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleSave = (data: Omit<TimeEntry, 'id' | 'total'> & { total: number }, id?: string) => {
    if (id) {
      // Update existing entry
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...data, id } : entry))
      );
    } else {
      // Add new entry
      setEntries((prev) => [{ ...data, id: crypto.randomUUID() }, ...prev]);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Time Log</CardTitle>
              <CardDescription>
                A record of your daily work hours.
              </CardDescription>
            </div>
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Time Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[150px]">Day</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Begin</TableHead>
                  <TableHead className="text-right">End</TableHead>
                  <TableHead className="text-right">Pause</TableHead>
                  <TableHead className="text-right w-[120px]">Total</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-accent text-accent flex items-center gap-2"
                        >
                          <span className="h-2 w-2 rounded-full bg-accent"></span>
                          Done
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(entry.day, 'EEE, MMM d')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.project}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {entry.notes}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{entry.begin}</TableCell>
                      <TableCell className="text-right">{entry.end}</TableCell>
                      <TableCell className="text-right">{entry.pause}m</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatDuration(entry.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/40">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this time entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No time entries found. Add your first one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TimeEntryDialog
        key={editingEntry ? editingEntry.id : 'new'}
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        entry={editingEntry}
        onSave={handleSave}
      />
    </>
  );
}
