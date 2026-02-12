'use client';

import React, { useMemo } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, subYears, startOfYear, endOfYear } from 'date-fns';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

interface PieSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
  id: string;
  type: 'group' | 'category' | 'vendor';
}

interface PieSegmentInsightsProps {
  segment: PieSegment | null;
  transactions: Transaction[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  onClose: () => void;
  onFilterBySegment: (segment: PieSegment) => void;
  onSetComparisonPeriod: (start: Date, end: Date) => void;
  isMobileOptimized?: boolean; // New prop for mobile layout optimization
  isPersistedGroupView?: boolean; // New prop to indicate this is a persisted group insights view
  timeRange?: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom';
}

export default function PieSegmentInsights({
  segment,
  transactions,
  categories,
  dateRange,
  onClose,
  onFilterBySegment,
  onSetComparisonPeriod,
  isMobileOptimized = false,
  isPersistedGroupView = false,
  timeRange
}: PieSegmentInsightsProps) {
  // Calculate insights for the selected segment
  const insights = useMemo(() => {
    if (!segment) return null;

    // Create category map for lookups
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Filter transactions for this segment within the date range
    const segmentTransactions = transactions.filter(transaction => {
      if (!transaction || transaction.type !== 'payment') return false;

      const transactionDate = new Date(transaction.date);
      if (transactionDate < dateRange.start || transactionDate > dateRange.end) return false;

      if (segment.type === 'group') {
        if (!transaction.category_id) return false;
        const category = categoryMap.get(transaction.category_id);
        if (!category) return false;
        const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
        return groupName === segment.id;
      } else if (segment.type === 'category') {
        return transaction.category_id === segment.id;
      } else if (segment.type === 'vendor') {
        return transaction.vendor === segment.id;
      }

      return false;
    });

    // Calculate current period spending
    const currentSpending = segmentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transactionCount = segmentTransactions.length;

    // Calculate average transaction amount
    const averageTransaction = transactionCount > 0 ? currentSpending / transactionCount : 0;


    // Calculate comparison period
    let comparisonStart: Date;
    let comparisonEnd: Date;

    // Detect if we're in MTD or YTD mode (similar to PieChart's logic)
    const isCompleteMonth = dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
    const isCompleteYear = dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfYear(dateRange.start).getTime();

    const actualMode = (timeRange === 'mtd' || isCompleteMonth) ? 'mtd' :
      (timeRange === 'ytd' || isCompleteYear) ? 'ytd' :
        timeRange;

    if (actualMode === 'mtd') {
      // For MTD, compare to the complete previous month
      const prevMonth = subMonths(dateRange.start, 1);
      comparisonStart = startOfMonth(prevMonth);
      comparisonEnd = endOfMonth(prevMonth);
    } else if (actualMode === 'ytd') {
      // For YTD, compare to the complete previous year
      const prevYear = subYears(dateRange.start, 1);
      comparisonStart = startOfYear(prevYear);
      comparisonEnd = endOfYear(prevYear);
    } else {
      // For duration-based ranges, use the same duration immediately before
      const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
      comparisonStart = new Date(dateRange.start.getTime() - periodDuration);
      comparisonEnd = new Date(dateRange.start.getTime());
    }

    // Filter transactions for comparison period
    const comparisonTransactions = transactions.filter(transaction => {
      if (!transaction || transaction.type !== 'payment') return false;

      const transactionDate = new Date(transaction.date);
      if (transactionDate < comparisonStart || transactionDate > comparisonEnd) return false;

      if (segment.type === 'group') {
        if (!transaction.category_id) return false;
        const category = categoryMap.get(transaction.category_id);
        if (!category) return false;
        const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
        return groupName === segment.id;
      } else if (segment.type === 'category') {
        return transaction.category_id === segment.id;
      } else if (segment.type === 'vendor') {
        return transaction.vendor === segment.id;
      }

      return false;
    });

    const comparisonSpending = comparisonTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const comparisonTransactionCount = comparisonTransactions.length;

    // Calculate trend
    let trendPercentage = 0;
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let hasComparisonData = comparisonSpending > 0;

    if (comparisonSpending > 0) {
      trendPercentage = ((currentSpending - comparisonSpending) / comparisonSpending) * 100;
      if (trendPercentage > 5) {
        trendDirection = 'up';
      } else if (trendPercentage < -5) {
        trendDirection = 'down';
      }
    } else if (currentSpending > 0) {
      // Only show increase if we actually have comparison data
      // Don't show 100% increase when previous period has no data
      trendDirection = 'stable';
      trendPercentage = 0;
      hasComparisonData = false;
    }

    // Find top vendors/categories within this segment
    let breakdown: { name: string; amount: number; count: number }[] = [];

    if (segment.type === 'group') {
      // Show top categories within this group
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
    } else if (segment.type === 'category') {
      // Show top vendors within this category
      const vendorSpending: { [vendor: string]: { name: string; amount: number; count: number } } = {};

      segmentTransactions.forEach(transaction => {
        if (!transaction.vendor) return;

        if (!vendorSpending[transaction.vendor]) {
          vendorSpending[transaction.vendor] = { name: transaction.vendor, amount: 0, count: 0 };
        }
        vendorSpending[transaction.vendor].amount += Math.abs(transaction.amount);
        vendorSpending[transaction.vendor].count += 1;
      });

      breakdown = Object.values(vendorSpending).sort((a, b) => b.amount - a.amount).slice(0, 5);
    }

    // Calculate daily average
    const daysDuration = Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = currentSpending / daysDuration;

    // Calculate weekly and monthly projections
    const weeklyProjection = dailyAverage * 7;
    const monthlyProjection = dailyAverage * 30;

    // Calculate frequency insights
    const averageDaysBetweenTransactions = transactionCount > 1 ? daysDuration / (transactionCount - 1) : 0;

    // Find largest single transaction
    const largestTransaction = segmentTransactions.reduce((max, t) => {
      const amount = Math.abs(t.amount);
      return amount > max ? amount : max;
    }, 0);

    // Calculate spending patterns by day of week
    const dayOfWeekSpending: { [key: string]: { amount: number; count: number } } = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    segmentTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayName = daysOfWeek[date.getDay()];

      if (!dayOfWeekSpending[dayName]) {
        dayOfWeekSpending[dayName] = { amount: 0, count: 0 };
      }
      dayOfWeekSpending[dayName].amount += Math.abs(transaction.amount);
      dayOfWeekSpending[dayName].count += 1;
    });

    // Find most active day
    const mostActiveDay = Object.entries(dayOfWeekSpending)
      .sort(([, a], [, b]) => b.amount - a.amount)[0];

    // Calculate percentage of total budget/spending
    const allSegmentTransactions = transactions.filter(t => {
      if (!t || t.type !== 'payment') return false;
      const transactionDate = new Date(t.date);
      return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
    });
    const totalPeriodSpending = allSegmentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const percentageOfTotal = totalPeriodSpending > 0 ? (currentSpending / totalPeriodSpending) * 100 : 0;

    // Check transaction coverage in comparison period
    // We consider there's 100% coverage if:
    // 1. We have transactions in the comparison period for this segment, AND
    // 2. We have transactions spanning at least 80% of the comparison period days, OR
    // 3. The comparison period has transactions from multiple weeks (indicating good coverage)
    const hasFullComparisonCoverage = (() => {
      if (comparisonTransactionCount === 0) return false;

      // Get all transaction dates in comparison period
      const comparisonDates = comparisonTransactions.map(t => new Date(t.date).toDateString());
      const uniqueDates = new Set(comparisonDates);

      // Calculate total days in comparison period
      const totalComparisonDays = Math.ceil((comparisonEnd.getTime() - comparisonStart.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we have good coverage (at least 80% of days with data or multiple weeks)
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
      comparisonPeriod: {
        start: comparisonStart,
        end: comparisonEnd
      }
    };
  }, [segment, transactions, categories, dateRange]);

  if (!segment || !insights) return null;

  return (
    <div
      className={`bg-white/[.05] rounded-lg p-4 sm:p-6 border border-green/20 flex flex-col transition-all duration-200 ${isMobileOptimized ? '' : 'h-full'
        }`}
      style={isMobileOptimized ? {} : { minHeight: '500px' }}
      key={`${segment?.id}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
            style={{ backgroundColor: segment.color }}
          />
          <div>
            <h3 className="font-semibold text-white text-lg sm:text-2xl">{segment.label}</h3>
            <p className="text-xs sm:text-sm text-white/60 capitalize">
              {segment.type} Insights
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white/80 transition-colors p-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Date Range Display - compact single line */}
      <div className="flex items-center justify-center gap-2 mb-3 py-1.5 px-3 bg-white/[.02] rounded-lg border border-white/10 text-xs sm:text-sm">
        <span className="text-white/50">Period:</span>
        <span className="text-white font-medium">
          {format(dateRange.start, 'MMM dd')} – {format(dateRange.end, 'MMM dd, yyyy')}
        </span>
        <span className="text-white/40">
          ({Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1}d)
        </span>
      </div>

      {/* Helpful tip for persisted group view - hidden on small mobile */}
      {isPersistedGroupView && segment && segment.type === 'group' && (
        <div className="hidden sm:block bg-blue/10 border border-blue/20 rounded-lg p-2 mb-4">
          <p className="text-xs text-white/70">
            💡 Detailed view for <strong className="text-white/90">{segment.label}</strong> — click a category in the chart for more.
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
          <div className="bg-white/[.03] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-white/50 mb-0.5">Total Spending</div>
            <div className="text-base sm:text-xl font-bold text-white">{formatCurrency(insights.currentSpending)}</div>
            <div className="text-xs text-white/40">{insights.transactionCount} txns</div>
          </div>
          <div className="bg-white/[.03] rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-white/50 mb-0.5">Share of Total</div>
            <div className="text-base sm:text-xl font-bold text-white">{insights.percentageOfTotal.toFixed(1)}%</div>
            <div className="text-xs text-white/40">of period total</div>
          </div>
        </div>

        {/* Spending Patterns - compact */}
        <div className="bg-white/[.03] rounded-lg p-3 sm:p-4 mb-4">
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

        {/* Trend Analysis - compact */}
        <div className="bg-white/[.03] rounded-lg p-3 sm:p-4 mb-4">
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
                {insights.hasComparisonData && insights.trendDirection === 'up' && `↑ ${insights.trendPercentage.toFixed(0)}%`}
                {insights.hasComparisonData && insights.trendDirection === 'down' && `↓ ${insights.trendPercentage.toFixed(0)}%`}
                {(!insights.hasComparisonData || insights.trendDirection === 'stable') && '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            <div>
              <div className="text-white/50 mb-0.5">Current</div>
              <div className="font-medium text-white">{formatCurrency(insights.currentSpending)}</div>
            </div>
            <div>
              <div className="text-white/50 mb-0.5">Previous</div>
              <div className="font-medium text-white">
                {insights.comparisonSpending > 0 ? formatCurrency(insights.comparisonSpending) : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <p className="text-xs text-white/40">
              vs {format(insights.comparisonPeriod.start, 'MMM dd')} – {format(insights.comparisonPeriod.end, 'MMM dd')}
            </p>
            {insights.hasFullComparisonCoverage && (
              <button
                onClick={() => {
                  onSetComparisonPeriod(insights.comparisonPeriod.start, insights.comparisonPeriod.end);
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                }}
                className="bg-green hover:bg-green/90 text-black font-medium py-1 px-2.5 rounded-md transition-colors cursor-pointer active:scale-[0.98] text-xs"
              >
                View
              </button>
            )}
          </div>
        </div>

        {/* Breakdown - compact */}
        {insights.breakdown.length > 0 && (
          <div className="bg-white/[.03] rounded-lg p-3 sm:p-4 mb-4">
            <h4 className="font-medium text-white text-sm mb-2">
              Top {segment.type === 'group' ? 'Categories' : 'Vendors'}
            </h4>
            <div className="space-y-1.5">
              {insights.breakdown.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-white/90 truncate mr-2">{item.name}</span>
                  <span className="font-medium text-white shrink-0">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Action */}
        {segment && segment.type !== 'vendor' && (
          <button
            onClick={() => {
              if (isPersistedGroupView && segment.type === 'group') return;
              onFilterBySegment(segment);
              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
            }}
            className={`w-full font-medium py-2.5 px-4 rounded-lg transition-colors mb-4 cursor-pointer active:scale-[0.98] text-sm ${isPersistedGroupView && segment.type === 'group'
                ? 'bg-white/10 text-white/70 cursor-default'
                : 'bg-green hover:bg-green/90 text-black'
              }`}
            disabled={isPersistedGroupView && segment.type === 'group'}
          >
            {isPersistedGroupView && segment.type === 'group'
              ? `Viewing ${segment.label}`
              : `Drill into ${segment.label}`
            }
          </button>
        )}
      </div>
    </div>
  );
}
