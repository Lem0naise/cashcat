'use client';

import React, { useMemo, useCallback } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, subYears, startOfYear, endOfYear, differenceInDays, addDays, subDays } from 'date-fns';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

export interface FilterInsightsProps {
  filterType: 'group' | 'category' | 'vendor';
  filterId: string;       // group name, category id, or vendor name
  filterLabel: string;    // display name
  filterColor?: string;   // optional accent
  transactions: Transaction[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  timeRange?: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom';
  allTimeRange?: { start: Date; end: Date };
  onDateRangeChange?: (start: Date, end: Date) => void;
  onClose: () => void;
  onSetComparisonPeriod: (start: Date, end: Date) => void;
}

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
  const insights = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Filter transactions for this filter within the date range
    const segmentTransactions = transactions.filter(transaction => {
      if (!transaction || transaction.type !== 'payment') return false;

      const transactionDate = new Date(transaction.date);
      if (transactionDate < dateRange.start || transactionDate > dateRange.end) return false;

      if (filterType === 'group') {
        if (!transaction.category_id) return false;
        const category = categoryMap.get(transaction.category_id);
        if (!category) return false;
        const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
        return groupName === filterId;
      } else if (filterType === 'category') {
        return transaction.category_id === filterId;
      } else if (filterType === 'vendor') {
        return transaction.vendor === filterId;
      }

      return false;
    });

    // Current period
    const currentSpending = segmentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transactionCount = segmentTransactions.length;
    const averageTransaction = transactionCount > 0 ? currentSpending / transactionCount : 0;

    // Comparison period
    let comparisonStart: Date;
    let comparisonEnd: Date;

    const isCompleteMonth = dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
    const isCompleteYear = dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfYear(dateRange.start).getTime();

    const actualMode = (timeRange === 'mtd' || isCompleteMonth) ? 'mtd' :
      (timeRange === 'ytd' || isCompleteYear) ? 'ytd' :
        timeRange;

    if (actualMode === 'mtd') {
      const prevMonth = subMonths(dateRange.start, 1);
      comparisonStart = startOfMonth(prevMonth);
      comparisonEnd = endOfMonth(prevMonth);
    } else if (actualMode === 'ytd') {
      const prevYear = subYears(dateRange.start, 1);
      comparisonStart = startOfYear(prevYear);
      comparisonEnd = endOfYear(prevYear);
    } else {
      const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
      comparisonStart = new Date(dateRange.start.getTime() - periodDuration);
      comparisonEnd = new Date(dateRange.start.getTime());
    }

    // Comparison transactions
    const comparisonTransactions = transactions.filter(transaction => {
      if (!transaction || transaction.type !== 'payment') return false;
      const transactionDate = new Date(transaction.date);
      if (transactionDate < comparisonStart || transactionDate > comparisonEnd) return false;

      if (filterType === 'group') {
        if (!transaction.category_id) return false;
        const category = categoryMap.get(transaction.category_id);
        if (!category) return false;
        const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
        return groupName === filterId;
      } else if (filterType === 'category') {
        return transaction.category_id === filterId;
      } else if (filterType === 'vendor') {
        return transaction.vendor === filterId;
      }
      return false;
    });

    const comparisonSpending = comparisonTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const comparisonTransactionCount = comparisonTransactions.length;

    // Trend
    let trendPercentage = 0;
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let hasComparisonData = comparisonSpending > 0;

    if (comparisonSpending > 0) {
      trendPercentage = ((currentSpending - comparisonSpending) / comparisonSpending) * 100;
      if (trendPercentage > 5) trendDirection = 'up';
      else if (trendPercentage < -5) trendDirection = 'down';
    } else if (currentSpending > 0) {
      trendDirection = 'stable';
      trendPercentage = 0;
      hasComparisonData = false;
    }

    // Breakdown (sub-items within the filter)
    let breakdown: { name: string; amount: number; count: number }[] = [];

