import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDuration(begin: string, end: string, pause: number): number {
  if (!begin || !end) return 0;

  try {
    const [beginHours, beginMinutes] = begin.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);

    if (isNaN(beginHours) || isNaN(beginMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
      return 0;
    }

    const beginDate = new Date();
    beginDate.setHours(beginHours, beginMinutes, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    if (endDate < beginDate) {
      return 0;
    }

    const diffMs = endDate.getTime() - beginDate.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    
    return Math.max(0, diffMinutes - (pause || 0));
  } catch (error) {
    return 0;
  }
}

export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
