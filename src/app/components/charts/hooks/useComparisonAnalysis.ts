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
    if (!dataToUse || dataToUse.length === 0 || startIdx < 0 || endIdx < 0 || 
        startIdx >= dataToUse.length || endIdx >= dataToUse.length) {
      return null;
    }
    
    // Ensure chronological order
    const earlierIdx = Math.min(startIdx, endIdx);
    const laterIdx = Math.max(startIdx, endIdx);
    
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

  // Helper function to convert mouse position to data index with smooth interpolation (no snapping)
  const getDataIndexFromMousePosition = useCallback((event: MouseEvent, chart: any): number | null => {
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Convert pixel position to time value on x-axis
    const xScale = chart.scales.x;
    if (!xScale) return null;
    
    const xValue = xScale.getValueForPixel(x);
    const dataPoints = chart.data.datasets[0]?.data || [];
    
    if (dataPoints.length === 0) return null;
    
    // Find the data points that bracket the mouse position
    let leftIndex = 0;
    let rightIndex = dataPoints.length - 1;
    
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const currentTime = new Date(dataPoints[i].x).getTime();
      const nextTime = new Date(dataPoints[i + 1].x).getTime();
      
      if (xValue >= currentTime && xValue <= nextTime) {
        leftIndex = i;
        rightIndex = i + 1;
        break;
      }
    }
    
    // Calculate interpolated position between the two data points
    const leftTime = new Date(dataPoints[leftIndex].x).getTime();
    const rightTime = new Date(dataPoints[rightIndex].x).getTime();
    
    if (rightTime === leftTime) {
      return leftIndex;
    }
    
    // Linear interpolation to get smooth positioning
    const ratio = (xValue - leftTime) / (rightTime - leftTime);
    const interpolatedIndex = leftIndex + ratio;
    
    // Return the interpolated index (can be fractional for smooth selection)
    return Math.max(0, Math.min(dataPoints.length - 1, interpolatedIndex));
  }, []);

  // Mouse event handlers for drag-to-select with smooth positioning (no snapping)
  const handleMouseDown = useCallback((event: MouseEvent, chart: any) => {
    const dataIndex = getDataIndexFromMousePosition(event, chart);
    if (dataIndex !== null) {
      // Round to nearest integer for actual data point selection
      const roundedIndex = Math.round(dataIndex);
      setDragStartDataIndex(roundedIndex);
      setDragEndDataIndex(roundedIndex);
      setIsDragging(true);
      chart.update('none');
    }
  }, [getDataIndexFromMousePosition]);

  const handleMouseMove = useCallback((event: MouseEvent, chart: any) => {
    if (!isDragging || dragStartDataIndex === null) return;
    
    const dataIndex = getDataIndexFromMousePosition(event, chart);
    if (dataIndex !== null) {
      // Round to nearest integer for actual data point selection
      const roundedIndex = Math.round(dataIndex);
      
      // Only update if the index actually changed to reduce re-renders
      if (dragEndDataIndex !== roundedIndex) {
        setDragEndDataIndex(roundedIndex);
        // Force immediate chart redraw to show visual feedback
        chart.update('none');
      }
    }
  }, [isDragging, dragStartDataIndex, dragEndDataIndex, getDataIndexFromMousePosition]);

  const handleMouseUp = useCallback((event: MouseEvent, chart: any) => {
    if (!isDragging || dragStartDataIndex === null) return;
    
    const dataIndex = getDataIndexFromMousePosition(event, chart);
    if (dataIndex !== null) {
      // Round to nearest integer for actual data point selection
      const roundedIndex = Math.round(dataIndex);
      setDragEndDataIndex(roundedIndex);
      setIsDragging(false);
    }
  }, [isDragging, dragStartDataIndex, getDataIndexFromMousePosition]);

  const clearSelection = useCallback(() => {
    setComparisonData(defaultComparisonData);
    setDragStartDataIndex(null);
    setDragEndDataIndex(null);
  }, [defaultComparisonData]);

  return {
    // State
    isDragging,
    dragStartDataIndex,
    dragEndDataIndex,
    comparisonData,
    defaultComparisonData,
    
    // Setters
    setComparisonData,
    setDefaultComparisonData,
    
    // Functions
    calculateComparisonData,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearSelection
  };
};
