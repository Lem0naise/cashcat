'use client';

import React, { useMemo, useCallback } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, subYears, startOfYear, endOfYear, differenceInDays, addDays, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

export interface FilterInsightsProps {
  filterType: 'group' | 'category' | 'vendor';
  filterId: string;
  filterLabel: string;
  filterColor?: string;
  transactions: Transaction[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  timeRange?: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom';
  allTimeRange?: { start: Date; end: Date };
  onDateRangeChange?: (start: Date, end: Date) => void;
  onClose: () => void;
  onSetComparisonPeriod: (start: Date, end: Date) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FilterInsights({
  filterType,
  filterId,
  filterLabel,
  filterColor,
  transactions,
  categories,
  dateRange,
  timeRange,
  allTimeRange,
  onDateRangeChange,
  onClose,
  onSetComparisonPeriod,
}: FilterInsightsProps) {

  // ─── Core insight calculations ──────────────────────────────────────────────
  const insights = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const segmentTxns = transactions.filter(t => {
      if (!t || t.type !== 'payment') return false;
      const d = new Date(t.date);
      if (d < dateRange.start || d > dateRange.end) return false;
      if (filterType === 'group') {
        if (!t.category_id) return false;
        const cat = categoryMap.get(t.category_id);
        if (!cat) return false;
        return ((cat as any).groups?.name || cat.group || 'Uncategorized') === filterId;
      }
      if (filterType === 'category') return t.category_id === filterId;
      if (filterType === 'vendor') return t.vendor === filterId;
      return false;
    });

    const currentSpending = segmentTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    const transactionCount = segmentTxns.length;
    const averageTransaction = transactionCount > 0 ? currentSpending / transactionCount : 0;

    // Comparison period
    const isCompleteMonth =
      dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
    const isCompleteYear =
      dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfYear(dateRange.start).getTime();
    const actualMode =
      (timeRange === 'mtd' || isCompleteMonth) ? 'mtd' :
        (timeRange === 'ytd' || isCompleteYear) ? 'ytd' : timeRange;

    let comparisonStart: Date, comparisonEnd: Date;
    if (actualMode === 'mtd') {
      const prev = subMonths(dateRange.start, 1);
      comparisonStart = startOfMonth(prev);
      comparisonEnd = endOfMonth(prev);
    } else if (actualMode === 'ytd') {
      const prev = subYears(dateRange.start, 1);
      comparisonStart = startOfYear(prev);
      comparisonEnd = endOfYear(prev);
    } else {
      const dur = dateRange.end.getTime() - dateRange.start.getTime();
      comparisonStart = new Date(dateRange.start.getTime() - dur);
      comparisonEnd = new Date(dateRange.start.getTime());
    }

    const compTxns = transactions.filter(t => {
      if (!t || t.type !== 'payment') return false;
      const d = new Date(t.date);
      if (d < comparisonStart || d > comparisonEnd) return false;
      if (filterType === 'group') {
        if (!t.category_id) return false;
        const cat = categoryMap.get(t.category_id);
        if (!cat) return false;
        return ((cat as any).groups?.name || cat.group || 'Uncategorized') === filterId;
      }
      if (filterType === 'category') return t.category_id === filterId;
      if (filterType === 'vendor') return t.vendor === filterId;
      return false;
    });

    const comparisonSpending = compTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    const comparisonTxnCount = compTxns.length;

    let trendPct = 0;
    let trendDir: 'up' | 'down' | 'stable' = 'stable';
    let hasCompData = comparisonSpending > 0;
    if (comparisonSpending > 0) {
      trendPct = ((currentSpending - comparisonSpending) / comparisonSpending) * 100;
      if (trendPct > 5) trendDir = 'up';
      else if (trendPct < -5) trendDir = 'down';
    } else if (currentSpending > 0) {
      hasCompData = false;
    }

    // Breakdown (sub-items)
    let breakdown: { name: string; amount: number; count: number }[] = [];
    if (filterType === 'group') {
      const map: Record<string, { name: string; amount: number; count: number }> = {};
      segmentTxns.forEach(t => {
        if (!t.category_id) return;
        const cat = categoryMap.get(t.category_id);
        if (!cat) return;
        if (!map[cat.id]) map[cat.id] = { name: cat.name, amount: 0, count: 0 };
        map[cat.id].amount += Math.abs(t.amount);
        map[cat.id].count += 1;
      });
      breakdown = Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 5);
    } else {
      const map: Record<string, { name: string; amount: number; count: number }> = {};
      segmentTxns.forEach(t => {
        let key: string;
        if (filterType === 'category') {
          key = t.vendor || 'Unknown';
        } else {
          const cat = t.category_id ? categoryMap.get(t.category_id) : null;
          key = cat ? cat.name : 'Uncategorized';
        }
        if (!map[key]) map[key] = { name: key, amount: 0, count: 0 };
        map[key].amount += Math.abs(t.amount);
        map[key].count += 1;
      });
      breakdown = Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 5);
    }

