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
            // Calculate percentage as change relative to the goal amount
            percentageChange = (absoluteChange / goalAmount) * 100;
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
              
              // For distance from goal, calculate percentage based on goal amount
              let catPercentageChange: number;
              const goalAmount = category.goal || 0;
              
              if (goalAmount > 0) {
                // Calculate percentage as change relative to the goal amount
                catPercentageChange = (catAbsoluteChange / goalAmount) * 100;
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
          const overallPercentageChange = overallStartValue !== 0 ? (overallAbsoluteChange / overallStartValue) * 100 : 0;
          
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

  // Mouse event handlers for drag-to-select with throttling for performance
  const handleMouseDown = useCallback((event: MouseEvent, chart: any) => {
    const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      setDragStartDataIndex(dataIndex);
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent, chart: any) => {
    if (!isDragging || dragStartDataIndex === null) return;
    
    const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      // Only update if the index actually changed to reduce re-renders
      setDragEndDataIndex(prev => prev !== dataIndex ? dataIndex : prev);
      chart.update('none'); // Update without animation
    }
  }, [isDragging, dragStartDataIndex]);

  const handleMouseUp = useCallback((event: MouseEvent, chart: any) => {
    if (!isDragging || dragStartDataIndex === null) return;
    
    const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
    if (elements.length > 0) {
      const endIndex = elements[0].index;
      setDragEndDataIndex(endIndex);
      setIsDragging(false);
    }
  }, [isDragging, dragStartDataIndex]);

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
