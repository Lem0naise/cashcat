// Data processing hooks for budget assignment chart
import { useMemo } from 'react';
import { format, startOfWeek, startOfMonth, addDays, isBefore, isEqual } from 'date-fns';
import { 
  Transaction, 
  Category, 
  ChartDataPoint, 
  VolumeDataPoint 
} from '../types';
import { getGranularityKey } from '../utils';

export const useFilteredTransactions = (
  transactions: Transaction[],
  categories: Category[],
  selectedGroups: string[],
  selectedCategories: string[]
) => {
  return useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    // Create a map for faster category lookups
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    return transactions.filter(transaction => {
      // Skip if transaction is null/undefined
      if (!transaction) return false;
      
      // Skip starting balance transactions
      if (transaction.type === 'starting') return false;
      
      // Find the category for this transaction
      const category = categoryMap.get(transaction.category_id);
      
      // Only filter out payments without categories (income can have no category)
      if (!category && transaction.type === 'payment') return false;
      
      // Apply category filters
      if (selectedCategories.length > 0) {
        return transaction.category_id && selectedCategories.includes(transaction.category_id);
      }
      
      // Apply group filters
      if (selectedGroups.length > 0) {
        if (!category) return false;
        const categoryGroup = (category as any).groups?.name || category.group || 'Uncategorized';
        return selectedGroups.includes(categoryGroup);
      }

      return true;
    });
  }, [transactions, categories, selectedGroups, selectedCategories]);
};