    // Averages & patterns
    const daysDuration = Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = currentSpending / daysDuration;
    const weeklyProjection = dailyAverage * 7;
    const monthlyProjection = dailyAverage * 30;
    const avgDaysBetween = transactionCount > 1 ? daysDuration / (transactionCount - 1) : 0;
    const largestTxn = segmentTxns.reduce((m, t) => Math.max(m, Math.abs(t.amount)), 0);

    // Day-of-week patterns
    const dowSpend: Record<number, { amount: number; count: number }> = {};
    for (let i = 0; i < 7; i++) dowSpend[i] = { amount: 0, count: 0 };
    segmentTxns.forEach(t => {
      const day = new Date(t.date).getDay();
      dowSpend[day].amount += Math.abs(t.amount);
      dowSpend[day].count += 1;
    });
    const busiestDayEntry = Object.entries(dowSpend).sort(([, a], [, b]) => b.amount - a.amount)[0];
    const busiestDay = busiestDayEntry ? DAYS[parseInt(busiestDayEntry[0])] : null;
    const busiestDayAmount = busiestDayEntry ? busiestDayEntry[1].amount : 0;

    // Weekend vs weekday
    let weekendSpend = 0, weekdaySpend = 0;
    segmentTxns.forEach(t => {
      const day = new Date(t.date).getDay();
      const a = Math.abs(t.amount);
      if (day === 0 || day === 6) weekendSpend += a;
      else weekdaySpend += a;
    });
    const totalSpend = weekendSpend + weekdaySpend;
    const weekendPct = totalSpend > 0 ? (weekendSpend / totalSpend) * 100 : 0;

    // Most frequent vendor
    const vendorCounts: Record<string, { count: number; amount: number }> = {};
    segmentTxns.forEach(t => {
      const v = t.vendor || 'Unknown';
      if (!vendorCounts[v]) vendorCounts[v] = { count: 0, amount: 0 };
      vendorCounts[v].count += 1;
      vendorCounts[v].amount += Math.abs(t.amount);
    });
    const mostFreqEntry = Object.entries(vendorCounts).sort(([, a], [, b]) => b.count - a.count)[0];
    const mostFreqVendor = mostFreqEntry ? mostFreqEntry[0] : null;
    const mostFreqVendorCount = mostFreqEntry ? mostFreqEntry[1].count : 0;