    if (filterType === 'group') {
      const categorySpending: { [categoryId: string]: { name: string; amount: number; count: number } } = {};
      segmentTransactions.forEach(transaction => {
        if (!transaction.category_id) return;
        const category = categoryMap.get(transaction.category_id);
        if (!category) return;
        if (!categorySpending[category.id]) {
          categorySpending[category.id] = { name: category.name, amount: 0, count: 0 };
        }
        categorySpending[category.id].amount += Math.abs(transaction.amount);
        categorySpending[category.id].count += 1;
      });
      breakdown = Object.values(categorySpending).sort((a, b) => b.amount - a.amount).slice(0, 5);
    } else if (filterType === 'category' || filterType === 'vendor') {
      const vendorSpending: { [vendor: string]: { name: string; amount: number; count: number } } = {};
      segmentTransactions.forEach(transaction => {
        let key: string;
        if (filterType === 'category') {
          key = transaction.vendor || 'Unknown';
        } else {
          // vendor filter: break down by category
          const cat = transaction.category_id ? categoryMap.get(transaction.category_id) : null;
          key = cat ? cat.name : 'Uncategorized';
        }
        if (!vendorSpending[key]) {
          vendorSpending[key] = { name: key, amount: 0, count: 0 };
        }
        vendorSpending[key].amount += Math.abs(transaction.amount);
        vendorSpending[key].count += 1;
      });
      breakdown = Object.values(vendorSpending).sort((a, b) => b.amount - a.amount).slice(0, 5);
    }

    // Averages and patterns
    const daysDuration = Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = currentSpending / daysDuration;
    const weeklyProjection = dailyAverage * 7;
    const monthlyProjection = dailyAverage * 30;
    const averageDaysBetweenTransactions = transactionCount > 1 ? daysDuration / (transactionCount - 1) : 0;
    const largestTransaction = segmentTransactions.reduce((max, t) => {
      const amount = Math.abs(t.amount);
      return amount > max ? amount : max;
    }, 0);

