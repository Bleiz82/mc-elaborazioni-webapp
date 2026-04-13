import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (typeof val === 'string') { 
    const d = new Date(val); 
    return isNaN(d.getTime()) ? new Date() : d; 
  }
  if (val instanceof Date) return val;
  return new Date();
}

