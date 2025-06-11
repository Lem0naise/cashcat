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
      
      // Ensure indices are within bounds
      const startIdx = Math.max(0, Math.min(dragStartDataIndex, chartData.dataPoints.length - 1));
      const endIdx = Math.max(0, Math.min(dragEndDataIndex, chartData.dataPoints.length - 1));
      
      const startPoint = chartData.dataPoints[startIdx];
      const endPoint = chartData.dataPoints[endIdx];
      
      if (!startPoint || !endPoint) {
        ctx.restore();
        return;
      }
      
      // Convert string dates to Date objects for Chart.js time scale
      const startDate = new Date(startPoint.x);
      const endDate = new Date(endPoint.x);
      
      // Get pixel positions for the dates using timestamps
      const startX = scales.x.getPixelForValue(startDate.getTime());
      const endX = scales.x.getPixelForValue(endDate.getTime());
      
      // Check if we got valid pixel positions
      if (isNaN(startX) || isNaN(endX)) {
        ctx.restore();
        return;
      }
      
      // Ensure start is always left of end
      const leftX = Math.min(startX, endX);
      const rightX = Math.max(startX, endX);
      
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
          // This ensures we match exactly what the comparison analysis will calculate
          
          if (shouldShowDistanceFromGoal && distanceFromGoalData.datasets.length > 0) {
            // For goal tracking, use the first dataset's values
            const dataset = distanceFromGoalData.datasets[0];
            const startValue = dataset.data[startIdx]?.y;
            const endValue = dataset.data[endIdx]?.y;
            if (startValue !== undefined && endValue !== undefined) {
              // For distance from goal: positive change = getting closer to goal (green)
              isPositiveChange = endValue >= startValue;
            }
          } else {
            // For balance tracking, use the chart data points
            const startValue = startPoint.y;
            const endValue = endPoint.y;
            // For balance: positive change = balance increased (green)
            isPositiveChange = endValue >= startValue;
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
        const startDate = new Date(startPoint.x);
        const endDate = new Date(endPoint.x);
        
        const startLabel = format(startDate, 'MMM dd');
        const endLabel = format(endDate, 'MMM dd');
        
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
