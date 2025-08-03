// Refactored Budget Assignment Chart - Main Component
'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
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
import { segmentedBarsPlugin } from './charts/plugins/segmentedBars';
import { 
  useFilteredTransactions, 
  useChartData 
} from './charts/hooks/useChartData';
import { useComparisonAnalysis } from './charts/hooks/useComparisonAnalysis';
import { useDistanceFromGoalData } from './charts/hooks/useDistanceFromGoalData';
import { ComparisonAnalysis } from './charts/ComparisonAnalysis';
import { SegmentAnalysis, SegmentHoverInfo } from './charts/SegmentAnalysis';
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
  comparisonSelectionPlugin,
  segmentedBarsPlugin
);

// Set Chart.js global font defaults
ChartJS.defaults.font.family = 'Gabarito, system-ui, -apple-system, sans-serif';

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
  
  // Add state for segment hover information and visibility control
  const [segmentHoverInfo, setSegmentHoverInfo] = useState<SegmentHoverInfo | null>(null);
  const [lastValidSegmentInfo, setLastValidSegmentInfo] = useState<SegmentHoverInfo | null>(null);
  const [showSegmentDetails, setShowSegmentDetails] = useState<boolean>(false);

  // Handler to close segment details
  const handleCloseSegmentDetails = useCallback(() => {
    setShowSegmentDetails(false);
    // Keep the last valid segment info in case user wants to see it again
  }, []);

  // Calculate date ranges with memoization for better performance
  const { allTimeStart, allTimeEnd } = useMemo(() => 
    calculateAllTimeRange(assignments, transactions), 
    [assignments.length, transactions.length]
  );
  
  // Memoize date range calculation with better dependencies
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
  const hasActiveFilters = useMemo(() => 
    selectedCategories.length > 0 || selectedGroups.length > 0,
    [selectedCategories.length, selectedGroups.length]
  );

  // Map timeRange to supported values for useChartData hook
  const mappedTimeRange = useMemo(() => {
    if (timeRange === 'mtd' || timeRange === 'ytd') {
      return 'custom'; // Use custom range for mtd/ytd with calculated dateRange
    }
    return timeRange;
  }, [timeRange]);

  const chartData = useChartData(transactions, categories, dateRange, mappedTimeRange);

  // Get filtered categories for distance calculation - memoized with stable dependencies
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
    
    // Return all selected categories - the distance from goal chart will handle
    // showing different visualizations for categories with/without goals
    return targetCategories;
  }, [categories, selectedCategories, selectedGroups]);

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

    // Create filtered volume data by re-processing the same time periods 
    // but only including transactions that match our filters
    console.log('Creating filtered volume data with filters:', { selectedGroups, selectedCategories });
    console.log('Filtered transactions count:', filteredTransactions.length);
    console.log('Original volume points count:', chartData.volumePoints.length);

    // Process each time period using the filtered transactions
    const filteredVolumePoints = chartData.volumePoints.map(originalPoint => {
      // Create a category map for quick lookups
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      // Get all transactions that fall within this time period
      // We need to compare by date only, not the full timestamp
      const periodDate = new Date(originalPoint.x);
      const periodDateString = format(periodDate, 'yyyy-MM-dd');
      
      const periodTransactions = filteredTransactions.filter(t => {
        try {
          const transactionDate = new Date(t.date);
          const transactionDateString = format(transactionDate, 'yyyy-MM-dd');
          return transactionDateString === periodDateString;
        } catch (error) {
          return false;
        }
      });

      console.log(`Period ${originalPoint.x}: found ${periodTransactions.length} filtered transactions`);

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
          const category = categoryMap.get(transaction.category_id);
          if (category && category.name && !affectedCategories.includes(category.name)) {
            affectedCategories.push(category.name);
          }
        }

        // Track vendor names
        if (transaction.vendor && !affectedVendors.includes(transaction.vendor)) {
          affectedVendors.push(transaction.vendor);
        }
      });

      const result = {
        x: originalPoint.x,
        assigned: income,
        removed: spending,
        net: income - spending,
        categories: affectedCategories,
        vendors: affectedVendors
      };

      console.log(`Period ${originalPoint.x} result:`, result);
      return result;
    });

    console.log('Final filtered volume points:', filteredVolumePoints);
    return filteredVolumePoints;
  }, [chartData.volumePoints, hasActiveFilters, filteredTransactions, categories, selectedGroups, selectedCategories]);

  // Determine if we should show distance from goal chart
  const shouldShowDistanceFromGoal = filteredCategoriesWithGoals.length > 0;

  // Memoize the category IDs array to prevent infinite re-renders
  const comparisonCategoryIds = useMemo(() => 
    shouldShowDistanceFromGoal ? filteredCategoriesWithGoals.map(cat => cat.id) : selectedCategories,
    [shouldShowDistanceFromGoal, filteredCategoriesWithGoals.map(cat => cat.id).join(','), selectedCategories.join(',')]
  );

  // Comparison analysis functionality
  const {
    isDragging,
    dragStartDataIndex,
    dragEndDataIndex,
    hoverDataIndex,
    comparisonData,
    defaultComparisonData,
    setComparisonData,
    setDefaultComparisonData,
    calculateComparisonData,
    calculateSinglePointData,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleHover,
    handleHoverLeave,
    clearSelection
  } = useComparisonAnalysis(
    comparisonCategoryIds, 
    categories
  );
  
  // Find the correct time unit for the current range
  const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const xUnit = determineTimeUnit(diffInDays, true); // Force daily for line charts

  // Determine if we should show filtered title
  // hasActiveFilters already defined above

  // Chart configurations with stable dependencies
  // Real-time update callback for comparison data during dragging
  const handleRealTimeUpdate = useCallback((newComparisonData: any) => {
    // Only update if we're actively dragging to avoid unnecessary re-renders
    if (isDragging) {
      setComparisonData(newComparisonData);
    }
  }, [isDragging, setComparisonData]);

  const lineChartConfig = useLineChartConfig(
    chartData,
    categories,
    dateRange,
    isDragging,
    dragStartDataIndex,
    dragEndDataIndex,
    hoverDataIndex,
    shouldShowDistanceFromGoal,
    distanceFromGoalData,
    filteredCategoriesWithGoals,
    selectedCategories,
    xUnit,
    comparisonData,
    handleRealTimeUpdate,
    calculateComparisonData,
    handleHover,
    handleHoverLeave
  );

  const volumeChartConfig = useVolumeChartConfig(
    filteredVolumeData,
    dateRange,
    xUnit,
    hasActiveFilters,
    categories,
    selectedCategories,
    selectedGroups,
    transactions // Pass transactions to enable accurate segment calculations
  );

  // Effect to set up canvas event listeners for drag functionality
  useEffect(() => {
    const chart = lineChartRef.current;
    if (chart && chart.canvas) {
      const canvas = chart.canvas;
      
      // Mouse event handlers
      const onMouseDown = (e: MouseEvent) => handleMouseDown(e, chart);
      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          handleMouseMove(e, chart);
        } else {
          handleHover(e, chart);
        }
      };
      const onMouseUp = (e: MouseEvent) => handleMouseUp(e, chart);
      const onMouseLeave = (e: MouseEvent) => {
        handleHoverLeave(chart);
        if (isDragging) {
          setComparisonData(null);
        }
      };
      
      // Touch event handlers
      const onTouchStart = (e: TouchEvent) => handleTouchStart(e, chart);
      const onTouchMove = (e: TouchEvent) => handleTouchMove(e, chart);
      const onTouchEnd = (e: TouchEvent) => handleTouchEnd(e, chart);
      const onTouchCancel = (e: TouchEvent) => {
        if (isDragging) {
          setComparisonData(null);
        }
      };
      
      // Add mouse event listeners
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('mouseleave', onMouseLeave);
      
      // Add touch event listeners
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });
      
      return () => {
        // Remove mouse event listeners
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseleave', onMouseLeave);
        
        // Remove touch event listeners
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('touchcancel', onTouchCancel);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd, handleHover, handleHoverLeave, isDragging]);

  // Memoize expensive calculations to prevent unnecessary re-renders
  const chartDataLength = chartData?.dataPoints?.length || 0;
  const distanceFromGoalDatasetsLength = distanceFromGoalData?.datasets?.length || 0;
  
  // Memoize default comparison data calculation
  const defaultComparisonDataMemo = useMemo(() => {
    if (chartData && chartData.dataPoints.length > 1) {
      const startIdx = 0;
      const endIdx = chartData.dataPoints.length - 1;
      const dataToUse = chartData.dataPoints;
      const datasetsToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : undefined;
      
      if (dataToUse && dataToUse.length > 1) {
        return calculateComparisonData(startIdx, endIdx, dataToUse, datasetsToUse);
      }
    }
    return null;
  }, [
    chartDataLength, 
    shouldShowDistanceFromGoal, 
    distanceFromGoalDatasetsLength, 
    calculateComparisonData,
    dateRange.start.getTime(), // Add date range dependencies
    dateRange.end.getTime()    // to ensure recalculation when dates change
  ]);

  // Effect to set default comparison data (only when the memoized calculation changes)
  useEffect(() => {
    if (defaultComparisonDataMemo) {
      setDefaultComparisonData(defaultComparisonDataMemo);
      // Only set as active comparison if no drag selection has been made
      if (dragStartDataIndex === null && dragEndDataIndex === null) {
        setComparisonData(defaultComparisonDataMemo);
      }
    }
  }, [defaultComparisonDataMemo, dragStartDataIndex, dragEndDataIndex]);
  
  // Effect to set up segment hover event listener
  useEffect(() => {
    const chart = volumeChartRef.current;
    if (chart && chart.canvas) {
      const canvas = chart.canvas;
      
      // Event handler for segment hover
      const handleSegmentHover = (e: Event) => {
        if (e instanceof CustomEvent && e.detail) {
          // Update current hover info
          setSegmentHoverInfo(e.detail);
          
          // Save the last valid hover info for persistent display
          setLastValidSegmentInfo(e.detail);
          
          // Always show segment details when we have valid data
          setShowSegmentDetails(true);
          
          // Note: The plugin never dispatches events for null/empty hover states
          // So this handler will only receive events with valid segment data
          // The details will stay visible until explicitly closed via the close button
        }
      };
      
      // Add event listener for segment hover
      canvas.addEventListener('segmentHover', handleSegmentHover);
      
      // Cleanup
      return () => {
        canvas.removeEventListener('segmentHover', handleSegmentHover);
      };
    }
  }, []);

  // Track if user has made a drag selection
  const hasDragSelection = dragStartDataIndex !== null && dragEndDataIndex !== null;

  // Effect to update comparison data when hover changes (for single point display)
  useEffect(() => {
    if (hoverDataIndex !== null && !isDragging && chartData?.dataPoints) {
      const dataToUse = chartData.dataPoints;
      const datasetsToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : undefined;
      
      if (dataToUse && dataToUse.length > 0) {
        const singlePointData = calculateSinglePointData(
          hoverDataIndex,
          dataToUse,
          datasetsToUse
        );
        
        if (singlePointData) {
          setComparisonData(singlePointData);
        }
      }
    } else if (hoverDataIndex === null && !isDragging) {
      // When not hovering, restore the appropriate data
      if (hasDragSelection) {
        // If user has made a drag selection, restore that selection's data
        const dataToUse = chartData.dataPoints;
        const datasetsToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : undefined;
        
        if (dataToUse && dataToUse.length > 0) {
          const dragSelectionData = calculateComparisonData(
            dragStartDataIndex,
            dragEndDataIndex,
            dataToUse,
            datasetsToUse
          );
          
          if (dragSelectionData) {
            setComparisonData(dragSelectionData);
          }
        }
      } else {
        // If no drag selection, use default comparison data
        setComparisonData(defaultComparisonData);
      }
    }
  }, [hoverDataIndex, isDragging, hasDragSelection, shouldShowDistanceFromGoal, distanceFromGoalDatasetsLength, chartDataLength, calculateSinglePointData, calculateComparisonData, defaultComparisonData, dragStartDataIndex, dragEndDataIndex]);

  // Effect to update comparison data when drag selection changes
  useEffect(() => {
    if (dragStartDataIndex !== null && dragEndDataIndex !== null && !isDragging && chartData?.dataPoints) {
      // Always use chart data points for dates/structure, datasets for multi-category analysis
      const dataToUse = chartData.dataPoints;
      const datasetsToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : undefined;
      
      if (dataToUse && dataToUse.length > 0) {
        const comparison = calculateComparisonData(dragStartDataIndex, dragEndDataIndex, dataToUse, datasetsToUse);
        if (comparison) {
          setComparisonData(comparison);
        }
      }
    }
  }, [dragStartDataIndex, dragEndDataIndex, isDragging, shouldShowDistanceFromGoal, distanceFromGoalDatasetsLength, chartDataLength, calculateComparisonData]);

  // Effect to clear drag selection when time range changes
  useEffect(() => {
    // Clear any existing drag selection when time range changes
    clearSelection();
  }, [timeRange, customStartDate?.getTime(), customEndDate?.getTime(), clearSelection]);

  return (
    <div className="space-y-6">
      {/* Comparison Analysis - Always visible */}
      <ComparisonAnalysis
        comparisonData={comparisonData}
        defaultComparisonData={defaultComparisonData}
        shouldShowDistanceFromGoal={shouldShowDistanceFromGoal}
        onClearSelection={clearSelection}
        isHovering={hoverDataIndex !== null && !hasDragSelection}
        hasDragSelection={hasDragSelection}
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

          {/* Segment Analysis - Persistent details box with close button (appears below bar chart) */}
          {showSegmentDetails && lastValidSegmentInfo && (
            <SegmentAnalysis 
              hoverInfo={segmentHoverInfo || lastValidSegmentInfo}
              onClose={handleCloseSegmentDetails}
            />
          )}
        </>
      )}
    </div>
  );
}