    // Most consistent vendor (distinct weeks)
    const vendorWeeks: Record<string, Set<string>> = {};
    segmentTxns.forEach(t => {
      const v = t.vendor || 'Unknown';
      const wk = format(startOfWeek(new Date(t.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!vendorWeeks[v]) vendorWeeks[v] = new Set();
      vendorWeeks[v].add(wk);
    });
    const mostConsistentEntry = Object.entries(vendorWeeks).sort(([, a], [, b]) => b.size - a.size)[0];
    const mostConsistentVendor = mostConsistentEntry ? mostConsistentEntry[0] : null;
    const mostConsistentVendorWeeks = mostConsistentEntry ? mostConsistentEntry[1].size : 0;

    // Longest no-spend streak
    const spendDates = new Set(segmentTxns.map(t => format(new Date(t.date), 'yyyy-MM-dd')));
    const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    let longestStreak = 0, currentStreak = 0;
    for (const day of allDays) {
      if (!spendDates.has(format(day, 'yyyy-MM-dd'))) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Share of total
    const allPeriodSpend = transactions
      .filter(t => t && t.type === 'payment' && new Date(t.date) >= dateRange.start && new Date(t.date) <= dateRange.end)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const pctOfTotal = allPeriodSpend > 0 ? (currentSpending / allPeriodSpend) * 100 : 0;

    // Comparison coverage
    const hasFullCompCoverage = (() => {
      if (comparisonTxnCount === 0) return false;
      const compDates = compTxns.map(t => new Date(t.date).toDateString());
      const uniqueDates = new Set(compDates);
      const totalCompDays = Math.ceil((comparisonEnd.getTime() - comparisonStart.getTime()) / (1000 * 60 * 60 * 24));
      return uniqueDates.size / totalCompDays >= 0.8 || (totalCompDays >= 14 && comparisonTxnCount >= 3);
    })();

    return {
      currentSpending, transactionCount, averageTransaction,
      comparisonSpending, comparisonTxnCount,
      trendPct: Math.abs(trendPct), trendDir, hasCompData, hasFullCompCoverage,
      breakdown,
      dailyAverage, weeklyProjection, monthlyProjection, avgDaysBetween, largestTxn,
      busiestDay, busiestDayAmount,
      weekendPct, weekendSpend,
      mostFreqVendor, mostFreqVendorCount,
      mostConsistentVendor, mostConsistentVendorWeeks,
      longestStreak,
      pctOfTotal,
      compPeriod: { start: comparisonStart, end: comparisonEnd },
    };
  }, [filterType, filterId, transactions, categories, dateRange, timeRange]);

  // ─── Period navigation ───────────────────────────────────────────────────────
  const dateRangeInfo = useMemo(() => {
    const durationInDays = differenceInDays(dateRange.end, dateRange.start);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const isCompleteMonth =
      dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
    const isCompleteYear =
      dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfYear(dateRange.start).getTime();
    const isCurrentMonth =
      dateRange.start.getTime() === startOfMonth(today).getTime() &&
      dateRange.end.getTime() <= today.getTime() &&
      dateRange.end.getTime() >= startOfMonth(today).getTime();
    const isCurrentYear =
      dateRange.start.getTime() === startOfYear(today).getTime() &&
      dateRange.end.getTime() <= today.getTime() &&
      dateRange.end.getTime() >= startOfYear(today).getTime();

    const actualMode =
      (timeRange === 'mtd' || isCompleteMonth || isCurrentMonth) ? 'mtd' :
        (timeRange === 'ytd' || isCompleteYear || isCurrentYear) ? 'ytd' : timeRange;

    let isAtToday: boolean, isAtStart: boolean;
    if (actualMode === 'mtd') {
      isAtToday = dateRange.start.getTime() === startOfMonth(today).getTime();
      const prevMonth = subMonths(dateRange.start, 1);
      isAtStart = allTimeRange ? startOfMonth(prevMonth) < allTimeRange.start : false;
    } else if (actualMode === 'ytd') {
      isAtToday = dateRange.start.getTime() === startOfYear(today).getTime();
      const prevYear = subYears(dateRange.start, 1);
      isAtStart = allTimeRange ? (endOfYear(prevYear) < allTimeRange.start || startOfYear(prevYear) > allTimeRange.end) : false;
    } else {
      isAtToday = differenceInDays(today, dateRange.end) <= 1;
      isAtStart = allTimeRange ? differenceInDays(dateRange.start, allTimeRange.start) <= 1 : false;
    }

    const rangeText = durationInDays < 32
      ? `${format(dateRange.start, 'MMM dd')} – ${format(dateRange.end, 'MMM dd, yyyy')}`
      : `${format(dateRange.start, 'MMM yyyy')} – ${format(dateRange.end, 'MMM yyyy')}`;

    return {
      durationInDays, actualMode, rangeText,
      canNavigateNext: !isAtToday,
      canNavigatePrev: !isAtStart && allTimeRange !== undefined,
    };
  }, [dateRange, timeRange, allTimeRange]);

  const handleNavigatePrev = useCallback(() => {
    if (!onDateRangeChange || !dateRangeInfo.canNavigatePrev) return;
    let newStart: Date, newEnd: Date;
    if (dateRangeInfo.actualMode === 'mtd') {
      const prev = subMonths(startOfMonth(dateRange.start), 1);
      newStart = startOfMonth(prev); newEnd = endOfMonth(prev);
    } else if (dateRangeInfo.actualMode === 'ytd') {
      const prev = subYears(startOfYear(dateRange.start), 1);
      newStart = startOfYear(prev); newEnd = endOfYear(prev);
    } else {
      const dur = dateRangeInfo.durationInDays;
      newEnd = subDays(dateRange.start, 1);
      newStart = subDays(newEnd, dur);
    }
    if (allTimeRange) {
      if ((dateRangeInfo.actualMode === 'mtd' || dateRangeInfo.actualMode === 'ytd') && newEnd < allTimeRange.start) return;
      if (dateRangeInfo.actualMode !== 'mtd' && dateRangeInfo.actualMode !== 'ytd' && newStart < allTimeRange.start) return;
    }
    onDateRangeChange(newStart, newEnd);
  }, [onDateRangeChange, dateRangeInfo, dateRange, allTimeRange]);

  const handleNavigateNext = useCallback(() => {
    if (!onDateRangeChange || !dateRangeInfo.canNavigateNext) return;
    const today = new Date();
    let newStart: Date, newEnd: Date;
    if (dateRangeInfo.actualMode === 'mtd') {
      const next = addDays(endOfMonth(startOfMonth(dateRange.start)), 1);
      newStart = startOfMonth(next); newEnd = endOfMonth(next);
      if (newStart > today) { newStart = startOfMonth(today); newEnd = today; }
      else if (newEnd > today) newEnd = today;
    } else if (dateRangeInfo.actualMode === 'ytd') {
      const next = addDays(endOfYear(startOfYear(dateRange.start)), 1);
      newStart = startOfYear(next); newEnd = endOfYear(next);
      if (newStart > today) { newStart = startOfYear(today); newEnd = today; }
      else if (newEnd > today) newEnd = today;
    } else {
      newStart = addDays(dateRange.end, 1);
      newEnd = addDays(newStart, dateRangeInfo.durationInDays);
      if (newEnd > today) newEnd = today;
    }
    onDateRangeChange(newStart, newEnd);
  }, [onDateRangeChange, dateRangeInfo, dateRange]);

  if (!insights) return null;

  // ─── Build tile cards ────────────────────────────────────────────────────────
  type Tile = { icon: React.JSX.Element; label: string; value: string; sub: string; accent?: string };

  const tiles: Tile[] = ([
    // Total spending
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      label: 'Total spent',
      value: formatCurrency(insights.currentSpending),
      sub: `${insights.transactionCount} transactions`,
    },
    // Share of total
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 019.95 9H12V2z" />
        </svg>
      ),
      label: 'Share of total',
      value: `${insights.pctOfTotal.toFixed(1)}%`,
      sub: 'of period spending',
    },
    // Trend vs previous period
    insights.hasCompData ? {
      icon: insights.trendDir === 'up'
        ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        ) : insights.trendDir === 'down'
          ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 7L7 17M7 17H17M7 17V7" />
            </svg>
          )
          : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
            </svg>
          ),
      label: 'vs prev period',
      value: insights.trendDir === 'stable' ? '—' : `${insights.trendPct.toFixed(0)}%`,
      sub: formatCurrency(insights.comparisonSpending) + ' previously',
      accent: insights.trendDir === 'up' ? 'text-orange-400' : insights.trendDir === 'down' ? 'text-green' : undefined,
    } : null,
    // Daily average
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
      label: 'Daily avg',
      value: formatCurrency(insights.dailyAverage),
      sub: `${formatCurrency(insights.monthlyProjection)} / month`,
    },
    // Avg per transaction
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
      label: 'Per transaction',
      value: formatCurrency(insights.averageTransaction),
      sub: insights.largestTxn > 0 ? `largest ${formatCurrency(insights.largestTxn)}` : '',
    },
    // Busiest day
    insights.busiestDay ? {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: 'Busiest day',
      value: insights.busiestDay,
      sub: formatCurrency(insights.busiestDayAmount) + ' total',
    } : null,
    // Most visited vendor (only for group/category filters that have >1 vendor)
    (filterType !== 'vendor' && insights.mostFreqVendor && insights.mostFreqVendorCount > 1) ? {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9" />
        </svg>
      ),
      label: 'Most visited',
      value: insights.mostFreqVendor,
      sub: `${insights.mostFreqVendorCount} transactions`,
    } : null,
    // Most consistent vendor
    (filterType !== 'vendor' && insights.mostConsistentVendor && insights.mostConsistentVendorWeeks > 1) ? {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      ),
      label: 'Most consistent',
      value: insights.mostConsistentVendor!,
      sub: `${insights.mostConsistentVendorWeeks} distinct weeks`,
    } : null,
    // No-spend streak
    insights.longestStreak > 1 ? {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      label: 'No-spend streak',
      value: `${insights.longestStreak} day${insights.longestStreak !== 1 ? 's' : ''}`,
      sub: 'longest consecutive',
    } : null,
    // Weekend spend
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
      label: 'Weekend spend',
      value: `${insights.weekendPct.toFixed(0)}%`,
      sub: formatCurrency(insights.weekendSpend) + ' of total',
    },
  ] as (Tile | null)[]).filter((t): t is Tile => t !== null);

  const accentColor = filterColor || 'rgba(186, 194, 255, 0.8)';
  const breakdownLabel = filterType === 'group' ? 'Categories' : filterType === 'category' ? 'Vendors' : 'Categories';

  return (
    <div
      className="stats-card border border-green/20"
      key={`${filterId}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base leading-tight">{filterLabel}</h3>
            <p className="text-xs text-white/40 capitalize">{filterType} insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Period navigation */}
          <button
            onClick={handleNavigatePrev}
            disabled={!dateRangeInfo.canNavigatePrev}
            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${dateRangeInfo.canNavigatePrev ? 'text-white/60 hover:text-white hover:bg-white/[.08]' : 'text-white/20 cursor-not-allowed'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="rotate-180">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs text-white/50 tabular-nums hidden sm:block">{dateRangeInfo.rangeText}</span>
          <button
            onClick={handleNavigateNext}
            disabled={!dateRangeInfo.canNavigateNext}
            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${dateRangeInfo.canNavigateNext ? 'text-white/60 hover:text-white hover:bg-white/[.08]' : 'text-white/20 cursor-not-allowed'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="ml-1 flex items-center justify-center w-7 h-7 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[.06] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date range label on mobile (below header) */}
      <p className="sm:hidden text-xs text-white/40 mb-3">{dateRangeInfo.rangeText}</p>

      {/* Insight tiles grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-2 mb-3">
        {tiles.map((tile, i) => (
          <div key={i} className="bg-white/[.03] rounded-lg p-3 flex flex-col gap-1 min-w-0">
            <div className={`flex items-center gap-1.5 mb-0.5 ${tile.accent ?? 'text-white/40'}`}>
              {tile.icon}
              <span className="text-xs truncate">{tile.label}</span>
            </div>
            <div className={`text-sm font-semibold truncate ${tile.accent ?? 'text-white'}`}>{tile.value}</div>
            {tile.sub && <div className="text-xs text-white/40 truncate">{tile.sub}</div>}
          </div>
        ))}
      </div>

      {/* Top breakdown */}
      {insights.breakdown.length > 0 && (
        <div className="bg-white/[.03] rounded-lg p-3 mb-3">
          <h4 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">Top {breakdownLabel}</h4>
          <div className="space-y-1.5">
            {insights.breakdown.map((item, i) => {
              const maxAmt = insights.breakdown[0]?.amount || 1;
              const pct = (item.amount / maxAmt) * 100;
              return (
                <div key={item.name + i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-white/80 truncate flex-1 mr-2">{item.name}</span>
                    <span className="text-xs font-medium text-white shrink-0 tabular-nums">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full bg-white/[.05] rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "View previous period" footer */}
      {insights.hasFullCompCoverage && (
        <div className="flex justify-end">
          <button
            onClick={() => onSetComparisonPeriod(insights.compPeriod.start, insights.compPeriod.end)}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            View previous period
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
