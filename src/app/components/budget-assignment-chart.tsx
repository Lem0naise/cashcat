'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  TooltipItem,
  BarElement,
  ChartEvent,
  ActiveElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { addDays, format, parseISO, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Database } from '../../types/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  BarElement
);

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

interface BudgetAssignmentChartProps {
  assignments: Assignment[];
  categories: Category[];
  transactions: Transaction[]; // Make transactions required, not optional
  timeRange: '7d' | '30d' | '3m' | '12m' | 'all' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  selectedGroups: string[];
  selectedCategories: string[];
  showGoals: boolean;
  showRollover: boolean;
}

interface ChartDataPoint {
  x: string;
  y: number;
  totalBudgetPool?: number;
  assignmentBreakdown?: { [categoryId: string]: number };
}

interface VolumeDataPoint {
  x: string;
  assigned: number;
  removed: number;
  net: number;
  categories: string[];
}

export default function BudgetAssignmentChart({
  assignments,
  categories,
  transactions,
  timeRange,
  customStartDate,
  customEndDate,
  selectedGroups,
  selectedCategories,
  showGoals,
  showRollover
}: BudgetAssignmentChartProps) {
  const lineChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; dataIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number; dataIndex: number } | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    startDate: string;
    endDate: string;
    startValue: number;
    endValue: number;
    absoluteChange: number;
    percentageChange: number;
    timeSpan: number;
  } | null>(null);  // Filter transactions based on selected groups/categories
  const filteredTransactions = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    return transactions.filter(transaction => {
      // Skip if transaction is null/undefined
      if (!transaction) return false;
      
      // Skip starting balance transactions
      if (transaction.type === 'starting') return false;
      
      // Find the category for this transaction
      const category = categories.find(c => c && c.id === transaction.category_id);
      
      // Only filter out payments without categories (income can have no category)
      if (!category && transaction.type === 'payment') return false;
      
      // Apply category filters
      if (selectedCategories.length > 0) {
        return transaction.category_id && selectedCategories.includes(transaction.category_id);
      }
      
      // Apply group filters
      if (selectedGroups.length > 0) {
        return category && category.group && selectedGroups.includes(category.group);
      }

      return true;
    });
  }, [transactions, categories, selectedGroups, selectedCategories]);

  // --- Fix 'All time' time range: ensure correct date range for all data ---
  // Use all assignments and transactions to determine the earliest and latest dates
  const allDates = [
    ...assignments.map(a => new Date(a.month + '-01')),
    ...transactions.map(t => new Date(t.date))
  ].filter(d => !isNaN(d.getTime()));

  const allTimeStart = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const allTimeEnd = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();

  const dateRange = useMemo(() => {
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
      case '3m':
        start = addDays(now, -90);
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
        start = allTimeStart;
        end = allTimeEnd;
        break;
    }
    return { start: startOfDay(start), end: endOfDay(end) };
  }, [timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd]);

  // Process transactions into chart data points
  const chartData = useMemo(() => {
    // Check if transactions is actually an array
    if (!Array.isArray(transactions)) {
      return { dataPoints: [], volumePoints: [] };
    }

    // Always include ALL transactions for balance calculation
    const allTransactions = transactions || [];
    const validTransactions = allTransactions.filter(t => {
      return t && t.date && t.amount !== undefined && t.amount !== null;
    });

    const allSorted = [...validTransactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Show starting balance calculation
    const startingTransaction = allTransactions.find(t => t && t.type === 'starting');
    const startingBalance = startingTransaction?.amount || 0;

    // Filter transactions within date range
    const transactionsInRange = allSorted.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inRange = !isNaN(transactionDate.getTime()) && 
             transactionDate >= dateRange.start && 
             transactionDate <= dateRange.end;
      return inRange;
    });

    // If no transactions in range, create a simple starting point
    if (transactionsInRange.length === 0) {
      const todayKey = format(new Date(), 'yyyy-MM-dd 12:00:00');
      return {
        dataPoints: [{
          x: todayKey,
          y: startingBalance,
          assignmentBreakdown: {}
        }],
        volumePoints: [{
          x: todayKey,
          assigned: 0,
          removed: 0,
          net: 0,
          categories: []
        }]
      };
    }

    // Get unique transaction dates
    const uniqueDates = [...new Set(transactionsInRange.map(t => t.date))].sort();
    
    // Determine grouping strategy based on data density and time range
    const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Always try to maximize data points
    let groupedByPeriod: { [dateKey: string]: Transaction[] };
    
    // Strategy 1: Use individual dates if we have reasonable density
    if (uniqueDates.length <= 100) {
      // Use individual transaction dates for maximum granularity
      groupedByPeriod = uniqueDates.reduce((acc, date) => {
        const key = format(new Date(date), 'yyyy-MM-dd 12:00:00');
        acc[key] = transactionsInRange.filter(t => t.date === date);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }
    // Strategy 2: For very dense data, use time-based grouping but still maximize points
    else {
      const getGranularityKey = (date: Date) => {
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

      groupedByPeriod = transactionsInRange.reduce((acc, transaction) => {
        const transactionDate = new Date(transaction.date);
        const key = getGranularityKey(transactionDate);
        
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(transaction);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }

    const dataPoints: ChartDataPoint[] = [];
    const volumePoints: VolumeDataPoint[] = [];
    
    let cumulativeBalance = startingBalance;

    // Calculate running balance for each period
    const sortedPeriodKeys = Object.keys(groupedByPeriod).sort();
    
    // Add starting point if we have transactions and it makes sense
    if (sortedPeriodKeys.length > 0) {
      const firstTransactionDate = new Date(sortedPeriodKeys[0]);
      const dayBefore = new Date(firstTransactionDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      // Only add starting point if it's within our date range and wouldn't create too many points
      if (dayBefore >= dateRange.start && sortedPeriodKeys.length < 90) {
        const startingKey = format(dayBefore, 'yyyy-MM-dd 12:00:00');
        dataPoints.push({
          x: startingKey,
          y: startingBalance,
          assignmentBreakdown: {}
        });
        
        volumePoints.push({
          x: startingKey,
          assigned: 0,
          removed: 0,
          net: 0,
          categories: []
        });
      }
    }
    
    // For each period, always push a dataPoint and a volumePoint for that periodKey
    sortedPeriodKeys.forEach((periodKey, index) => {
      const periodTransactions = groupedByPeriod[periodKey] || [];
      
      let income = 0;
      let spending = 0;
      let netChange = 0;
      const affectedCategories: string[] = [];
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
          const category = categories.find(c => c && c.id === transaction.category_id);
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
        categories: affectedCategories
      });
    });

    // --- X-Axis Alignment Fix: Force all period keys to be present in both dataPoints and volumePoints ---
    // 1. Get all unique period keys (dates) from groupedByPeriod and include the startingKey if present
    let allPeriodKeys = [...sortedPeriodKeys];
    if (dataPoints.length > 0 && !allPeriodKeys.includes(dataPoints[0].x)) {
      allPeriodKeys = [dataPoints[0].x, ...allPeriodKeys];
    }

    // 2. Build a map for quick lookup
    const dataPointMap = Object.fromEntries(dataPoints.map(dp => [dp.x, dp]));
    const volumePointMap = Object.fromEntries(volumePoints.map(vp => [vp.x, vp]));

    // 3. For each period key, ensure both dataPoints and volumePoints have an entry (pad with previous value or zero)
    let lastBalance = startingBalance;
    let lastBreakdown = {};
    const alignedDataPoints: ChartDataPoint[] = [];
    const alignedVolumePoints: VolumeDataPoint[] = [];
    allPeriodKeys.forEach(periodKey => {
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
        alignedVolumePoints.push({ x: periodKey, assigned: 0, removed: 0, net: 0, categories: [] });
      }
    });

    return { dataPoints: alignedDataPoints, volumePoints: alignedVolumePoints };
  }, [transactions, categories, dateRange]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  // Get filtered categories with goals for distance calculation
  const filteredCategoriesWithGoals = useMemo(() => {
    let targetCategories: Category[] = [];
    
    if (selectedCategories.length > 0) {
      targetCategories = categories.filter(cat => selectedCategories.includes(cat.id));
    } else if (selectedGroups.length > 0) {
      targetCategories = categories.filter(cat => {
        const categoryGroup = (cat as any).groups?.name || cat.group || 'Uncategorized';
        return selectedGroups.includes(categoryGroup);
      });
    }
    
    // Debug the goal values in detail
    console.log('=== DETAILED GOAL DEBUG ===');
    targetCategories.forEach(cat => {
      console.log(`Category "${cat.name}":`, {
        goal: cat.goal,
        goalType: typeof cat.goal,
        goalIsUndefined: cat.goal === undefined,
        goalIsNull: cat.goal === null,
        goalIsZero: cat.goal === 0,
        fullCategory: cat
      });
    });
    console.log('============================');
    
    // Include categories that have goals (including zero goals)
    // For now, let's include ALL target categories to see if they show up
    const filteredWithGoals = targetCategories; // Temporarily include all to test
    
    // Debug logging for savings group issue
    console.log('=== FILTERING DEBUG ===');
    console.log('selectedGroups:', selectedGroups);
    console.log('selectedCategories:', selectedCategories);
    console.log('all categories:', categories.map(c => ({ id: c.id, name: c.name, group: c.group, goal: c.goal })));
    console.log('targetCategories:', targetCategories.map(c => ({ id: c.id, name: c.name, group: c.group, goal: c.goal })));
    console.log('filteredWithGoals:', filteredWithGoals.map(c => ({ id: c.id, name: c.name, group: c.group, goal: c.goal })));
    console.log('=======================');
    
    return filteredWithGoals;
  }, [categories, selectedCategories, selectedGroups]);

  // Calculate distance from goal data for filtered categories
  const distanceFromGoalData = useMemo(() => {
    console.log('=== DISTANCE FROM GOAL CALCULATION DEBUG ===');
    console.log('filteredCategoriesWithGoals.length:', filteredCategoriesWithGoals.length);
    console.log('filteredCategoriesWithGoals:', filteredCategoriesWithGoals);
    
    if (filteredCategoriesWithGoals.length === 0) {
      console.log('No filtered categories with goals, returning empty data');
      return { dataPoints: [], datasets: [] };
    }

    // Use the same date grouping logic as main chart
    const validTransactions = transactions.filter(t => {
      return t && t.date && t.amount !== undefined && t.amount !== null;
    });

    const allSorted = [...validTransactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter transactions within date range
    const transactionsInRange = allSorted.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inRange = !isNaN(transactionDate.getTime()) && 
             transactionDate >= dateRange.start && 
             transactionDate <= dateRange.end;
      return inRange;
    });

    if (transactionsInRange.length === 0) {
      console.log('No transactions in range, but we should still show goal data');
      console.log('dateRange:', dateRange);
      
      // Even with no transactions, we should show the goal amounts for each category
      // Create a single data point showing full goal amounts (no spending)
      const todayKey = format(new Date(), 'yyyy-MM-dd 12:00:00');
      
      const datasets = filteredCategoriesWithGoals.map((category, index) => {
        // For categories without goals, show 0 (no accumulated value yet)
        // For categories with goals, show the full goal amount (no spending yet)
        const initialValue = (category.goal === null || category.goal === undefined) ? 0 : category.goal;
        
        // Generate distinct colors for each category
        const colors = [
          '#bac2ff', '#ff7f7f', '#7fff7f', '#ffff7f', '#ff7fff', 
          '#7fffff', '#ffa500', '#ff69b4', '#98fb98', '#dda0dd'
        ];
        const color = colors[index % colors.length];

        const label = (category.goal === null || category.goal === undefined)
          ? `${category.name} (Savings/No Goal)`
          : `${category.name} (Goal: ${formatCurrency(category.goal)})`;

        return {
          label: label,
          data: [{ x: todayKey, y: initialValue }],
          borderColor: color,
          backgroundColor: `${color}20`,
          fill: false,
          tension: 0.2,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointBackgroundColor: color,
          pointBorderColor: '#0a0a0a',
          pointBorderWidth: 1,
        };
      });
      
      console.log('Generated datasets for no-transaction case:', datasets);
      return { dataPoints: [todayKey], datasets };
    }

    // Get unique transaction dates
    const uniqueDates = [...new Set(transactionsInRange.map(t => t.date))].sort();
    
    // Determine grouping strategy based on data density and time range
    const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    let groupedByPeriod: { [dateKey: string]: Transaction[] };
    
    if (uniqueDates.length <= 100) {
      groupedByPeriod = uniqueDates.reduce((acc, date) => {
        const key = format(new Date(date), 'yyyy-MM-dd 12:00:00');
        acc[key] = transactionsInRange.filter(t => t.date === date);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    } else {
      const getGranularityKey = (date: Date) => {
        if (diffInDays <= 90) {
          return format(date, 'yyyy-MM-dd 12:00:00');
        } else if (diffInDays <= 365) {
          return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd 12:00:00');
        } else {
          return format(startOfMonth(date), 'yyyy-MM-dd 12:00:00');
        }
      };

      groupedByPeriod = transactionsInRange.reduce((acc, transaction) => {
        const key = getGranularityKey(new Date(transaction.date));
        if (!acc[key]) acc[key] = [];
        acc[key].push(transaction);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }

    const sortedPeriodKeys = Object.keys(groupedByPeriod).sort();
    
    // Create datasets for each filtered category
    const datasets = filteredCategoriesWithGoals.map((category, index) => {
      let currentMonthSpending = 0;
      let currentMonth = '';
      
      const dataPoints = sortedPeriodKeys.map(periodKey => {
        const periodDate = new Date(periodKey);
        const monthKey = format(periodDate, 'yyyy-MM');
        
        // Reset spending if we've moved to a new month
        if (currentMonth !== monthKey) {
          currentMonthSpending = 0;
          currentMonth = monthKey;
        }
        
        // Calculate spending in this period for this category
        const periodTransactions = groupedByPeriod[periodKey] || [];
        const periodSpending = periodTransactions
          .filter(t => t.category_id === category.id && t.type === 'payment')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        // Add to current month's cumulative spending
        currentMonthSpending += periodSpending;
        
        // Calculate distance from goal or value accumulation based on goal type
        let yValue: number;
        
        if (category.goal === null || category.goal === undefined) {
          // For categories without goals (likely savings), show accumulation of assignments/income
          // Calculate assignments and income for this category in the current month
          const monthKey = format(periodDate, 'yyyy-MM');
          const monthAssignments = assignments
            .filter(a => a.category_id === category.id && a.month === monthKey)
            .reduce((sum, a) => sum + (a.assigned || 0), 0);
          
          // For savings categories, show positive accumulation (assignments minus spending)
          yValue = monthAssignments - currentMonthSpending;
        } else {
          // For categories with goals, show traditional distance from spending goal
          const goalAmount = category.goal;
          yValue = goalAmount - currentMonthSpending;
        }
        
        return {
          x: periodKey,
          y: yValue
        };
      });

      // Generate distinct colors for each category
      const colors = [
        '#bac2ff', '#ff7f7f', '#7fff7f', '#ffff7f', '#ff7fff', 
        '#7fffff', '#ffa500', '#ff69b4', '#98fb98', '#dda0dd'
      ];
      const color = colors[index % colors.length];

      // Create different labels based on goal type
      const label = category.goal === null || category.goal === undefined
        ? `${category.name} (Savings/No Goal)`
        : `${category.name} (Goal: ${formatCurrency(category.goal)})`;

      return {
        label: label,
        data: dataPoints,
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: false,
        tension: 0.2,
        pointRadius: dataPoints.length > 50 ? 2 : dataPoints.length > 30 ? 4 : 6,
        pointHoverRadius: dataPoints.length > 50 ? 4 : dataPoints.length > 30 ? 6 : 10,
        pointBackgroundColor: color,
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 1,
      };
    });

    console.log('Generated datasets with transactions:', datasets);
    console.log('Number of datasets:', datasets.length);
    console.log('Sample dataset data points:', datasets[0]?.data?.length || 0);
    console.log('=======================');

    return { dataPoints: sortedPeriodKeys, datasets };
  }, [filteredCategoriesWithGoals, transactions, dateRange, formatCurrency]);

  // Calculate filtered volume data for bar chart when filters are active
  const filteredVolumeData = useMemo(() => {
    // If no filters are active, return the original volume data
    const hasActiveFilters = selectedCategories.length > 0 || selectedGroups.length > 0;
    if (!hasActiveFilters) {
      return chartData.volumePoints;
    }

    // Get filtered transactions using the same logic as distanceFromGoalData
    const validTransactions = transactions.filter(t => {
      return t && t.date && t.amount !== undefined && t.amount !== null;
    });

    const allSorted = [...validTransactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter transactions within date range
    const transactionsInRange = allSorted.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inRange = !isNaN(transactionDate.getTime()) && 
             transactionDate >= dateRange.start && 
             transactionDate <= dateRange.end;
      return inRange;
    });

    // Apply category and group filters to transactions
    const filteredTransactions = transactionsInRange.filter(transaction => {
      // Skip starting balance transactions
      if (transaction.type === 'starting') return false;
      
      // Find the category for this transaction
      const category = categories.find(c => c && c.id === transaction.category_id);
      
      // For payments without categories, exclude them
      if (!category && transaction.type === 'payment') return false;
      
      // For income without categories, exclude them when filters are active
      if (!category && transaction.type === 'income') return false;
      
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

    // If no filtered transactions, return empty volume points matching the original structure
    if (filteredTransactions.length === 0) {
      return chartData.volumePoints.map(point => ({
        x: point.x,
        assigned: 0,
        removed: 0,
        net: 0,
        categories: []
      }));
    }

    // Use the same date grouping logic as the main chart
    const uniqueDates = [...new Set(filteredTransactions.map(t => t.date))].sort();
    const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    let groupedByPeriod: { [dateKey: string]: Transaction[] };
    
    if (uniqueDates.length <= 100) {
      // Use individual transaction dates for maximum granularity
      groupedByPeriod = uniqueDates.reduce((acc, date) => {
        const key = format(new Date(date), 'yyyy-MM-dd 12:00:00');
        acc[key] = filteredTransactions.filter(t => t.date === date);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    } else {
      // For dense data, use time-based grouping
      const getGranularityKey = (date: Date) => {
        if (diffInDays <= 90) {
          return format(date, 'yyyy-MM-dd 12:00:00');
        } else if (diffInDays <= 365) {
          return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd 12:00:00');
        } else {
          return format(startOfMonth(date), 'yyyy-MM-dd 12:00:00');
        }
      };

      groupedByPeriod = filteredTransactions.reduce((acc, transaction) => {
        const key = getGranularityKey(new Date(transaction.date));
        if (!acc[key]) acc[key] = [];
        acc[key].push(transaction);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }

    // Calculate filtered volume points
    const sortedPeriodKeys = Object.keys(groupedByPeriod).sort();
    const filteredVolumePoints: VolumeDataPoint[] = [];

    // Create volume points for all periods that exist in the original data
    chartData.volumePoints.forEach(originalPoint => {
      const periodTransactions = groupedByPeriod[originalPoint.x] || [];
      
      let income = 0;
      let spending = 0;
      const affectedCategories: string[] = [];

      // Process filtered transactions for this period
      periodTransactions.forEach(transaction => {
        if (!transaction || typeof transaction.amount !== 'number') return;
        
        const amount = transaction.amount;
        
        if (transaction.type === 'income') {
          income += amount;
        } else if (transaction.type === 'payment') {
          spending += Math.abs(amount);
        }

        // Track category names
        if (transaction.category_id) {
          const category = categories.find(c => c && c.id === transaction.category_id);
          if (category && category.name && !affectedCategories.includes(category.name)) {
            affectedCategories.push(category.name);
          }
        }
      });

      filteredVolumePoints.push({
        x: originalPoint.x,
        assigned: income,
        removed: spending,
        net: income - spending,
        categories: affectedCategories
      });
    });

    return filteredVolumePoints;
  }, [chartData.volumePoints, selectedCategories, selectedGroups, transactions, categories, dateRange]);

  // Determine if we should show distance from goal chart
  const shouldShowDistanceFromGoal = filteredCategoriesWithGoals.length > 0;
  
  // Find the correct time unit for the current range
  const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  let xUnit: 'day' | 'week' | 'month' = 'day';
  if (diffInDays <= 90) xUnit = 'day';
  else if (diffInDays <= 365) xUnit = 'week';
  else xUnit = 'month';

  // Determine if we should show filtered title
  const hasActiveFilters = selectedCategories.length > 0 || selectedGroups.length > 0;

  // Chart.js configuration for line chart
  const lineChartConfig = useMemo(() => ({
    type: 'line' as const,
    data: {
      datasets: shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : [
        {
          label: 'Account Balance',
          data: chartData.dataPoints,
          borderColor: '#bac2ff',
          backgroundColor: 'rgba(186, 194, 255, 0.1)',
          fill: true,
          tension: 0.2,
          pointRadius: chartData.dataPoints.length > 50 ? 2 : chartData.dataPoints.length > 30 ? 4 : 6,
          pointHoverRadius: chartData.dataPoints.length > 50 ? 4 : chartData.dataPoints.length > 30 ? 6 : 10,
          pointBackgroundColor: '#bac2ff',
          pointBorderColor: '#0a0a0a',
          pointBorderWidth: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        title: {
          display: true,
          text: shouldShowDistanceFromGoal 
            ? `Category Progress Tracking (${filteredCategoriesWithGoals.length} categories)`
            : `Account Balance Over Time (${chartData.dataPoints.length} points)`,
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        },
        legend: {
          display: shouldShowDistanceFromGoal && filteredCategoriesWithGoals.length > 1,
          labels: {
            color: '#ffffff'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#bac2ff',
          borderWidth: 1,
          callbacks: {
            title: (context: TooltipItem<'line'>[]) => {
              const dateStr = context[0].label;
              try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                
                return format(date, 'MMM dd, yyyy');
              } catch (error) {
                console.error('Error formatting date in tooltip:', error, dateStr);
                return dateStr;
              }
            },
            label: (context: TooltipItem<'line'>) => {
              const value = context.parsed.y;
              const datasetIndex = context.datasetIndex;
              const category = filteredCategoriesWithGoals[datasetIndex];
              
              if (!category) {
                return shouldShowDistanceFromGoal ? `${formatCurrency(value)} remaining` : `Balance: ${formatCurrency(value)}`;
              }
              
              if (shouldShowDistanceFromGoal) {
                if (category.goal === null || category.goal === undefined) {
                  // Savings category
                  if (value >= 0) {
                    return `${category.name}: ${formatCurrency(value)} accumulated`;
                  } else {
                    return `${category.name}: ${formatCurrency(Math.abs(value))} spent from savings`;
                  }
                } else {
                  // Regular spending category with goal
                  if (value >= 0) {
                    return `${category.name}: ${formatCurrency(value)} remaining`;
                  } else {
                    return `${category.name}: ${formatCurrency(Math.abs(value))} over budget`;
                  }
                }
              } else {
                return `Balance: ${formatCurrency(value)}`;
              }
            },
            afterBody: (context: TooltipItem<'line'>[]) => {
              if (shouldShowDistanceFromGoal) {
                // Show additional goal information for distance from goal view
                const datasetIndex = context[0].datasetIndex;
                const category = filteredCategoriesWithGoals[datasetIndex];
                if (category) {
                  const currentValue = context[0].parsed.y;
                  
                  if (category.goal === null || category.goal === undefined) {
                    // Savings category without goal
                    const spentAmount = Math.max(0, -currentValue); // If negative, show how much was spent
                    return [
                      '',
                      `Category Type: Savings/No Goal`,
                      currentValue >= 0 
                        ? `Value accumulated this month: ${formatCurrency(currentValue)}`
                        : `Spent from savings this month: ${formatCurrency(spentAmount)}`
                    ];
                  } else {
                    // Regular spending category with goal
                    const goalAmount = category.goal;
                    const spentAmount = goalAmount - currentValue;
                    return [
                      '',
                      `Monthly Goal: ${formatCurrency(goalAmount)}`,
                      `Month-to-date Spent: ${formatCurrency(Math.max(0, spentAmount))}`,
                      currentValue >= 0 
                        ? `Remaining this month: ${formatCurrency(currentValue)}`
                        : `Over budget this month: ${formatCurrency(Math.abs(currentValue))}`
                    ];
                  }
                }
                return [];
              } else {
                // Show assignment breakdown for account balance view
                const dataPoint = chartData.dataPoints[context[0].dataIndex];
                if (dataPoint?.assignmentBreakdown) {
                  const breakdown = Object.entries(dataPoint.assignmentBreakdown)
                    .filter(([_, amount]) => Math.abs(amount) > 0)
                    .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 8)
                    .map(([categoryId, amount]) => {
                      const category = categories.find(c => c.id === categoryId);
                      const sign = amount >= 0 ? '+' : '-';
                      return `${category?.name || 'Unknown'}: ${sign}${formatCurrency(Math.abs(amount))}`;
                    });
                  return breakdown.length > 0 ? ['', 'This Period:', ...breakdown] : [];
                }
                return [];
              }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: xUnit,
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            alignToPixels: false, // ensure grid lines are not offset
            offset: false // ensure grid lines/ticks are not offset
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: xUnit === 'day' ? 14 : xUnit === 'week' ? 8 : 12,
            // align: 'center', // center tick labels
            // No offset
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            callback: function(value: any) {
              if (shouldShowDistanceFromGoal) {
                const numValue = Number(value);
                if (numValue >= 0) {
                  return `+${formatCurrency(numValue)}`;
                } else {
                  return `-${formatCurrency(Math.abs(numValue))}`;
                }
              } else {
                return formatCurrency(Number(value));
              }
            }
          }
        }
      },
      onHover: (event: ChartEvent, activeElements: ActiveElement[]) => {
        if (event.native && event.native.target) {
          (event.native.target as HTMLElement).style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        }
      },
      onClick: (event: ChartEvent, activeElements: ActiveElement[], chart: any) => {
        if (activeElements.length > 0 && lineChartRef.current) {
          // Use the modern Chart.js way to get relative position
          const rect = chart.canvas.getBoundingClientRect();
          const mouseEvent = event.native as MouseEvent;
          const x = mouseEvent ? mouseEvent.clientX - rect.left : 0;
          const y = mouseEvent ? mouseEvent.clientY - rect.top : 0;
          const dataIndex = activeElements[0].index;
          
          if (!isDragging) {
            setDragStart({
              x,
              y,
              dataIndex
            });
            setIsDragging(true);
          } else if (dragStart) {
            setDragEnd({
              x,
              y,
              dataIndex
            });
            
            // Calculate comparison data
            const startPoint = chartData.dataPoints[dragStart.dataIndex];
            const endPoint = chartData.dataPoints[dataIndex];
            
            if (startPoint && endPoint) {
              const startDate = startPoint.x;
              const endDate = endPoint.x;
              const startValue = startPoint.y;
              const endValue = endPoint.y;
              const absoluteChange = endValue - startValue;
              const percentageChange = startValue !== 0 ? (absoluteChange / startValue) * 100 : 0;
              
              try {
                const startDateTime = new Date(startDate);
                const endDateTime = new Date(endDate);
                const timeSpanDays = Math.abs((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
                
                setComparisonData({
                  startDate,
                  endDate,
                  startValue,
                  endValue,
                  absoluteChange,
                  percentageChange,
                  timeSpan: timeSpanDays
                });
              } catch (error) {
                console.error('Error calculating time span:', error);
              }
            }
            
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
          }
        }
      }
    }
  }), [chartData, categories, formatCurrency, dateRange, isDragging, dragStart, shouldShowDistanceFromGoal, distanceFromGoalData, filteredCategoriesWithGoals]);

  // Chart.js configuration for volume chart
  const volumeChartConfig = useMemo(() => ({
    type: 'bar' as const,
    data: {
      datasets: [
        {
          label: 'Income',
          data: filteredVolumeData.map(point => ({ x: point.x, y: point.assigned })),
          backgroundColor: 'rgba(186, 194, 255, 0.6)',
          borderColor: '#bac2ff',
          borderWidth: 1,
        },
        {
          label: 'Spending',
          data: filteredVolumeData.map(point => ({ x: point.x, y: -point.removed })),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: '#ef4444',
          borderWidth: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: hasActiveFilters 
            ? 'Filtered Income vs Spending Activity' 
            : 'Income vs Spending Activity',
          color: '#ffffff',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        legend: {
          display: true,
          labels: {
            color: '#ffffff'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#bac2ff',
          borderWidth: 1,
          callbacks: {
            title: (context: TooltipItem<'bar'>[]) => {
              const dateStr = context[0].label;
              try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                
                const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffInDays <= 7) {
                  return format(date, 'MMM dd, yyyy');
                } else if (diffInDays <= 90) {
                  return format(date, 'MMM dd, yyyy');
                } else {
                  return format(date, 'MMM yyyy');
                }
              } catch (error) {
                console.error('Error formatting date in volume tooltip:', error, dateStr);
                return dateStr;
              }
            },
            label: (context: TooltipItem<'bar'>) => {
              const dataIndex = context.dataIndex;
              const volumePoint = filteredVolumeData[dataIndex];
              if (!volumePoint) return '';
              
              const lines = [
                `Income: ${formatCurrency(volumePoint.assigned)}`,
                `Spending: ${formatCurrency(volumePoint.removed)}`,
                `Net: ${formatCurrency(volumePoint.net)}`
              ];
              
              if (volumePoint.categories.length > 0) {
                lines.push('', 'Categories:');
                lines.push(...volumePoint.categories.slice(0, 5));
                if (volumePoint.categories.length > 5) {
                  lines.push(`... and ${volumePoint.categories.length - 5} more`);
                }
              }
              
              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: xUnit,
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            alignToPixels: false, // ensure grid lines are not offset
            offset: false // ensure grid lines/ticks are not offset
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: xUnit === 'day' ? 14 : xUnit === 'week' ? 8 : 12,
            // align: 'center', // center tick labels
            // No offset
          },
          // Remove bar chart category and bar padding
          // This ensures bars are centered on ticks, matching the line chart
          // Chart.js v3+ uses these for bar width and alignment
          // @ts-ignore
          barPercentage: 1.0,
          // @ts-ignore
          categoryPercentage: 1.0,
          // @ts-ignore
          offset: false,
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            callback: function(value: any) {
              return formatCurrency(Math.abs(Number(value)));
            }
          }
        }
      }
    }
  }), [filteredVolumeData, formatCurrency, dateRange, xUnit, hasActiveFilters]);

  return (
    <div className="space-y-6">
      {/* Comparison Tooltip */}
      {comparisonData && (
        <div className="bg-white/[.05] rounded-lg p-4 border border-green/20">
          <h4 className="font-medium text-green mb-2">Comparison Analysis</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-white/50">Time Span</span>
              <p className="font-medium">
                {comparisonData.timeSpan < 1 
                  ? `${Math.round(comparisonData.timeSpan * 24)} hour${Math.round(comparisonData.timeSpan * 24) !== 1 ? 's' : ''}`
                  : `${Math.round(comparisonData.timeSpan)} day${Math.round(comparisonData.timeSpan) !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div>
              <span className="text-white/50">Balance Change</span>
              <p className={`font-medium ${comparisonData.absoluteChange >= 0 ? 'text-green' : 'text-reddy'}`}>
                {comparisonData.absoluteChange >= 0 ? '+' : ''}{formatCurrency(comparisonData.absoluteChange)}
              </p>
            </div>
            <div>
              <span className="text-white/50">Percentage Change</span>
              <p className={`font-medium ${comparisonData.percentageChange >= 0 ? 'text-green' : 'text-reddy'}`}>
                {comparisonData.percentageChange >= 0 ? '+' : ''}{comparisonData.percentageChange.toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-white/50">Period</span>
              <p className="font-medium text-xs">
                {(() => {
                  try {
                    const start = new Date(comparisonData.startDate);
                    const end = new Date(comparisonData.endDate);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                      return 'Invalid dates';
                    }
                    return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
                  } catch (error) {
                    return 'Error formatting dates';
                  }
                })()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setComparisonData(null)}
            className="mt-2 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            Clear comparison
          </button>
        </div>
      )}

      {/* Show helpful message when no data */}
      {Array.isArray(transactions) && transactions.length === 0 && (
        <div className="bg-blue/10 rounded-lg p-4 border border-blue/20">
          <h4 className="font-medium text-blue mb-2">No Transaction Data</h4>
          <p className="text-sm text-blue/90">
            It looks like no transactions have been loaded. Try:
          </p>
          <ul className="text-sm text-blue/90 list-disc list-inside mt-2 space-y-1">
            <li>Adding some transactions first</li>
            <li>Checking if you're logged in properly</li>
            <li>Refreshing the page</li>
          </ul>
        </div>
      )}

      {/* Only show charts when we have valid transaction data */}
      {Array.isArray(transactions) && chartData.dataPoints.length > 0 && (
        <>
          {/* Main Line Chart */}
          <div className="bg-white/[.02] rounded-lg p-4 h-96">
            <Line ref={lineChartRef} {...lineChartConfig} />
          </div>

          {/* Volume Chart - Increased height from h-48 to h-96 */}
          <div className="bg-white/[.02] rounded-lg p-4 h-96">
            <Bar ref={volumeChartRef} {...volumeChartConfig} />
          </div>
        </>
      )}
    </div>
  );
}
