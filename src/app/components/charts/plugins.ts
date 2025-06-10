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
      
      // Get the actual data points to work with
      const dataToUse = shouldShowDistanceFromGoal ? distanceFromGoalData.dataPoints : chartData.dataPoints;
      if (!dataToUse || dataToUse.length === 0) {
        ctx.restore();
        return;
      }
      
      // Ensure indices are within bounds
      const startIdx = Math.max(0, Math.min(dragStartDataIndex, dataToUse.length - 1));
      const endIdx = Math.max(0, Math.min(dragEndDataIndex, dataToUse.length - 1));
      
      const startPoint = dataToUse[startIdx];
      const endPoint = dataToUse[endIdx];
      
      if (!startPoint || !endPoint) {
        ctx.restore();
        return;
      }
      
      // Get pixel positions for the dates
      const startX = scales.x.getPixelForValue(startPoint.x);
      const endX = scales.x.getPixelForValue(endPoint.x);
      
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
        // Determine color based on value change
        let isPositiveChange = false;
        
        if (shouldShowDistanceFromGoal && distanceFromGoalData.datasets.length > 0) {
          // For goal tracking, use the first dataset's values
          const dataset = distanceFromGoalData.datasets[0];
          const startValue = dataset.data[startIdx]?.y;
          const endValue = dataset.data[endIdx]?.y;
          if (startValue !== undefined && endValue !== undefined) {
            isPositiveChange = endValue >= startValue;
          }
        } else {
          // For balance tracking
          const startValue = startPoint.y;
          const endValue = endPoint.y;
          isPositiveChange = endValue >= startValue;
        }
        
        // Set fill color based on change direction
        ctx.fillStyle = isPositiveChange 
          ? 'rgba(0, 255, 0, 0.15)' 
          : 'rgba(255, 100, 0, 0.15)';
        
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
