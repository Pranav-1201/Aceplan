import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTo12Hour(time24: string): string {
  // Handle both HH:MM and HH:MM:SS formats
  const timeParts = time24.split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = timeParts[1];
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${hours12}:${minutes} ${period}`;
}
