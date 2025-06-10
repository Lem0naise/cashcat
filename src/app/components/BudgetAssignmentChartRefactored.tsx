// Refactored Budget Assignment Chart - Main Component
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { format } from 'date-fns';
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
  BarElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Import our modular components
import { 
  BudgetAssignmentChartProps, 
  Category 
} from './charts/types';
import { 
  calculateDateRange, 
  calculateAllTimeRange, 
  determineTimeUnit,
  formatCurrency 
} from './charts/utils';
import { comparisonSelectionPlugin } from './charts/plugins';
import { 
  useFilteredTransactions, 
  useChartData 
} from './charts/hooks/useChartData';
import { useComparisonAnalysis } from './charts/hooks/useComparisonAnalysis';
import { useDistanceFromGoalData } from './charts/hooks/useDistanceFromGoalData';
import { ComparisonAnalysis } from './charts/ComparisonAnalysis';
import { 
  useLineChartConfig, 
  useVolumeChartConfig 
} from './charts/configs';

// Register Chart.js components
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
  BarElement,
  comparisonSelectionPlugin
);

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
  const lineChartRef = useRef<any>(null);
  const volumeChartRef = useRef<any>(null);

  // Calculate date ranges with memoization for better performance
  const { allTimeStart, allTimeEnd } = useMemo(() => 
    calculateAllTimeRange(assignments, transactions), 
    [assignments.length, transactions.length]
  );
  
  const dateRange = useMemo(() => 
    calculateDateRange(timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd),
    [timeRange, customStartDate?.getTime(), customEndDate?.getTime(), allTimeStart?.getTime(), allTimeEnd?.getTime()]
  );

  // Filter transactions based on selected groups/categories
  const filteredTransactions = useFilteredTransactions(
    transactions, 
    categories, 
    selectedGroups, 
    selectedCategories
  );

  // Process transactions into chart data points
  // Always use ALL transactions for the main balance calculation (like original code)
  const hasActiveFilters = selectedCategories.length > 0 || selectedGroups.length > 0;
  const chartData = useChartData(transactions, categories, dateRange);

  // Get filtered categories with goals for distance calculation
  const filteredCategoriesWithGoals = useMemo(() => {
    let targetCategories: Category[] = [];
    
    if (selectedCategories.length > 0) {
      // Create a set for faster lookup
      const selectedCategorySet = new Set(selectedCategories);
      targetCategories = categories.filter(cat => selectedCategorySet.has(cat.id));
    } else if (selectedGroups.length > 0) {
      // Create a set for faster lookup
      const selectedGroupSet = new Set(selectedGroups);
      targetCategories = categories.filter(cat => {
        const categoryGroup = (cat as any).groups?.name || cat.group || 'Uncategorized';
        return selectedGroupSet.has(categoryGroup);
      });
    }
    
    return targetCategories;
  }, [categories, selectedCategories.length, selectedGroups.length, selectedCategories, selectedGroups]);

  // Calculate distance from goal data for filtered categories
  const distanceFromGoalData = useDistanceFromGoalData(
    filteredCategoriesWithGoals,
    transactions, // Use ALL transactions, then filter inside the hook for the categories
    assignments,
    dateRange,
    chartData // Pass the main chart data so it uses the same time periods
  );

  // Calculate filtered volume data for bar chart when filters are active
  const filteredVolumeData = useMemo(() => {
    // If no filters are active, return the original volume data
    if (!hasActiveFilters) {
      return chartData.volumePoints;
    }

    // Apply the exact same filtering logic as the original code
    // Create volume points for all periods that exist in the original data
    const filteredVolumePoints = chartData.volumePoints.map(originalPoint => {
      // Get filtered transactions for this specific time period
      const periodTransactions = filteredTransactions.filter(t => {
        // Format the transaction date to match the period key format
        try {
          const transactionKey = format(new Date(t.date), 'yyyy-MM-dd 12:00:00');
          return transactionKey === originalPoint.x;
        } catch (error) {
          return false;
        }
      });

      let income = 0;
      let spending = 0;
      const affectedCategories: string[] = [];
      const affectedVendors: string[] = [];

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

        // Track vendor names
        if (transaction.vendor && !affectedVendors.includes(transaction.vendor)) {
          affectedVendors.push(transaction.vendor);
        }
      });

      return {
        x: originalPoint.x,
        assigned: income,
        removed: spending,
        net: income - spending,
        categories: affectedCategories,
        vendors: affectedVendors
      };
    });

    return filteredVolumePoints;
  }, [chartData.volumePoints, hasActiveFilters, filteredTransactions, categories]);

  // Comparison analysis functionality
  const {
    isDragging,
    dragStartDataIndex,
    dragEndDataIndex,
    comparisonData,
    defaultComparisonData,
    setComparisonData,
    setDefaultComparisonData,
    calculateComparisonData,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearSelection
  } = useComparisonAnalysis(selectedCategories, categories);

  // Determine if we should show distance from goal chart
  const shouldShowDistanceFromGoal = filteredCategoriesWithGoals.length > 0;
  
  // Find the correct time unit for the current range
  const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const xUnit = determineTimeUnit(diffInDays);

  // Determine if we should show filtered title
  // hasActiveFilters already defined above

  // Chart configurations
  const lineChartConfig = useLineChartConfig(
    chartData,
    categories,
    dateRange,
    isDragging,
    dragStartDataIndex,
    dragEndDataIndex,
    shouldShowDistanceFromGoal,
    distanceFromGoalData,
    filteredCategoriesWithGoals,
    selectedCategories,
    xUnit
  );

  const volumeChartConfig = useVolumeChartConfig(
    filteredVolumeData,
    dateRange,
    xUnit,
    hasActiveFilters
  );

  // Effect to set up canvas event listeners for drag functionality
  useEffect(() => {
    const chart = lineChartRef.current;
    if (chart && chart.canvas) {
      const canvas = chart.canvas;
      
      const onMouseDown = (e: MouseEvent) => handleMouseDown(e, chart);
      const onMouseMove = (e: MouseEvent) => handleMouseMove(e, chart);
      const onMouseUp = (e: MouseEvent) => handleMouseUp(e, chart);
      const onMouseLeave = (e: MouseEvent) => {
        if (isDragging) {
          setComparisonData(null);
        }
      };
      
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('mouseleave', onMouseLeave);
      
      return () => {
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseleave', onMouseLeave);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, isDragging]);

  // Effect to calculate default comparison data for the entire range
  useEffect(() => {
    if (chartData && chartData.dataPoints.length > 1) {
      const startIdx = 0;
      const endIdx = chartData.dataPoints.length - 1;
      const dataToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.dataPoints : chartData.dataPoints;
      const datasetsToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : undefined;
      
      if (dataToUse && dataToUse.length > 1) {
        const defaultData = calculateComparisonData(startIdx, endIdx, dataToUse, datasetsToUse);
        if (defaultData) {
          setDefaultComparisonData(defaultData);
          // Only set as active comparison if no drag selection has been made
          if (dragStartDataIndex === null && dragEndDataIndex === null) {
            setComparisonData(defaultData);
          }
        }
      }
    }
  }, [chartData, shouldShowDistanceFromGoal, distanceFromGoalData, calculateComparisonData, dragStartDataIndex, dragEndDataIndex]);

  // Effect to update comparison data when drag selection changes
  useEffect(() => {
    if (dragStartDataIndex !== null && dragEndDataIndex !== null && !isDragging) {
      const dataToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.dataPoints : chartData.dataPoints;
      const datasetsToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : undefined;
      
      if (dataToUse && dataToUse.length > 0) {
        const comparison = calculateComparisonData(dragStartDataIndex, dragEndDataIndex, dataToUse, datasetsToUse);
        if (comparison) {
          setComparisonData(comparison);
        }
      }
    }
  }, [dragStartDataIndex, dragEndDataIndex, isDragging, shouldShowDistanceFromGoal, distanceFromGoalData, chartData, calculateComparisonData]);

  return (
    <div className="space-y-6">
      {/* Comparison Analysis - Always visible */}
      <ComparisonAnalysis
        comparisonData={comparisonData}
        defaultComparisonData={defaultComparisonData}
        shouldShowDistanceFromGoal={shouldShowDistanceFromGoal}
        onClearSelection={clearSelection}
      />

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

          {/* Volume Chart */}
          <div className="bg-white/[.02] rounded-lg p-4 h-96">
            <Bar ref={volumeChartRef} {...volumeChartConfig} />
          </div>
        </>
      )}
    </div>
  );
}
