export type TimeEntry = {
  id: string;
  day: number; // Day of the month
  project: string;
  begin: string;
  end:string;
  pause: number; // in minutes
  total: number; // in minutes
};