    // Day-of-week patterns
    const dayOfWeekSpending: { [key: string]: { amount: number; count: number } } = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    segmentTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayName = daysOfWeek[date.getDay()];
      if (!dayOfWeekSpending[dayName]) dayOfWeekSpending[dayName] = { amount: 0, count: 0 };
      dayOfWeekSpending[dayName].amount += Math.abs(transaction.amount);
      dayOfWeekSpending[dayName].count += 1;
    });
    const mostActiveDay = Object.entries(dayOfWeekSpending).sort(([, a], [, b]) => b.amount - a.amount)[0];

    // Share of total
    const allPeriodTransactions = transactions.filter(t => {
      if (!t || t.type !== 'payment') return false;
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const totalPeriodSpending = allPeriodTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const percentageOfTotal = totalPeriodSpending > 0 ? (currentSpending / totalPeriodSpending) * 100 : 0;

    // Comparison coverage check
    const hasFullComparisonCoverage = (() => {
      if (comparisonTransactionCount === 0) return false;
      const comparisonDates = comparisonTransactions.map(t => new Date(t.date).toDateString());
      const uniqueDates = new Set(comparisonDates);
      const totalComparisonDays = Math.ceil((comparisonEnd.getTime() - comparisonStart.getTime()) / (1000 * 60 * 60 * 24));
      const coverageRatio = uniqueDates.size / totalComparisonDays;
      const hasMultipleWeeks = totalComparisonDays >= 14 && comparisonTransactionCount >= 3;
      return coverageRatio >= 0.8 || hasMultipleWeeks;
    })();

    return {
      currentSpending,
      transactionCount,
      averageTransaction,
      comparisonSpending,
      comparisonTransactionCount,
      trendPercentage: Math.abs(trendPercentage),
      trendDirection,
      hasComparisonData,
      hasFullComparisonCoverage,
      breakdown,
      dailyAverage,
      weeklyProjection,
      monthlyProjection,
      averageDaysBetweenTransactions,
      largestTransaction,
      mostActiveDay,
      percentageOfTotal,
      comparisonPeriod: { start: comparisonStart, end: comparisonEnd },
    };
  }, [filterType, filterId, transactions, categories, dateRange, timeRange]);

  // Period navigation (same logic as PieChart)
  const dateRangeInfo = useMemo(() => {
    const durationInDays = differenceInDays(dateRange.end, dateRange.start);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const isCompleteMonth = dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
    const isCompleteYear = dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfYear(dateRange.start).getTime();
    const isCurrentMonth = dateRange.start.getTime() === startOfMonth(today).getTime() &&
      dateRange.end.getTime() <= today.getTime() &&
      dateRange.end.getTime() >= startOfMonth(today).getTime();
    const isCurrentYear = dateRange.start.getTime() === startOfYear(today).getTime() &&
      dateRange.end.getTime() <= today.getTime() &&
      dateRange.end.getTime() >= startOfYear(today).getTime();

    const actualMode = (timeRange === 'mtd' || isCompleteMonth || isCurrentMonth) ? 'mtd' :
      (timeRange === 'ytd' || isCompleteYear || isCurrentYear) ? 'ytd' :
        timeRange;

    let isAtToday: boolean;
    let isAtStart: boolean;

    if (actualMode === 'mtd') {
      const currentMonth = startOfMonth(today);
      isAtToday = dateRange.start.getTime() === currentMonth.getTime();
      const prevMonth = subMonths(dateRange.start, 1);
      isAtStart = allTimeRange ? startOfMonth(prevMonth) < allTimeRange.start : false;
    } else if (actualMode === 'ytd') {
      const currentYear = startOfYear(today);
      isAtToday = dateRange.start.getTime() === currentYear.getTime();
      const prevYear = subYears(dateRange.start, 1);
      const prevYearEnd = endOfYear(prevYear);
      isAtStart = allTimeRange ? (prevYearEnd < allTimeRange.start || startOfYear(prevYear) > allTimeRange.end) : false;
    } else {
      isAtToday = differenceInDays(today, dateRange.end) <= 1;
      isAtStart = allTimeRange ? differenceInDays(dateRange.start, allTimeRange.start) <= 1 : false;
    }

    let rangeText: string;
    if (durationInDays < 32) {
      rangeText = `${format(dateRange.start, 'MMM dd')} – ${format(dateRange.end, 'MMM dd, yyyy')}`;
    } else {
      rangeText = `${format(dateRange.start, 'MMM yyyy')} – ${format(dateRange.end, 'MMM yyyy')}`;
    }

    return {
      durationInDays,
      actualMode,
      rangeText,
      canNavigateNext: !isAtToday,
      canNavigatePrev: !isAtStart && allTimeRange !== undefined,
    };
  }, [dateRange, timeRange, allTimeRange]);

  const handleNavigatePrev = useCallback(() => {
    if (!onDateRangeChange || !dateRangeInfo.canNavigatePrev) return;
    let newStart: Date, newEnd: Date;

    if (dateRangeInfo.actualMode === 'mtd') {
      const prevMonth = subMonths(startOfMonth(dateRange.start), 1);
      newStart = startOfMonth(prevMonth);
      newEnd = endOfMonth(prevMonth);
    } else if (dateRangeInfo.actualMode === 'ytd') {
      const prevYear = subYears(startOfYear(dateRange.start), 1);
      newStart = startOfYear(prevYear);
      newEnd = endOfYear(prevYear);
    } else {
      const duration = dateRangeInfo.durationInDays;
      newEnd = subDays(dateRange.start, 1);
      newStart = subDays(newEnd, duration);
    }

    if (allTimeRange) {
      if (dateRangeInfo.actualMode === 'mtd' || dateRangeInfo.actualMode === 'ytd') {
        if (newEnd < allTimeRange.start) return;
      } else {
        if (newStart < allTimeRange.start) return;
      }
    }
    onDateRangeChange(newStart, newEnd);
  }, [onDateRangeChange, dateRangeInfo, dateRange, allTimeRange]);

  const handleNavigateNext = useCallback(() => {
    if (!onDateRangeChange || !dateRangeInfo.canNavigateNext) return;
    let newStart: Date, newEnd: Date;
    const today = new Date();

    if (dateRangeInfo.actualMode === 'mtd') {
      const nextMonth = addDays(endOfMonth(startOfMonth(dateRange.start)), 1);
      newStart = startOfMonth(nextMonth);
      newEnd = endOfMonth(nextMonth);
      if (newStart > today) { newStart = startOfMonth(today); newEnd = today; }
      else if (newEnd > today) { newEnd = today; }
    } else if (dateRangeInfo.actualMode === 'ytd') {
      const nextYear = addDays(endOfYear(startOfYear(dateRange.start)), 1);
      newStart = startOfYear(nextYear);
      newEnd = endOfYear(nextYear);
      if (newStart > today) { newStart = startOfYear(today); newEnd = today; }
      else if (newEnd > today) { newEnd = today; }
    } else {
      const duration = dateRangeInfo.durationInDays;
      newStart = addDays(dateRange.end, 1);
      newEnd = addDays(newStart, duration);
      if (newEnd > today) { newEnd = today; }
    }
    onDateRangeChange(newStart, newEnd);
  }, [onDateRangeChange, dateRangeInfo, dateRange]);

  if (!insights) return null;

  const accentColor = filterColor || 'rgba(186, 194, 255, 0.8)';
  const breakdownLabel = filterType === 'group' ? 'Categories' : filterType === 'category' ? 'Vendors' : 'Categories';

  return (
    <div
      className="stats-card border border-green/20"
      key={`${filterId}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <div>
            <h3 className="font-semibold text-white text-base sm:text-lg">{filterLabel}</h3>
            <p className="text-xs text-white/50 capitalize">
              {filterType} insights
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white/80 transition-colors p-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Period navigation arrows */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={handleNavigatePrev}
          disabled={!dateRangeInfo.canNavigatePrev}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigatePrev
            ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90'
            : 'text-white/20 cursor-not-allowed'
            }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="rotate-180">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="text-center flex-1 mx-2">
          <div className="text-white font-medium text-sm">{dateRangeInfo.rangeText}</div>
        </div>

        <button
          onClick={handleNavigateNext}
          disabled={!dateRangeInfo.canNavigateNext}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigateNext
            ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90'
            : 'text-white/20 cursor-not-allowed'
            }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/[.03] rounded-lg p-2 sm:p-3">
          <div className="text-xs text-white/50 mb-0.5">Total Spending</div>
          <div className="text-base sm:text-xl font-bold text-white">{formatCurrency(insights.currentSpending)}</div>
          <div className="text-xs text-white/40">{insights.transactionCount} txns</div>
        </div>
        <div className="bg-white/[.03] rounded-lg p-2 sm:p-3">
          <div className="text-xs text-white/50 mb-0.5">Share of Total</div>
          <div className="text-base sm:text-xl font-bold text-white">{insights.percentageOfTotal.toFixed(1)}%</div>
          <div className="text-xs text-white/40">of period total</div>
        </div>
      </div>

      {/* Spending Patterns – compact */}
      <div className="bg-white/[.03] rounded-lg p-3 mb-3">
        <h4 className="font-medium text-white text-sm mb-2">Spending Patterns</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm">
          <div className="flex justify-between"><span className="text-white/50">Daily avg</span><span className="font-medium text-white">{formatCurrency(insights.dailyAverage)}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Per txn</span><span className="font-medium text-white">{formatCurrency(insights.averageTransaction)}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Weekly</span><span className="font-medium text-white">{formatCurrency(insights.weeklyProjection)}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Monthly</span><span className="font-medium text-white">{formatCurrency(insights.monthlyProjection)}</span></div>
        </div>
        {(insights.largestTransaction > 0 || insights.averageDaysBetweenTransactions > 0 || insights.mostActiveDay) && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1 text-xs sm:text-sm">
            {insights.largestTransaction > 0 && (
              <div className="flex justify-between"><span className="text-white/50">Largest txn</span><span className="font-medium text-white">{formatCurrency(insights.largestTransaction)}</span></div>
            )}
            {insights.averageDaysBetweenTransactions > 0 && (
              <div className="flex justify-between"><span className="text-white/50">Frequency</span><span className="font-medium text-white">Every {insights.averageDaysBetweenTransactions.toFixed(1)} days</span></div>
            )}
            {insights.mostActiveDay && (
              <div className="flex justify-between"><span className="text-white/50">Busiest day</span><span className="font-medium text-white">{insights.mostActiveDay[0]}</span></div>
            )}
          </div>
        )}
      </div>

      {/* Trend Analysis – compact */}
      <div className="bg-white/[.03] rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-white text-sm">Trend</h4>
          <div className="flex items-center gap-1.5">
            {insights.hasComparisonData && insights.trendDirection === 'up' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-orange-400">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {insights.hasComparisonData && insights.trendDirection === 'down' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green">
                <path d="M17 7L7 17M7 17H17M7 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className={`text-xs sm:text-sm font-medium ${insights.hasComparisonData && insights.trendDirection === 'up' ? 'text-orange-400' :
              insights.hasComparisonData && insights.trendDirection === 'down' ? 'text-green' : 'text-white/50'
              }`}>
              {insights.hasComparisonData && insights.trendDirection === 'up' && `${insights.trendPercentage.toFixed(0)}%`}
              {insights.hasComparisonData && insights.trendDirection === 'down' && `${insights.trendPercentage.toFixed(0)}%`}
              {(!insights.hasComparisonData || insights.trendDirection === 'stable') && '—'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">

          <div>
            <div className="text-white/50 mb-0.5">Previous</div>
            <div className="font-medium text-white">
              {insights.comparisonSpending > 0 ? formatCurrency(insights.comparisonSpending) : '—'}
            </div>
          </div>
          <div>
            <div className="text-white/50 mb-0.5">Current</div>
            <div className="font-medium text-white">{formatCurrency(insights.currentSpending)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/40">
            vs previous period
          </p>
          {insights.hasFullComparisonCoverage && (
            <button
              onClick={() => {
                onSetComparisonPeriod(insights.comparisonPeriod.start, insights.comparisonPeriod.end);
              }}
              className="bg-green hover:bg-green/90 text-black font-medium py-1 px-2.5 rounded-md transition-colors cursor-pointer active:scale-[0.98] text-xs"
            >
              View Previous
            </button>
          )}
        </div>
      </div>


    </div>
  );
}
