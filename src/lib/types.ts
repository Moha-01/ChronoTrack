export type TimeEntry = {
  id: string;
  day: Date;
  project: string;
  notes: string;
  begin: string;
  end:string;
  pause: number; // in minutes
  total: number; // in minutes
};
