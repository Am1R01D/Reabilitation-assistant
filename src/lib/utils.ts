import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function recoveryStatus(pain: number, mobility: number, compliance: number): string {
  if (pain >= 7 || mobility <= 3) return 'Needs Attention';
  if (compliance < 50) return 'Low Adherence';
  if (pain <= 4 && mobility >= 6) return 'Improving';
  return 'Stable';
}

export function statusColor(status: string): string {
  switch (status) {
    case 'Improving':
      return 'bg-emerald-100 text-emerald-800';
    case 'Stable':
      return 'bg-blue-100 text-blue-800';
    case 'Low Adherence':
      return 'bg-amber-100 text-amber-800';
    case 'Needs Attention':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-clinical-100 text-clinical-700';
  }
}
