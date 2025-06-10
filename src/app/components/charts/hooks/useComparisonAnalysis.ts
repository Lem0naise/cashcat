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
      
      // Handle multiple category breakdown
      if (selectedCategories.length > 1 && datasets && datasets.length > 1) {
        // Multi-category analysis
        categoryBreakdown = [];
        
        // Use the first dataset for main values or calculate average
        startValue = datasets[0].data[earlierIdx]?.y || 0;
        endValue = datasets[0].data[laterIdx]?.y || 0;
        
        // Validate numbers and handle NaN
        if (isNaN(startValue) || !isFinite(startValue)) startValue = 0;
        if (isNaN(endValue) || !isFinite(endValue)) endValue = 0;
        
        absoluteChange = endValue - startValue;
        percentageChange = startValue !== 0 ? (absoluteChange / startValue) * 100 : 0;
        
        // Validate calculated values
        if (isNaN(absoluteChange) || !isFinite(absoluteChange)) absoluteChange = 0;
        if (isNaN(percentageChange) || !isFinite(percentageChange)) percentageChange = 0;
        
        // Calculate breakdown for each category
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
              const catPercentageChange = catStartValue !== 0 ? (catAbsoluteChange / catStartValue) * 100 : 0;
              
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
