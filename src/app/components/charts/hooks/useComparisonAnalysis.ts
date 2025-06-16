// Comparison analysis hooks for drag-to-select functionality
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Category, ComparisonData } from '../types';

export const useComparisonAnalysis = (
  selectedCategories: string[],
  categories: Category[]
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDataIndex, setDragStartDataIndex] = useState<number | null>(null);
  const [dragEndDataIndex, setDragEndDataIndex] = useState<number | null>(null);
  const [hoverDataIndex, setHoverDataIndex] = useState<number | null>(null);
  const [lastDragEndPosition, setLastDragEndPosition] = useState<{ x: number; dataIndex: number } | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [defaultComparisonData, setDefaultComparisonData] = useState<ComparisonData | null>(null);

  // Memoize categories map for performance
  const categoriesMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  // Helper function to calculate comparison data between two data indices
  const calculateComparisonData = useCallback((
    startIdx: number, 
    endIdx: number, 
    dataToUse: any[], 
    datasets?: any[]
  ): ComparisonData | null => {
    if (!dataToUse || dataToUse.length === 0) {
      return null;
    }
    
    // Round fractional indices to integers for actual data access
    const roundedStartIdx = Math.round(startIdx);
    const roundedEndIdx = Math.round(endIdx);
    
    // Ensure indices are within bounds
    if (roundedStartIdx < 0 || roundedEndIdx < 0 || 
        roundedStartIdx >= dataToUse.length || roundedEndIdx >= dataToUse.length) {
      return null;
    }
    
    // Ensure chronological order
    const earlierIdx = Math.min(roundedStartIdx, roundedEndIdx);
    const laterIdx = Math.max(roundedStartIdx, roundedEndIdx);
    
    const startPoint = dataToUse[earlierIdx];
    const endPoint = dataToUse[laterIdx];
    
    if (!startPoint || !endPoint) return null;
    
    const startDate = startPoint.x;
    const endDate = endPoint.x;
    
    try {
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      const timeSpanDays = Math.abs((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate main comparison values
      let startValue: number, endValue: number, absoluteChange: number, percentageChange: number;
      let categoryBreakdown: Array<{
        categoryId: string;
        name: string;
        startValue: number;
        endValue: number;
        absoluteChange: number;
        percentageChange: number;
      }> | undefined;
      
      // Handle category analysis when we have distance-from-goal datasets
      if (datasets && datasets.length > 0) {
        // Single or multi-category analysis with distance from goal datasets
        categoryBreakdown = [];
        
        // For single category, use the dataset values directly for main stats
        // For multiple categories, use the first dataset for main values  
        startValue = datasets[0].data[earlierIdx]?.y || 0;
        endValue = datasets[0].data[laterIdx]?.y || 0;
        
        // Validate numbers and handle NaN
        if (isNaN(startValue) || !isFinite(startValue)) startValue = 0;
        if (isNaN(endValue) || !isFinite(endValue)) endValue = 0;
        
        absoluteChange = endValue - startValue;
        
        // For distance from goal, calculate percentage based on goal amount, not distance value
        // This provides a more meaningful percentage that represents improvement/deterioration
        if (datasets.length === 1 && selectedCategories.length === 1) {
          // Single category - get the goal amount for meaningful percentage
          const categoryId = selectedCategories[0];
          const category = categoriesMap.get(categoryId);
          const goalAmount = category?.goal || 0;
          
          if (goalAmount > 0) {
            // For distance-from-goal, calculate percentage change relative to the starting distance
            // This gives a more intuitive percentage (e.g., "50% closer to goal" rather than "1000% of goal amount")
            if (startValue !== 0) {
              percentageChange = (absoluteChange / Math.abs(startValue)) * 100;
            } else {
              // If starting from goal (distance = 0), calculate relative to goal amount
              percentageChange = (absoluteChange / goalAmount) * 100;
            }
            
            // Debug logging for troubleshooting extreme percentages
            if (Math.abs(percentageChange) > 500) {
              console.log('High percentage detected:', {
                categoryId,
                categoryName: category?.name,
                goalAmount,
                absoluteChange,
                startValue,
                endValue,
                percentageChange,
                calculationMethod: startValue !== 0 ? 'relative to starting distance' : 'relative to goal amount'
              });
            }
          } else {
            // No goal set, use traditional percentage calculation
            percentageChange = startValue !== 0 ? (absoluteChange / Math.abs(startValue)) * 100 : 0;
          }
        } else {
          // Multiple categories or other scenarios - use traditional calculation with absolute values
          percentageChange = startValue !== 0 ? (absoluteChange / Math.abs(startValue)) * 100 : 0;
        }
        
        // Validate calculated values
        if (isNaN(absoluteChange) || !isFinite(absoluteChange)) absoluteChange = 0;
        if (isNaN(percentageChange) || !isFinite(percentageChange)) percentageChange = 0;
        
        // Calculate breakdown for each category (works for single or multiple)
        datasets.forEach((dataset, index) => {
          if (index < selectedCategories.length && categoryBreakdown) {
            const categoryId = selectedCategories[index];
            const category = categoriesMap.get(categoryId);
            
            if (category && dataset.data[earlierIdx] && dataset.data[laterIdx]) {
              let catStartValue = dataset.data[earlierIdx].y || 0;
              let catEndValue = dataset.data[laterIdx].y || 0;
              
              // Validate category values
              if (isNaN(catStartValue) || !isFinite(catStartValue)) catStartValue = 0;
              if (isNaN(catEndValue) || !isFinite(catEndValue)) catEndValue = 0;
              
              const catAbsoluteChange = catEndValue - catStartValue;
              
              // For distance from goal, calculate percentage based on starting distance for more intuitive results
              let catPercentageChange: number;
              const goalAmount = category.goal || 0;
              
              if (goalAmount > 0) {
                // Calculate percentage change relative to the starting distance (more intuitive)
                if (catStartValue !== 0) {
                  catPercentageChange = (catAbsoluteChange / Math.abs(catStartValue)) * 100;
                } else {
                  // If starting from goal (distance = 0), calculate relative to goal amount
                  catPercentageChange = (catAbsoluteChange / goalAmount) * 100;
                }
              } else {
                // No goal set, use traditional percentage calculation with absolute values
                catPercentageChange = catStartValue !== 0 ? (catAbsoluteChange / Math.abs(catStartValue)) * 100 : 0;
              }
              
              categoryBreakdown.push({
                categoryId,
                name: category.name,
                startValue: catStartValue,
                endValue: catEndValue,
                absoluteChange: isNaN(catAbsoluteChange) || !isFinite(catAbsoluteChange) ? 0 : catAbsoluteChange,
                percentageChange: isNaN(catPercentageChange) || !isFinite(catPercentageChange) ? 0 : catPercentageChange
              });
            }
          }
        });
        
        // For multiple categories, calculate overall change as sum of all category changes
        if (selectedCategories.length > 1 && categoryBreakdown.length > 1) {
          const overallAbsoluteChange = categoryBreakdown.reduce((sum, cat) => sum + cat.absoluteChange, 0);
          const overallStartValue = categoryBreakdown.reduce((sum, cat) => sum + cat.startValue, 0);
          
          // For multiple categories in distance-from-goal mode, use the same logic as individual categories
          // Calculate percentage relative to the overall starting distance for consistency
          let overallPercentageChange: number;
          if (overallStartValue !== 0) {
            overallPercentageChange = (overallAbsoluteChange / Math.abs(overallStartValue)) * 100;
          } else {
            // If starting from goal (total distance = 0), calculate relative to total goal amounts
            const totalGoalAmount = selectedCategories.reduce((sum, categoryId) => {
              const category = categoriesMap.get(categoryId);
              return sum + (category?.goal || 0);
            }, 0);
            
            overallPercentageChange = totalGoalAmount > 0 ? (overallAbsoluteChange / totalGoalAmount) * 100 : 0;
          }
          
          // Update the main values to reflect the overall change
          absoluteChange = overallAbsoluteChange;
          percentageChange = overallPercentageChange;
          startValue = overallStartValue;
          endValue = overallStartValue + overallAbsoluteChange;
        }
      } else {
        // Single category or account balance analysis
        startValue = startPoint.y || 0;
        endValue = endPoint.y || 0;
        
        // Validate numbers and handle NaN
        if (isNaN(startValue) || !isFinite(startValue)) startValue = 0;
        if (isNaN(endValue) || !isFinite(endValue)) endValue = 0;
        
        absoluteChange = endValue - startValue;
        percentageChange = startValue !== 0 ? (absoluteChange / startValue) * 100 : 0;
        
        // Validate calculated values
        if (isNaN(absoluteChange) || !isFinite(absoluteChange)) absoluteChange = 0;
        if (isNaN(percentageChange) || !isFinite(percentageChange)) percentageChange = 0;
      }
      
      // Validate timeSpan
      let validTimeSpanDays = timeSpanDays;
      if (isNaN(validTimeSpanDays) || !isFinite(validTimeSpanDays)) {
        validTimeSpanDays = 1; // Default to 1 day if calculation fails
      }
      
      return {
        startDate,
        endDate,
        startValue,
        endValue,
        absoluteChange,
        percentageChange,
        timeSpan: validTimeSpanDays,
        categoryBreakdown
      };
    } catch (error) {
      console.error('Error calculating comparison data:', error);
      return null;
    }
  }, [selectedCategories, categoriesMap]);

  // Helper function to calculate single-point data for hover
  const calculateSinglePointData = useCallback((
    dataIndex: number,
    dataToUse: any[],
    datasets?: any[]
  ): ComparisonData | null => {
    if (!dataToUse || dataToUse.length === 0) {
      return null;
    }
    
    const roundedIndex = Math.round(dataIndex);
    
    // Ensure index is within bounds
    if (roundedIndex < 0 || roundedIndex >= dataToUse.length) {
      return null;
    }
    
    const point = dataToUse[roundedIndex];
    if (!point) return null;
    
    const pointDate = point.x;
    
    try {
      // For single point data, we show the current values rather than changes
      let value: number;
      let categoryBreakdown: Array<{
        categoryId: string;
        name: string;
        startValue: number;
        endValue: number;
        absoluteChange: number;
        percentageChange: number;
      }> | undefined;
      
      // Handle category analysis when we have distance-from-goal datasets
      if (datasets && datasets.length > 0) {
        categoryBreakdown = [];
        value = datasets[0].data[roundedIndex]?.y || 0;
        
        // Calculate breakdown for each category
        datasets.forEach((dataset, index) => {
          if (index < selectedCategories.length && categoryBreakdown) {
            const categoryId = selectedCategories[index];
            const category = categoriesMap.get(categoryId);
            
            if (category && dataset.data[roundedIndex]) {
              const catValue = dataset.data[roundedIndex].y || 0;
              
              categoryBreakdown.push({
                categoryId,
                name: category.name,
                startValue: catValue, // For single point, start and end are the same
                endValue: catValue,
                absoluteChange: 0, // No change for single point
                percentageChange: 0 // No change for single point
              });
            }
          }
        });
        
        // For multiple categories, sum the values
        if (selectedCategories.length > 1 && categoryBreakdown.length > 1) {
          value = categoryBreakdown.reduce((sum, cat) => sum + cat.startValue, 0);
        }
      } else {
        // Single account balance analysis
        value = point.y || 0;
      }
      
      // Validate value
      if (isNaN(value) || !isFinite(value)) value = 0;
      
      return {
        startDate: pointDate,
        endDate: pointDate, // Same date for single point
        startValue: value,
        endValue: value,
        absoluteChange: 0, // No change for single point
        percentageChange: 0, // No change for single point
        timeSpan: 0, // No time span for single point
        categoryBreakdown
      };
    } catch (error) {
      console.error('Error calculating single point data:', error);
      return null;
    }
  }, [selectedCategories, categoriesMap]);

  // Helper function to convert pointer position to data index with smooth interpolation (no snapping)
  const getDataIndexFromPointerPosition = useCallback((clientX: number, chart: any): number | null => {
    const rect = chart.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    
    const { chartArea } = chart;
    if (!chartArea) return null;
    
    // Check if pointer is within chart area
    if (x < chartArea.left || x > chartArea.right) return null;
    
    // Get the data length
    const dataLength = chart.data.datasets[0]?.data?.length || 0;
    if (dataLength === 0) return null;
    
    // Calculate fractional index based on pixel position
    // This gives us smooth interpolation without depending on Chart.js's time scale snapping
    const chartWidth = chartArea.right - chartArea.left;
    const relativeX = x - chartArea.left;
    const fractionalIndex = (relativeX / chartWidth) * (dataLength - 1);
    
    // Clamp to valid range
    return Math.max(0, Math.min(dataLength - 1, fractionalIndex));
  }, []);

  // Helper function to extract clientX from either mouse or touch event
  const getClientX = useCallback((event: MouseEvent | TouchEvent): number => {
    if ('touches' in event) {
      // Touch event - use the first touch if available
      if (event.type === 'touchend' || event.type === 'touchcancel') {
        // For touch end/cancel, use changedTouches instead of touches
        return event.changedTouches.length > 0 ? event.changedTouches[0].clientX : 0;
      } else {
        // For touchstart and touchmove, use touches
        return event.touches.length > 0 ? event.touches[0].clientX : 0;
      }
    } else {
      // Mouse event
      return event.clientX;
    }
  }, []);

  // Mouse and touch event handlers for drag-to-select with smooth positioning (no snapping)
  const handlePointerDown = useCallback((event: MouseEvent | TouchEvent, chart: any) => {
    const clientX = getClientX(event);
    const dataIndex = getDataIndexFromPointerPosition(clientX, chart);
    if (dataIndex !== null) {
      // Clear hover state and previous drag position when starting a new drag selection
      setHoverDataIndex(null);
      setLastDragEndPosition(null);
      // Keep fractional index for smooth positioning - no rounding!
      setDragStartDataIndex(dataIndex);
      setDragEndDataIndex(dataIndex);
      setIsDragging(true);
      chart.update('none');
    }
  }, [getDataIndexFromPointerPosition, getClientX]);

  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent, chart: any) => {
    if (!isDragging || dragStartDataIndex === null) return;
    
    const clientX = getClientX(event);
    const dataIndex = getDataIndexFromPointerPosition(clientX, chart);
    if (dataIndex !== null) {
      // Keep fractional index for smooth positioning - no rounding!
      
      // Only update if the index actually changed significantly to reduce re-renders
      const threshold = 0.1; // Small threshold to avoid micro-updates
      if (dragEndDataIndex === null || Math.abs(dragEndDataIndex - dataIndex) > threshold) {
        setDragEndDataIndex(dataIndex);
        // Force immediate chart redraw to show visual feedback
        chart.update('none');
      }
    }
  }, [isDragging, dragStartDataIndex, dragEndDataIndex, getDataIndexFromPointerPosition, getClientX]);

  const handlePointerUp = useCallback((event: MouseEvent | TouchEvent, chart: any) => {
    if (!isDragging || dragStartDataIndex === null) return;
    
    const clientX = getClientX(event);
    const dataIndex = getDataIndexFromPointerPosition(clientX, chart);
    if (dataIndex !== null) {
      // Keep fractional index for smooth positioning - final selection can be fractional
      setDragEndDataIndex(dataIndex);
      setIsDragging(false);
      
      // Store the last drag end position for distance threshold checking
      setLastDragEndPosition({ x: clientX, dataIndex });
    }
  }, [isDragging, dragStartDataIndex, getDataIndexFromPointerPosition, getClientX]);

  // Legacy mouse event handlers (for backward compatibility)
  const handleMouseDown = useCallback((event: MouseEvent, chart: any) => {
    handlePointerDown(event, chart);
  }, [handlePointerDown]);

  const handleMouseMove = useCallback((event: MouseEvent, chart: any) => {
    handlePointerMove(event, chart);
  }, [handlePointerMove]);

  const handleMouseUp = useCallback((event: MouseEvent, chart: any) => {
    handlePointerUp(event, chart);
  }, [handlePointerUp]);

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent, chart: any) => {
    // Prevent default to avoid scrolling while dragging
    event.preventDefault();
    handlePointerDown(event, chart);
  }, [handlePointerDown]);

  const handleTouchMove = useCallback((event: TouchEvent, chart: any) => {
    // Prevent default to avoid scrolling while dragging
    event.preventDefault();
    handlePointerMove(event, chart);
  }, [handlePointerMove]);

  const handleTouchEnd = useCallback((event: TouchEvent, chart: any) => {
    // Prevent default to avoid triggering mouse events
    event.preventDefault();
    handlePointerUp(event, chart);
  }, [handlePointerUp]);

  const clearSelection = useCallback(() => {
    setComparisonData(defaultComparisonData);
    setDragStartDataIndex(null);
    setDragEndDataIndex(null);
    setHoverDataIndex(null);
    setLastDragEndPosition(null);
  }, [defaultComparisonData]);

  // Hover event handlers for single-point display
  const handleHover = useCallback((event: MouseEvent, chart: any) => {
    // Don't show hover if we're dragging
    if (isDragging) return;
    
    // Don't show hover on touch devices to prevent unwanted hover activation
    // Check if this is a touch device by looking for touch support
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return;
    }
    
    // Also check if the event was triggered by a touch event
    if ((event as any).sourceCapabilities && (event as any).sourceCapabilities.firesTouchEvents) {
      return;
    }
    
    const clientX = getClientX(event);
    const dataIndex = getDataIndexFromPointerPosition(clientX, chart);
    
    // If we have a recent drag selection, check distance threshold before allowing hover
    if (lastDragEndPosition && dragStartDataIndex !== null && dragEndDataIndex !== null) {
      const DISTANCE_THRESHOLD = 250;
      const DATA_INDEX_THRESHOLD = 100;
      
      const pixelDistance = Math.abs(clientX - lastDragEndPosition.x);
      const dataDistance = dataIndex !== null ? Math.abs(dataIndex - lastDragEndPosition.dataIndex) : 0;
      
      // If we're far enough away, clear the drag selection and allow hover
      if (pixelDistance >= DISTANCE_THRESHOLD || dataDistance >= DATA_INDEX_THRESHOLD) {
        // User moved beyond threshold - clear the drag selection
        setDragStartDataIndex(null);
        setDragEndDataIndex(null);
        setLastDragEndPosition(null);
        setComparisonData(null); // This will reset to default comparison data
      } else {
        return; // Don't activate hover - still too close to drag selection
      }
    }
    
    // Only update if the hover index changed significantly
    const threshold = 0.1;
    if (dataIndex !== null && (hoverDataIndex === null || Math.abs(hoverDataIndex - dataIndex) > threshold)) {
      setHoverDataIndex(dataIndex);
      chart.update('none');
    }
  }, [isDragging, hoverDataIndex, lastDragEndPosition, dragStartDataIndex, dragEndDataIndex, getDataIndexFromPointerPosition, getClientX]);

  const handleHoverLeave = useCallback((chart: any) => {
    if (hoverDataIndex !== null) {
      setHoverDataIndex(null);
      chart.update('none');
    }
  }, [hoverDataIndex]);

  return {
    // State
    isDragging,
    dragStartDataIndex,
    dragEndDataIndex,
    hoverDataIndex,
    comparisonData,
    defaultComparisonData,
    
    // Setters
    setComparisonData,
    setDefaultComparisonData,
    
    // Functions
    calculateComparisonData,
    calculateSinglePointData,
    
    // Hover event handlers
    handleHover,
    handleHoverLeave,
    
    // Mouse event handlers (legacy)
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // Touch event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Unified pointer handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    
    clearSelection
  };
};