export const useChartData = (
  transactions: Transaction[],
  categories: Category[],
  dateRange: { start: Date; end: Date },
  timeRange?: '7d' | '30d' | '3m' | '12m' | 'all' | 'custom'
) => {
  return useMemo(() => {
    // Check if transactions is actually an array and validate inputs
    if (!Array.isArray(transactions) || !dateRange?.start || !dateRange?.end) {
      console.warn('Invalid input data for useChartData');
      return { dataPoints: [], volumePoints: [] };
    }

    // Always include ALL transactions for balance calculation
    const allTransactions = transactions || [];
    const validTransactions = allTransactions.filter(t => {
      return t && t.date && t.amount !== undefined && t.amount !== null && 
             !isNaN(t.amount) && isFinite(t.amount);
    });

    const allSorted = [...validTransactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate the actual starting balance for the chart
    // This should be: sum of all starting balances (one per account) + all transactions before the date range
    const startingTransactions = allTransactions.filter(t => t && t.type === 'starting');
    let chartStartingBalance = startingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Add all transactions that occurred before the date range to get the correct starting point
    const transactionsBeforeRange = allSorted.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return !isNaN(transactionDate.getTime()) && 
             transactionDate < dateRange.start &&
             transaction.type !== 'starting'; // Don't double-count starting balance
    });

    // Calculate balance up to the start of the date range
    transactionsBeforeRange.forEach(transaction => {
      if (transaction.type === 'income') {
        chartStartingBalance += transaction.amount;
      } else if (transaction.type === 'payment') {
        chartStartingBalance -= Math.abs(transaction.amount);
      }
    });

    // Validate starting balance
    if (isNaN(chartStartingBalance) || !isFinite(chartStartingBalance)) {
      chartStartingBalance = 0;
    }

    // Get transactions within date range for display purposes
    const transactionsInRange = allSorted.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inRange = !isNaN(transactionDate.getTime()) && 
             transactionDate >= dateRange.start && 
             transactionDate <= dateRange.end &&
             transaction.type !== 'starting'; // Starting balance is already included
      return inRange;
    });

    // Find the user's first transaction date (including starting balance)
    const allTransactionDates = (Array.isArray(transactions) ? transactions : [])
      .filter(t => t && t.date)
      .map(t => new Date(t.date))
      .filter(d => !isNaN(d.getTime()));
    const firstTransactionDate = allTransactionDates.length > 0 ? new Date(Math.min(...allTransactionDates.map(d => d.getTime()))) : null;

    // Clamp the chart's start date to the user's first transaction date
    let clampedStart = dateRange.start;
    if (firstTransactionDate && firstTransactionDate > dateRange.start) {
      clampedStart = firstTransactionDate;
    }
    // If the clamped start is after the end, return empty data
    if (clampedStart > dateRange.end) {
      return { dataPoints: [], volumePoints: [] };
    }
    // If the selected range is 'All Time', force the end date to today
    let effectiveEnd = dateRange.end;
    if (timeRange === 'all') {
      effectiveEnd = new Date();
      effectiveEnd.setHours(12, 0, 0, 0);
    }
    // --- Generate all period keys between clampedStart and effectiveEnd, even if no transactions ---
    const allPeriodKeys: string[] = [];
    let current = new Date(clampedStart);
    const end = new Date(effectiveEnd);
    while (isBefore(current, end) || isEqual(current, end)) {
      allPeriodKeys.push(format(current, 'yyyy-MM-dd 12:00:00'));
      current = addDays(current, 1);
    }
    // Filter out any period keys that are before the first transaction date
    const filteredPeriodKeys = firstTransactionDate
      ? allPeriodKeys.filter(key => new Date(key) >= firstTransactionDate)
      : allPeriodKeys;

    // If no transactions in range, create a flat line for the whole period
    if (transactionsInRange.length === 0) {
      const flatDataPoints = filteredPeriodKeys.map(periodKey => ({
        x: periodKey,
        y: chartStartingBalance,
        assignmentBreakdown: {}
      }));
      const flatVolumePoints = filteredPeriodKeys.map(periodKey => ({
        x: periodKey,
        assigned: 0,
        removed: 0,
        net: 0,
        categories: [],
        vendors: []
      }));
      return {
        dataPoints: flatDataPoints,
        volumePoints: flatVolumePoints
      };
    }

    // Create a category map for faster lookups
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Get unique transaction dates with validation
    const uniqueDates = [...new Set(transactionsInRange
      .map(t => t.date)
      .filter(date => {
        // Validate date format and ensure it's not null/undefined
        if (!date) return false;
        const testDate = new Date(date);
        return !isNaN(testDate.getTime());
      })
    )].sort();
    
    // Determine grouping strategy based on data density and time range
    const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Always try to maximize data points
    let groupedByPeriod: { [dateKey: string]: Transaction[] };
    
    // Strategy 1: Use individual dates if we have reasonable density
    if (uniqueDates.length <= 100) {
      // Use individual transaction dates for maximum granularity
      groupedByPeriod = uniqueDates.reduce((acc, date) => {
        // Validate the date before formatting
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date encountered:', date);
          return acc;
        }
        
        const key = format(dateObj, 'yyyy-MM-dd 12:00:00');
        acc[key] = transactionsInRange.filter(t => t.date === date);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }
    // Strategy 2: For very dense data, use time-based grouping but still maximize points
    else {
      groupedByPeriod = transactionsInRange.reduce((acc, transaction) => {
        const transactionDate = new Date(transaction.date);
        
        // Validate the date
        if (isNaN(transactionDate.getTime())) {
          console.warn('Invalid transaction date encountered:', transaction.date, 'for transaction:', transaction.id);
          return acc;
        }
        
        const key = getGranularityKey(transactionDate, diffInDays, true); // Force daily for line charts
        
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(transaction);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }

    const dataPoints: ChartDataPoint[] = [];
    const volumePoints: VolumeDataPoint[] = [];
    
    let cumulativeBalance = chartStartingBalance;

    // Calculate running balance for each period
    const sortedPeriodKeys = Object.keys(groupedByPeriod).sort();

    // Add starting point if we have transactions and it makes sense
    if (sortedPeriodKeys.length > 0) {
      const firstTransactionDate = new Date(sortedPeriodKeys[0]);
      
      // Validate the first transaction date
      if (!isNaN(firstTransactionDate.getTime())) {
        const dayBefore = new Date(firstTransactionDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        
        // Only add starting point if it's within our date range and wouldn't create too many points
        if (dayBefore >= dateRange.start && sortedPeriodKeys.length < 90) {
          const startingKey = format(dayBefore, 'yyyy-MM-dd 12:00:00');
          dataPoints.push({
            x: startingKey,
            y: chartStartingBalance,
            assignmentBreakdown: {}
          });
          
          volumePoints.push({
            x: startingKey,
            assigned: 0,
            removed: 0,
            net: 0,
            categories: [],
            vendors: []
          });
        }
      } else {
        console.warn('Invalid first transaction date:', sortedPeriodKeys[0]);
      }
    }
    
    // For each period, always push a dataPoint and a volumePoint for that periodKey
    sortedPeriodKeys.forEach((periodKey) => {
      const periodTransactions = groupedByPeriod[periodKey] || [];
      
      let income = 0;
      let spending = 0;
      let netChange = 0;
      const affectedCategories: string[] = [];
      const affectedVendors: string[] = [];
      const categoryBreakdown: { [categoryId: string]: number } = {};

      // Process transactions for this period
      periodTransactions.forEach(transaction => {
        if (!transaction || typeof transaction.amount !== 'number') return;
        
        const amount = transaction.amount;
        
        if (transaction.type === 'income') {
          income += amount;
          netChange += amount;
        } else if (transaction.type === 'payment') {
          spending += Math.abs(amount);
          netChange -= Math.abs(amount);
        }

        // Track category breakdown
        if (transaction.category_id) {
          const category = categoryMap.get(transaction.category_id);
          if (category) {
            if (!categoryBreakdown[transaction.category_id]) {
              categoryBreakdown[transaction.category_id] = 0;
            }
            categoryBreakdown[transaction.category_id] += transaction.type === 'payment' ? -Math.abs(amount) : amount;
            
            if (category.name && !affectedCategories.includes(category.name)) {
              affectedCategories.push(category.name);
            }
          }
        }

        // Track vendor names
        if (transaction.vendor && !affectedVendors.includes(transaction.vendor)) {
          affectedVendors.push(transaction.vendor);
        }
      });

      cumulativeBalance += netChange;

      dataPoints.push({
        x: periodKey,
        y: cumulativeBalance,
        assignmentBreakdown: categoryBreakdown
      });

      volumePoints.push({
        x: periodKey,
        assigned: income,
        removed: spending,
        net: netChange,
        categories: affectedCategories,
        vendors: affectedVendors
      });
    });

    // X-Axis Alignment Fix: Force all period keys to be present in both dataPoints and volumePoints
    // 1. Get all unique period keys (dates) from groupedByPeriod and include the startingKey if present
    // let allPeriodKeys = [...sortedPeriodKeys];
    // if (dataPoints.length > 0 && !allPeriodKeys.includes(dataPoints[0].x)) {
    //   allPeriodKeys = [dataPoints[0].x, ...allPeriodKeys];
    // }

    // 2. Build a map for quick lookup
    const dataPointMap = Object.fromEntries(dataPoints.map(dp => [dp.x, dp]));
    const volumePointMap = Object.fromEntries(volumePoints.map(vp => [vp.x, vp]));

    // 3. For each period key, ensure both dataPoints and volumePoints have an entry (pad with previous value or zero)
    let lastBalance = chartStartingBalance;
    let lastBreakdown = {};
    const alignedDataPoints: ChartDataPoint[] = [];
    const alignedVolumePoints: VolumeDataPoint[] = [];
    
    filteredPeriodKeys.forEach(periodKey => {
      // Data point
      if (dataPointMap[periodKey]) {
        alignedDataPoints.push(dataPointMap[periodKey]);
        lastBalance = dataPointMap[periodKey].y;
        lastBreakdown = dataPointMap[periodKey].assignmentBreakdown || {};
      } else {
        alignedDataPoints.push({ x: periodKey, y: lastBalance, assignmentBreakdown: lastBreakdown });
      }
      // Volume point
      if (volumePointMap[periodKey]) {
        alignedVolumePoints.push(volumePointMap[periodKey]);
      } else {
        alignedVolumePoints.push({ x: periodKey, assigned: 0, removed: 0, net: 0, categories: [], vendors: [] });
      }
    });

    return { dataPoints: alignedDataPoints, volumePoints: alignedVolumePoints };
  }, [transactions, categories, dateRange, timeRange]);
};
