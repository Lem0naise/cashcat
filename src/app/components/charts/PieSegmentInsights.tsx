'use client';

import React, { useMemo } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
}

export default function PieSegmentInsights({
  segment,
  transactions,
  categories,
  dateRange,
  onClose,
  onFilterBySegment,
  onSetComparisonPeriod,
  isMobileOptimized = false
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

    // Calculate comparison period (same length, immediately before current period)
    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const comparisonStart = new Date(dateRange.start.getTime() - periodDuration);
    const comparisonEnd = new Date(dateRange.start.getTime());

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
      .sort(([,a], [,b]) => b.amount - a.amount)[0];

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
      className={`bg-white/[.05] rounded-lg p-6 border border-green/20 flex flex-col ${
        isMobileOptimized ? '' : 'h-full'
      }`} 
      style={isMobileOptimized ? {} : { minHeight: '600px' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: segment.color }}
          />
          <div>
            <h3 className="font-semibold text-white text-2xl">{segment.label}</h3>
            <p className="text-sm text-white/60 capitalize">{segment.type} Insights</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white/80 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/[.03] rounded-lg p-3">
          <div className="text-sm text-white/50 mb-1">Total Spending</div>
          <div className="text-xl font-bold text-white">{formatCurrency(insights.currentSpending)}</div>
          <div className="text-xs text-white/40">{insights.transactionCount} transactions</div>
        </div>
        <div className="bg-white/[.03] rounded-lg p-3">
          <div className="text-sm text-white/50 mb-1">Share of Total</div>
          <div className="text-xl font-bold text-white">{insights.percentageOfTotal.toFixed(1)}%</div>
          <div className="text-xs text-white/40">of total period spending</div>
        </div>
      </div>

      {/* Spending Patterns */}
      <div className="bg-white/[.03] rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-medium text-white">Spending Patterns</h4>
          <div className="group relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/40 hover:text-white/60 transition-colors cursor-help hidden md:block">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white/90 text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10 pointer-events-none hidden md:block">
              Calculated from your daily average spending
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-white/50 mb-1">Daily Average</div>
            <div className="text-lg font-bold text-white">{formatCurrency(insights.dailyAverage)}</div>
          </div>
          <div>
            <div className="text-sm text-white/50 mb-1">Avg per Transaction</div>
            <div className="text-lg font-bold text-white">{formatCurrency(insights.averageTransaction)}</div>
          </div>
          <div>
            <div className="text-sm text-white/50 mb-1">Weekly Projection</div>
            <div className="text-lg font-bold text-white">{formatCurrency(insights.weeklyProjection)}</div>
          </div>
          <div>
            <div className="text-sm text-white/50 mb-1">Monthly Projection</div>
            <div className="text-lg font-bold text-white">{formatCurrency(insights.monthlyProjection)}</div>
          </div>
        </div>
        
        {insights.largestTransaction > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Largest Transaction:</span>
              <span className="font-medium text-white">{formatCurrency(insights.largestTransaction)}</span>
            </div>
          </div>
        )}
        
        {insights.averageDaysBetweenTransactions > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Frequency:</span>
              <span className="font-medium text-white">
                Every {insights.averageDaysBetweenTransactions.toFixed(1)} days
              </span>
            </div>
          </div>
        )}

        {insights.mostActiveDay && (
          <div className="mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Most Active Day:</span>
              <span className="font-medium text-white">
                {insights.mostActiveDay[0]} ({formatCurrency(insights.mostActiveDay[1].amount)})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Trend Analysis */}
      <div className="bg-white/[.03] rounded-lg p-4 mb-6">
        <h4 className="font-medium text-white mb-3">Spending Trend Insights</h4>
        <div className="flex items-center gap-2 mb-3">
          {insights.hasComparisonData && insights.trendDirection === 'up' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange-400">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {insights.hasComparisonData && insights.trendDirection === 'down' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green">
              <path d="M17 7L7 17M7 17H17M7 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {(!insights.hasComparisonData || insights.trendDirection === 'stable') && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/50">
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          <span className={`font-medium ${
            insights.hasComparisonData && insights.trendDirection === 'up' ? 'text-orange-400' : 
            insights.hasComparisonData && insights.trendDirection === 'down' ? 'text-green' : 'text-white/70'
          }`}>
            {insights.hasComparisonData && insights.trendDirection === 'up' && `${insights.trendPercentage.toFixed(1)}% increase`}
            {insights.hasComparisonData && insights.trendDirection === 'down' && `${insights.trendPercentage.toFixed(1)}% decrease`}
            {(!insights.hasComparisonData || insights.trendDirection === 'stable') && 'No comparison data available'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-sm text-white/50 mb-1">Current Period</div>
            <div className="font-medium text-white">{formatCurrency(insights.currentSpending)}</div>
            <div className="text-xs text-white/40">{insights.transactionCount} transactions</div>
          </div>
          <div>
            <div className="text-sm text-white/50 mb-1">Previous Period</div>
            <div className="font-medium text-white">
              {insights.comparisonSpending > 0 ? formatCurrency(insights.comparisonSpending) : 'No data'}
            </div>
            <div className="text-xs text-white/40">
              {insights.comparisonTransactionCount > 0 ? `${insights.comparisonTransactionCount} transactions` : ''}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            Compared to {format(insights.comparisonPeriod.start, 'MMM dd')} - {format(insights.comparisonPeriod.end, 'MMM dd')}
          </p>
          {insights.hasFullComparisonCoverage && (
            <button
              onClick={() => {
                onSetComparisonPeriod(insights.comparisonPeriod.start, insights.comparisonPeriod.end);
                // Scroll to top of page to show updated chart (with small delay to ensure DOM updates)
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
              }}
              className="ml-3 bg-green hover:bg-green/90 text-black font-medium py-1.5 px-3 rounded-lg transition-colors cursor-pointer active:scale-[0.98] text-xs"
              title="Set time range to comparison period"
            >
              View Period
            </button>
          )}
        </div>
        
        {insights.trendDirection !== 'stable' && (
          <div className="mt-3 p-3 rounded-lg bg-white/[.02] border-l-2 border-blue/50">
            <p className="text-sm text-white/80">
              {insights.trendDirection === 'up' && (
                <span>
                  💡 Your spending has increased. Consider reviewing your budget for this {segment.type} 
                  or look for cost-saving opportunities.
                </span>
              )}
              {insights.trendDirection === 'down' && (
                <span>
                  ✅ Great job! Your spending has decreased. This positive trend suggests better budget control 
                  in this {segment.type}.
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      {insights.breakdown.length > 0 && (
        <div className="bg-white/[.03] rounded-lg p-4 mb-6">
          <h4 className="font-medium text-white mb-3">
            Top {segment.type === 'group' ? 'Categories' : 'Vendors'}
          </h4>
          <div className="space-y-2">
            {insights.breakdown.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                <span className="text-sm text-white/90">{item.name}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{formatCurrency(item.amount)}</div>
                  <div className="text-xs text-white/50">{item.count} transactions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Action - Only show for groups and categories, not vendors */}
      {segment.type !== 'vendor' && (
        <button
          onClick={() => {
            onFilterBySegment(segment);
            // Scroll to top of page to show updated chart (with small delay to ensure DOM updates)
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
          }}
          className="w-full bg-green hover:bg-green/90 text-black font-medium py-3 px-4 rounded-lg transition-colors mb-6 cursor-pointer active:scale-[0.98]"
        >
          Show in-depth stats for {segment.label}
        </button>
      )}
      </div>
    </div>
  );
}
