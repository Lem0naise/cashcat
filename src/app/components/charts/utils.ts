// Utility functions for budget assignment chart
import { addDays, format, startOfDay, endOfDay, startOfMonth, startOfYear } from 'date-fns';
import { Assignment, Transaction } from './types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const calculateDateRange = (
  timeRange: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom',
  customStartDate?: Date,
  customEndDate?: Date,
  allTimeStart?: Date,
  allTimeEnd?: Date
) => {
  const now = new Date();
  let start: Date;
  let end: Date = now;
  
  switch (timeRange) {
    case '7d':
      start = addDays(now, -7);
      break;
    case '30d':
      start = addDays(now, -30);
      break;
    case 'mtd':
      start = startOfMonth(now);
      break;
    case '3m':
      start = addDays(now, -90);
      break;
    case 'ytd':
      start = startOfYear(now);
      break;
    case '12m':
      start = addDays(now, -365);
      break;
    case 'custom':
      start = customStartDate || addDays(now, -30);
      end = customEndDate || now;
      break;
    case 'all':
    default:
      start = allTimeStart || now;
      end = allTimeEnd || now;
      break;
  }
  
  return { start: startOfDay(start), end: endOfDay(end) };
};

export const calculateAllTimeRange = (assignments: Assignment[], transactions: Transaction[]) => {
  const allDates = [
    ...assignments.map(a => new Date(a.month + '-01')),
    ...transactions.map(t => new Date(t.date))
  ].filter(d => !isNaN(d.getTime()));

  const allTimeStart = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const allTimeEnd = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
  
  return { allTimeStart, allTimeEnd };
};

export const getGranularityKey = (date: Date, diffInDays: number, forceDaily: boolean = false) => {
  // Force daily granularity for line charts - never aggregate by week or month
  if (forceDaily) {
    return format(date, 'yyyy-MM-dd 12:00:00');
  }
  
  // For up to 3 months, use daily
  if (diffInDays <= 90) {
    return format(date, 'yyyy-MM-dd 12:00:00');
  }
  // For up to 1 year, use weekly (this gives ~52 points instead of 12)
  else if (diffInDays <= 365) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return format(startOfWeek, 'yyyy-MM-dd 12:00:00');
  }
  // For longer periods, use bi-weekly (this gives ~26 points per year)
  else {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    // Group into bi-weekly periods
    const weekOfYear = Math.floor((startOfWeek.getTime() - new Date(startOfWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const biWeeklyPeriod = Math.floor(weekOfYear / 2) * 2;
    const biWeeklyStart = new Date(startOfWeek.getFullYear(), 0, 1 + (biWeeklyPeriod * 7));
    return format(biWeeklyStart, 'yyyy-MM-dd 12:00:00');
  }
};

export const determineTimeUnit = (diffInDays: number, forceDaily: boolean = false): 'day' | 'week' | 'month' => {
  // Force daily unit for line charts - never use week or month
  if (forceDaily) {
    return 'day';
  }
  
  if (diffInDays <= 90) return 'day';
  else if (diffInDays <= 365) return 'week';
  else return 'month';
};
