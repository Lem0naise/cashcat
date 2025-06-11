// Chart.js plugin for rendering comparison selection visualization
import { Plugin } from 'chart.js';
import { format } from 'date-fns';

export const comparisonSelectionPlugin: Plugin<'line'> = {
  id: 'comparisonSelection',
  afterDraw: (chart, args, options) => {
    const { ctx, chartArea, scales } = chart;
    const { left, right, top, bottom } = chartArea;
    const { selectionState } = options as any;
    
    if (!selectionState) return;
    
    const { 
      dragStartDataIndex, 
      dragEndDataIndex, 
      chartData, 
      selectedCategories,
      shouldShowDistanceFromGoal,
      distanceFromGoalData 
    } = selectionState;
    
    // Only draw selection lines if we have valid selection
    if (dragStartDataIndex !== null && dragEndDataIndex !== null) {
      ctx.save();
      
      // Always use the main chart data points for x-axis positions
      // The time periods are the same regardless of whether we show distance from goal
      if (!chartData.dataPoints || chartData.dataPoints.length === 0) {
        ctx.restore();
        return;
      }
      
      // Helper function to get interpolated x position and date for fractional indices
      const getInterpolatedPosition = (fractionalIndex: number) => {
        const clampedIndex = Math.max(0, Math.min(fractionalIndex, chartData.dataPoints.length - 1));
        const lowerIndex = Math.floor(clampedIndex);
        const upperIndex = Math.min(Math.ceil(clampedIndex), chartData.dataPoints.length - 1);
        
        if (lowerIndex === upperIndex) {
          // Exact index, no interpolation needed
          const point = chartData.dataPoints[lowerIndex];
          const date = new Date(point.x);
          return {
            x: scales.x.getPixelForValue(date.getTime()),
            date: date
          };
        }
        
        // Interpolate between two data points
        const ratio = clampedIndex - lowerIndex;
        const lowerPoint = chartData.dataPoints[lowerIndex];
        const upperPoint = chartData.dataPoints[upperIndex];
        
        const lowerTime = new Date(lowerPoint.x).getTime();
        const upperTime = new Date(upperPoint.x).getTime();
        const interpolatedTime = lowerTime + (upperTime - lowerTime) * ratio;
        
        return {
          x: scales.x.getPixelForValue(interpolatedTime),
          date: new Date(interpolatedTime)
        };
      };
      
      const startPos = getInterpolatedPosition(dragStartDataIndex);
      const endPos = getInterpolatedPosition(dragEndDataIndex);
      
      // Check if we got valid pixel positions
      if (isNaN(startPos.x) || isNaN(endPos.x)) {
        ctx.restore();
        return;
      }
      
      // Ensure start is always left of end
      const leftX = Math.min(startPos.x, endPos.x);
      const rightX = Math.max(startPos.x, endPos.x);
      const leftDate = startPos.x <= endPos.x ? startPos.date : endPos.date;
      const rightDate = startPos.x <= endPos.x ? endPos.date : startPos.date;
      
      // Draw vertical lines
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(186, 194, 255, 0.8)';
      ctx.lineWidth = 2;
      
      // Start line
      ctx.moveTo(leftX, top);
      ctx.lineTo(leftX, bottom);
      
      // End line
      ctx.moveTo(rightX, top);
      ctx.lineTo(rightX, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw shaded area only if not multiple categories
      const shouldDrawShadedArea = selectedCategories.length <= 1;
      
      if (shouldDrawShadedArea) {
        // Use the same logic as the ComparisonAnalysis component for color determination
        let isPositiveChange = false;
        
        try {
          // Calculate color directly from data points for immediate and accurate feedback
          // Ensure we always compare chronologically (earlier date vs later date)
          
          // Round fractional indices for data access
          const chronoStartIdx = Math.min(Math.round(dragStartDataIndex), Math.round(dragEndDataIndex));
          const chronoEndIdx = Math.max(Math.round(dragStartDataIndex), Math.round(dragEndDataIndex));
          
          if (shouldShowDistanceFromGoal && distanceFromGoalData.datasets.length > 0) {
            // For goal tracking, use the first dataset's values
            const dataset = distanceFromGoalData.datasets[0];
            const chronoStartValue = dataset.data[chronoStartIdx]?.y;
            const chronoEndValue = dataset.data[chronoEndIdx]?.y;
            if (chronoStartValue !== undefined && chronoEndValue !== undefined) {
              // For distance from goal: positive change = getting closer to goal (lower distance = green)
              isPositiveChange = chronoEndValue <= chronoStartValue;
            }
          } else {
            // For balance tracking, use the chart data points
            const chronoStartPoint = chartData.dataPoints[chronoStartIdx];
            const chronoEndPoint = chartData.dataPoints[chronoEndIdx];
            if (chronoStartPoint && chronoEndPoint) {
              // For balance: positive change = balance increased from earlier to later date (green)
              isPositiveChange = chronoEndPoint.y >= chronoStartPoint.y;
            }
          }
        } catch (error) {
          // If there's an error, default to positive
          isPositiveChange = true;
        }
        
        // Set fill color based on change direction - use exact same colors as ComparisonAnalysis
        // text-green = #bac2ff (light blue), text-reddy = #f2602f (orange-red)
        ctx.fillStyle = isPositiveChange 
          ? 'rgba(186, 194, 255, 0.15)'  // Light blue with transparency (matches text-green)
          : 'rgba(242, 96, 47, 0.15)';   // Orange-red with transparency (matches text-reddy)
        
        ctx.fillRect(leftX, top, rightX - leftX, bottom - top);
      }
      
      // Draw date labels
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 3;
      
      try {
        const startLabel = format(leftDate, 'MMM dd');
        const endLabel = format(rightDate, 'MMM dd');
        
        // Draw text with stroke for better visibility
        ctx.strokeText(startLabel, leftX, bottom + 20);
        ctx.fillText(startLabel, leftX, bottom + 20);
        
        ctx.strokeText(endLabel, rightX, bottom + 20);
        ctx.fillText(endLabel, rightX, bottom + 20);
      } catch (error) {
        console.error('Error formatting dates for labels:', error);
      }
      
      ctx.restore();
    }
  }
};
