// Custom Chart.js plugin for segmented bar charts
import { Plugin, ChartEvent, Chart as ChartJS } from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';
import { SegmentInfo } from '../types';

// Extend Chart.js typings to allow our custom properties
declare module 'chart.js' {
  interface Chart {
    hoveredSegmentInfo?: SegmentInfo | null;
    _lastHoveredSegmentId?: string | null;
    _hoveredSegmentPosition?: SegmentPosition | null;
    _lastHoveredDate?: string | null;
  }
}

// Interface for our extended bar data
interface SegmentedBarData {
  x: string;
  y: number;
  segments?: SegmentInfo[];
  total?: number;
  segmentType?: 'category' | 'vendor' | 'group';
  // Additional properties for detailed breakdown
  categoryDetails?: Array<{
    name: string;
    value: number;
    groupName: string;
  }>;
  vendorDetails?: Array<{
    name: string;
    value: number;
    categoryId: string;
  }>;
}

// Interface for hover event information
interface SegmentHoverInfo {
  isIncome: boolean;
  segment: SegmentInfo;
  date: string;
  volumePoint: any; // The full data point
  datasetIndex: number;
  index: number; 
  segmentIndex: number;
}

// Interface for our dataset with custom properties
interface SegmentedBarDataset {
  useSegmentedBars?: boolean;
  segmentColors?: string[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  data: Array<SegmentedBarData>;
}

// Interface for segment positions to support hover
interface SegmentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  segment: SegmentInfo;
  datasetIndex: number;
  index: number;
  segmentIndex: number;
}

// Store segment positions for hover detection
const segmentPositions: SegmentPosition[] = [];

// Performance optimization: Pre-computed hover data cache
const hoverDataCache = new Map<string, SegmentHoverInfo>();

// Flag to track if segment positions need to be recalculated
let segmentPositionsNeedUpdate = true;

// Throttling for hover events
let lastHoverTime = 0;
const HOVER_THROTTLE_MS = 8; // ~120fps for smooth hover

// Fast segment lookup - simplified approach for better performance
function findHoveredSegment(x: number, y: number): SegmentPosition | null {
  // Simple linear search - more reliable and faster for typical bar chart sizes
  for (const segPos of segmentPositions) {
    if (x >= segPos.x && x <= segPos.x + segPos.width &&
        y >= segPos.y && y <= segPos.y + segPos.height) {
      return segPos;
    }
  }
  return null;
}

// Pre-compute and cache hover data
function getHoverData(chart: any, hoveredSegment: SegmentPosition): SegmentHoverInfo {
  const segmentId = `${hoveredSegment.datasetIndex}-${hoveredSegment.index}-${hoveredSegment.segmentIndex}`;
  
  // Check cache first
  if (hoverDataCache.has(segmentId)) {
    return hoverDataCache.get(segmentId)!;
  }
  
  // Compute hover data
  const volumePointData = chart.data.datasets[hoveredSegment.datasetIndex]?.data[hoveredSegment.index] as unknown as SegmentedBarData;
  const segmentInfo = hoveredSegment.segment;
  const isIncome = hoveredSegment.datasetIndex === 0;
  
  // Create the base hover info object
  const hoverInfo: any = {
    isIncome,
    segment: segmentInfo,
    date: volumePointData?.x || '',
    volumePoint: volumePointData,
    datasetIndex: hoveredSegment.datasetIndex,
    index: hoveredSegment.index,
    segmentIndex: hoveredSegment.segmentIndex
  };
  
  // Extract sub-segment data using our helper function
  const subSegmentData = extractSubSegmentData(chart, volumePointData, segmentInfo, isIncome);
  
  if (subSegmentData && subSegmentData.items && subSegmentData.items.length > 0) {
    // Calculate percentages and format for display
    const items = subSegmentData.items.map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: (item.value / segmentInfo.value) * 100
    }));
    
    hoverInfo.subSegments = {
      type: subSegmentData.type,
      items: items
    };
  }
  
  // Cache the result
  hoverDataCache.set(segmentId, hoverInfo);
  
  return hoverInfo;
}

// Custom plugin to render segmented bars with interactive hover
export const segmentedBarsPlugin: Plugin<'bar'> = {
  id: 'segmentedBars',
  
  // Clear segment positions before each render
  beforeRender(chart) {
    // Only clear if we need to update positions (on data changes, not on every hover)
    segmentPositionsNeedUpdate = true;
    segmentPositions.length = 0;
    // Clear hover data cache for new render
    hoverDataCache.clear();
  },
  
  // Initialize tracking data
  beforeDatasetsDraw(chart) {
    // Initialize hover segment position if needed
    if (!chart._hoveredSegmentPosition) {
      chart._hoveredSegmentPosition = null;
    }
  },
  
  // Handle hover events with optimized performance
  beforeEvent(chart, args) {
    const event = args.event;
    
    // Only process hover events
    if (event.type !== 'mousemove' && event.type !== 'mouseout') return;
    
    // Add null checks for canvas
    if (!chart.canvas) return;
    
    // Throttle hover events for better performance
    const now = Date.now();
    if (event.type === 'mousemove' && now - lastHoverTime < HOVER_THROTTLE_MS) {
      return;
    }
    lastHoverTime = now;
    
    // Store positions for mouse events
    const position = event.type === 'mousemove' ? 
      getRelativePosition(event, chart) : { x: 0, y: 0 };
    
    // Handle mouseout event - we ONLY want to clear the visual highlight
    // but NEVER clear the segment details (make them persistent)
    if (event.type === 'mouseout') {
      // Only clear the visual hover highlight, but keep the segment details visible
      chart._hoveredSegmentPosition = null;
      return;
    }
    
    // Quick bounds check - only update visual highlight state when outside chart area
    const chartArea = chart.chartArea;
    if (!chartArea || 
        position.x < chartArea.left || 
        position.x > chartArea.right || 
        position.y < chartArea.top || 
        position.y > chartArea.bottom) {
      // Outside chart area, only clear visual hover highlight, keep segment details
      if (chart._hoveredSegmentPosition) {
        chart._hoveredSegmentPosition = null;
      }
      return;
    }
    
    // Find hovered segment using simplified lookup
    const hoveredSegment = findHoveredSegment(position.x, position.y);
    
    // Only proceed if we found a valid segment
    if (hoveredSegment) {
      // Generate a unique ID for the segment
      const hoveredSegmentId = `${hoveredSegment.datasetIndex}-${hoveredSegment.index}-${hoveredSegment.segmentIndex}`;
      
      // Check if this is the same segment as before - if so, skip update
      if (hoveredSegmentId === chart._lastHoveredSegmentId) {
        return;
      }
      
      // Update segment info when it's a new valid segment
      chart._lastHoveredSegmentId = hoveredSegmentId;
      chart.hoveredSegmentInfo = hoveredSegment?.segment || null;
      chart._hoveredSegmentPosition = hoveredSegment;
      
      // Store the date of the hovered segment for precise matching
      const volumePointData = chart.data.datasets[hoveredSegment.datasetIndex]?.data[hoveredSegment.index] as unknown as SegmentedBarData;
      chart._lastHoveredDate = volumePointData?.x || null;
      
      // Use cached hover data for better performance
      const hoverInfo = getHoverData(chart, hoveredSegment);
      
      // Dispatch custom event with segment data
      const hoverEvent = new CustomEvent('segmentHover', { 
        detail: hoverInfo
      });
      chart.canvas.dispatchEvent(hoverEvent);
    } else {
      // When hovering over empty space, ONLY clear the visual highlight
      // but DO NOT send any events that would clear the segment details box
      chart._hoveredSegmentPosition = null;
      // Important: We do not set chart.hoveredSegmentInfo to null here
      // And we do not dispatch any events to keep the segment details visible
    }
    // Note: We never dispatch null events, only valid segment hover events
    // This ensures the segment details box remains visible until manually closed
  },
  
  // Main drawing function for segmented bars
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const datasets = chart.data.datasets as unknown as SegmentedBarDataset[];
    
    // Only rebuild segment positions if needed, not on every hover
    const shouldUpdatePositions = segmentPositionsNeedUpdate;
    if (shouldUpdatePositions) {
      segmentPositionsNeedUpdate = false;
    }
    
    // Process each dataset
    datasets.forEach((dataset, datasetIndex) => {
      // Skip if dataset doesn't use segmented bars
      if (!dataset?.useSegmentedBars) return;
      
      const meta = chart.getDatasetMeta(datasetIndex);
      
      // Skip if meta is not available or hidden
      if (!meta || !meta.data || meta.hidden) return;
      
      // Get border properties
      const borderWidth = dataset.borderWidth || 1;
      const borderColor = dataset.borderColor || (
        datasetIndex === 0 ? '#bac2ff' : '#ef4444'
      );
      
      // Process each bar in the dataset
      meta.data.forEach((barElement, barIndex) => {
        const barData = dataset.data[barIndex] as unknown as SegmentedBarData;
        
        // Skip if no segment data is available
        if (!barData?.segments || barData.segments.length === 0) return;
        
        // Get the position and dimensions of the original bar
        const { x, y, width, height, base } = barElement.getProps(['x', 'y', 'width', 'height', 'base'], true);
        
        // Skip very narrow bars to avoid visual artifacts
        if (width < 1) return;
        
        // Determine if this is an upward or downward bar
        const isUpwardBar = y < base;
        const barTop = isUpwardBar ? y : base;
        const barBottom = isUpwardBar ? base : y;
        const totalHeight = Math.abs(y - base);
        
        // Get base color and corner radius
        const baseColor = typeof dataset.backgroundColor === 'string' 
          ? dataset.backgroundColor 
          : (datasetIndex === 0 ? '#bac2ff' : '#ef4444');
          
        const cornerRadius = typeof dataset.borderRadius === 'number' 
          ? dataset.borderRadius 
          : 3;
        
        // Get segment colors array
        const segmentColors = dataset.segmentColors || [];
        
        // Draw the segments
        const segments = barData.segments || [];
        
        // Draw only if we have valid segments
        if (segments.length > 0) {
          // Save the context state before drawing
          ctx.save();
          
          // Step 1: Draw the background/fill of the entire bar first (subtle background)
          ctx.fillStyle = `${baseColor}15`; // Use 15% opacity for a very subtle base color
          
          // Create rounded rectangle for the background
          drawRoundedRect(
            ctx, 
            x - width/2,
            barTop,
            width,
            totalHeight,
            cornerRadius,
            false
          );
          
          ctx.restore();
          ctx.save();
          
          // Step 2: Draw each segment with its own color
          let currentHeight = 0;
          const adjustedWidth = width - borderWidth; // Account for border width
          const startX = x - width/2 + borderWidth/2;
          
          segments.forEach((segment, segmentIndex) => {
            // Calculate segment height based on percentage of total
            const segmentPercentage = segment.percentage / 100;
            const segmentHeight = Math.max(1, totalHeight * segmentPercentage);
            
            // Skip tiny segments
            if (segmentHeight < 1) return;
            
            // Calculate segment position
            const segmentY = isUpwardBar 
              ? barTop + currentHeight 
              : barBottom - currentHeight - segmentHeight;
            
            // Check if this segment is currently being hovered OR if segment details are showing
            // (this makes the border persistent when the segment analysis box is open)
            const isCurrentlyHovered = chart._hoveredSegmentPosition && 
              chart._hoveredSegmentPosition.datasetIndex === datasetIndex &&
              chart._hoveredSegmentPosition.index === barIndex &&
              chart._hoveredSegmentPosition.segmentIndex === segmentIndex;
            
            const isPersistentHighlight = chart.hoveredSegmentInfo && 
              chart.hoveredSegmentInfo.name === segment.name &&
              chart.hoveredSegmentInfo.value === segment.value &&
              barData?.x === chart._lastHoveredDate; // Ensure same date for precise matching
            
            const isHighlighted = isCurrentlyHovered || isPersistentHighlight;
            
            // Apply visual enhancements for hover state with dynamic sizing based on bar width
            const dynamicHighlightScale = Math.min(0.12, Math.max(0.04, adjustedWidth / 100)); // Scale between 4% and 12% based on width
            const highlightWidth = isHighlighted ? Math.max(1, Math.floor(adjustedWidth * dynamicHighlightScale)) : 0;
            
            // Save segment position for hover detection (only when positions need updating)
            if (shouldUpdatePositions) {
              const segmentPos: SegmentPosition = {
                x: startX,
                y: segmentY,
                width: adjustedWidth,
                height: segmentHeight,
                segment,
                datasetIndex,
                index: barIndex,
                segmentIndex
              };
              
              segmentPositions.push(segmentPos);
            }
            
            // Get segment color (with fallback to base color)
            const segmentColor = segmentColors[segmentIndex] || baseColor;
            
            // Parse color to adjust opacity
            let r = 0, g = 0, b = 0;
            if (segmentColor.startsWith('#')) {
              r = parseInt(segmentColor.slice(1, 3), 16);
              g = parseInt(segmentColor.slice(3, 5), 16);
              b = parseInt(segmentColor.slice(5, 7), 16);
            } else if (segmentColor.startsWith('rgb')) {
              const match = segmentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
              if (match) {
                r = parseInt(match[1], 10);
                g = parseInt(match[2], 10);
                b = parseInt(match[3], 10);
              }
            }
            
            // Use appropriate opacity based on hover state
            // Higher opacity for highlighted segment with better contrast
            const opacity = isHighlighted ? 0.95 : 0.8;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            
            // Draw segment based on position (without rounded corners for internal segments)
            const isFirstSegment = segmentIndex === 0;
            const isLastSegment = segmentIndex === segments.length - 1;
            
            // Adjust drawing position and dimensions for highlighted segment
            const drawX = isHighlighted ? startX - highlightWidth/2 : startX;
            const drawWidth = isHighlighted ? adjustedWidth + highlightWidth : adjustedWidth;
            // We don't need to adjust Y because the scaling happens from the center
            
            if (segments.length === 1) {
              // For single segment bars, draw with rounded corners
              drawRoundedRect(
                ctx,
                drawX,
                segmentY,
                drawWidth,
                segmentHeight,
                cornerRadius,
                false
              );
            } else if (isUpwardBar) {
              // For upward bars with multiple segments
              if (isFirstSegment) {
                // First segment (top) gets top rounded corners
                drawTopRoundedRect(
                  ctx,
                  drawX,
                  segmentY,
                  drawWidth,
                  segmentHeight,
                  cornerRadius
                );
              } else if (isLastSegment) {
                // Last segment (bottom) gets bottom rounded corners
                drawBottomRoundedRect(
                  ctx,
                  drawX,
                  segmentY,
                  drawWidth,
                  segmentHeight,
                  cornerRadius
                );
              } else {
                // Middle segments are plain rectangles
                ctx.fillRect(drawX, segmentY, drawWidth, segmentHeight);
                
                // Draw a subtle separator line with better visibility
                if (!isLastSegment) {
                  ctx.save();
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(drawX, segmentY + segmentHeight);
                  ctx.lineTo(drawX + drawWidth, segmentY + segmentHeight);
                  ctx.stroke();
                  ctx.restore();
                }
              }
            } else {
              // For downward bars with multiple segments
              if (isFirstSegment) {
                // First segment (bottom) gets bottom rounded corners
                drawBottomRoundedRect(
                  ctx,
                  drawX,
                  segmentY,
                  drawWidth,
                  segmentHeight,
                  cornerRadius
                );
              } else if (isLastSegment) {
                // Last segment (top) gets top rounded corners
                drawTopRoundedRect(
                  ctx,
                  drawX,
                  segmentY,
                  drawWidth,
                  segmentHeight,
                  cornerRadius
                );
              } else {
                // Middle segments are plain rectangles
                ctx.fillRect(drawX, segmentY, drawWidth, segmentHeight);
                
                // Draw a subtle separator line with better visibility
                if (!isLastSegment) {
                  ctx.save();
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(drawX, segmentY + segmentHeight);
                  ctx.lineTo(drawX + drawWidth, segmentY + segmentHeight);
                  ctx.stroke();
                  ctx.restore();
                }
              }
            }
            
            // Move to the next segment position
            currentHeight += segmentHeight;
          });
          
          ctx.restore();
          ctx.save();
          
          // Step 3: Draw the solid outline around the entire bar
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = borderWidth;
          
          // Create rounded rectangle for the outline
          drawRoundedRect(
            ctx, 
            x - width/2,
            barTop,
            width,
            totalHeight,
            cornerRadius,
            true  // This is just the stroke
          );
          
          ctx.restore();
          
          
          ctx.restore();
        }
      });
    });
    
    // Step 5: Draw ALL highlighted segment borders in a final pass (ensures they're always on top)
    // This is done AFTER all bars and segments are drawn to guarantee borders are never overlapped
    ctx.save();
    
    datasets.forEach((dataset, datasetIndex) => {
      // Skip if dataset doesn't use segmented bars
      if (!dataset?.useSegmentedBars) return;
      
      const meta = chart.getDatasetMeta(datasetIndex);
      
      // Skip if meta is not available or hidden
      if (!meta || !meta.data || meta.hidden) return;
      
      // Get border properties
      const borderWidth = dataset.borderWidth || 1;
      
      // Process each bar in the dataset for border drawing
      meta.data.forEach((barElement, barIndex) => {
        const barData = dataset.data[barIndex] as unknown as SegmentedBarData;
        
        // Skip if no segment data is available
        if (!barData?.segments || barData.segments.length === 0) return;
        
        // Get the position and dimensions of the original bar
        const { x, y, width, height, base } = barElement.getProps(['x', 'y', 'width', 'height', 'base'], true);
        
        // Skip very narrow bars to avoid visual artifacts
        if (width < 1) return;
        
        // Determine if this is an upward or downward bar
        const isUpwardBar = y < base;
        const barTop = isUpwardBar ? y : base;
        const barBottom = isUpwardBar ? base : y;
        const totalHeight = Math.abs(y - base);
        
        // Get corner radius
        const cornerRadius = typeof dataset.borderRadius === 'number' 
          ? dataset.borderRadius 
          : 3;
        
        // Draw the segments borders
        const segments = barData.segments || [];
        const adjustedWidth = width - borderWidth; // Account for border width
        const startX = x - width/2 + borderWidth/2;
        
        // Draw borders only if we have valid segments
        if (segments.length > 0) {
          let currentHeight = 0;
          
          segments.forEach((segment, segmentIndex) => {
            const segmentPercentage = segment.percentage / 100;
            const segmentHeight = Math.max(1, totalHeight * segmentPercentage);
            
            if (segmentHeight < 1) {
              currentHeight += segmentHeight;
              return;
            }
            
            const segmentY = isUpwardBar 
              ? barTop + currentHeight 
              : barBottom - currentHeight - segmentHeight;
            
            // Check if this segment should be highlighted with precise date matching
            const isCurrentlyHovered = chart._hoveredSegmentPosition && 
              chart._hoveredSegmentPosition.datasetIndex === datasetIndex &&
              chart._hoveredSegmentPosition.index === barIndex &&
              chart._hoveredSegmentPosition.segmentIndex === segmentIndex;
            
            const isPersistentHighlight = chart.hoveredSegmentInfo && 
              chart.hoveredSegmentInfo.name === segment.name &&
              chart.hoveredSegmentInfo.value === segment.value &&
              barData?.x === chart._lastHoveredDate; // Ensure same date for precise matching
            
            const isHighlighted = isCurrentlyHovered || isPersistentHighlight;
            
            // Draw prominent highlight border for highlighted segments with dynamic sizing
            if (isHighlighted) {
              const dynamicHighlightScale = Math.min(0.12, Math.max(0.04, adjustedWidth / 100)); // Scale between 4% and 12%
              const highlightWidth = Math.max(1, Math.floor(adjustedWidth * dynamicHighlightScale));
              const drawX = startX - highlightWidth/2;
              const drawWidth = adjustedWidth + highlightWidth;
              
              // Use dynamic border width and glow based on bar size
              const dynamicBorderWidth = Math.min(3, Math.max(1, adjustedWidth / 20)); // 1-3px based on width
              const dynamicGlowIntensity = Math.min(6, Math.max(2, adjustedWidth / 15)); // 2-6px glow based on width
              
              // Use a bright, prominent border with controlled glow effect
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = dynamicBorderWidth;
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = dynamicGlowIntensity;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
              
              // Draw the border with proper rounded corners based on segment position
              if (segments.length === 1) {
                drawRoundedRect(ctx, drawX, segmentY, drawWidth, segmentHeight, cornerRadius, true);
              } else if (isUpwardBar) {
                if (segmentIndex === 0) {
                  // Top segment - top rounded corners
                  drawTopRoundedBorder(ctx, drawX, segmentY, drawWidth, segmentHeight, cornerRadius);
                } else if (segmentIndex === segments.length - 1) {
                  // Bottom segment - bottom rounded corners
                  drawBottomRoundedBorder(ctx, drawX, segmentY, drawWidth, segmentHeight, cornerRadius);
                } else {
                  // Middle segment - straight border
                  ctx.strokeRect(drawX, segmentY, drawWidth, segmentHeight);
                }
              } else {
                // Downward bar logic
                if (segmentIndex === 0) {
                  // Bottom segment - bottom rounded corners
                  drawBottomRoundedBorder(ctx, drawX, segmentY, drawWidth, segmentHeight, cornerRadius);
                } else if (segmentIndex === segments.length - 1) {
                  // Top segment - top rounded corners
                  drawTopRoundedBorder(ctx, drawX, segmentY, drawWidth, segmentHeight, cornerRadius);
                } else {
                  // Middle segment - straight border
                  ctx.strokeRect(drawX, segmentY, drawWidth, segmentHeight);
                }
              }
              
              // Reset shadow for next draws
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }
            
            currentHeight += segmentHeight;
          });
        }
      });
    });
  }
};

// Helper function to draw a rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeOnly: boolean = false
) {
  // Calculate effective radius (not exceeding half the width or height)
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  
  ctx.beginPath();
  
  // Top-left rounded corner
  ctx.moveTo(x, y + effectiveRadius);
  ctx.arcTo(x, y, x + effectiveRadius, y, effectiveRadius);
  
  // Top edge and top-right corner
  ctx.lineTo(x + width - effectiveRadius, y);
  ctx.arcTo(x + width, y, x + width, y + effectiveRadius, effectiveRadius);
  
  // Right edge and bottom-right corner
  ctx.lineTo(x + width, y + height - effectiveRadius);
  ctx.arcTo(x + width, y + height, x + width - effectiveRadius, y + height, effectiveRadius);
  
  // Bottom edge and bottom-left corner
  ctx.lineTo(x + effectiveRadius, y + height);
  ctx.arcTo(x, y + height, x, y + height - effectiveRadius, effectiveRadius);
  
  // Left edge back to start
  ctx.lineTo(x, y + effectiveRadius);
  
  ctx.closePath();
  
  if (strokeOnly) {
    ctx.stroke();
  } else {
    ctx.fill();
  }
}

// Helper function to draw a rectangle with rounded top corners only
function drawTopRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  
  ctx.beginPath();
  
  // Top-left rounded corner
  ctx.moveTo(x, y + effectiveRadius);
  ctx.arcTo(x, y, x + effectiveRadius, y, effectiveRadius);
  
  // Top edge and top-right corner
  ctx.lineTo(x + width - effectiveRadius, y);
  ctx.arcTo(x + width, y, x + width, y + effectiveRadius, effectiveRadius);
  
  // Right edge (straight)
  ctx.lineTo(x + width, y + height);
  
  // Bottom edge (straight)
  ctx.lineTo(x, y + height);
  
  // Left edge back to start
  ctx.lineTo(x, y + effectiveRadius);
  
  ctx.closePath();
  ctx.fill();
}

// Helper function to draw a rectangle with rounded bottom corners only
function drawBottomRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  
  ctx.beginPath();
  
  // Top edge (straight)
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  
  // Right edge to bottom-right corner
  ctx.lineTo(x + width, y + height - effectiveRadius);
  ctx.arcTo(x + width, y + height, x + width - effectiveRadius, y + height, effectiveRadius);
  
  // Bottom edge and bottom-left corner
  ctx.lineTo(x + effectiveRadius, y + height);
  ctx.arcTo(x, y + height, x, y + height - effectiveRadius, effectiveRadius);
  
  // Left edge back to start
  ctx.lineTo(x, y);
  
  ctx.closePath();
  ctx.fill();
}

// Helper function to draw a border with rounded top corners only
function drawTopRoundedBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  
  ctx.beginPath();
  
  // Start from bottom left
  ctx.moveTo(x, y + height);
  
  // Left edge to top-left corner
  ctx.lineTo(x, y + effectiveRadius);
  ctx.arcTo(x, y, x + effectiveRadius, y, effectiveRadius);
  
  // Top edge and top-right corner
  ctx.lineTo(x + width - effectiveRadius, y);
  ctx.arcTo(x + width, y, x + width, y + effectiveRadius, effectiveRadius);
  
  // Right edge to bottom
  ctx.lineTo(x + width, y + height);
  
  ctx.stroke();
}

// Helper function to draw a border with rounded bottom corners only
function drawBottomRoundedBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  
  ctx.beginPath();
  
  // Start from top left
  ctx.moveTo(x, y);
  
  // Right edge to bottom-right corner
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - effectiveRadius);
  ctx.arcTo(x + width, y + height, x + width - effectiveRadius, y + height, effectiveRadius);
  
  // Bottom edge and bottom-left corner
  ctx.lineTo(x + effectiveRadius, y + height);
  ctx.arcTo(x, y + height, x, y + height - effectiveRadius, effectiveRadius);
  
  // Left edge back to start
  ctx.lineTo(x, y);
  
  ctx.stroke();
}

// Helper function to extract sub-segment data from transactions
function extractSubSegmentData(chart: any, volumePoint: any, segmentInfo: any, isIncome: boolean): any {
  // Early return if we don't have segment data or transactions
  if (!volumePoint || !chart.options?._transactions) {
    return null;
  }
  
  const transactions = chart.options._transactions;
  const segmentType = volumePoint.segmentType;
  
  // Skip if we don't have transactions or segment type
  if (!Array.isArray(transactions) || !segmentType) {
    return null;
  }

  // Try to match date format (depends on how dates are stored in transactions)
  let dateKey = volumePoint.x;
  if (!dateKey) return null;
  
  // Find transactions for this date
  const dateTransactions = transactions.filter((tx: any) => {
    if (!tx.date) return false;
    
    // Convert transaction date to the format used in volumePoint.x
    // Extract just the date part (YYYY-MM-DD) for comparison
    const txDate = new Date(tx.date);
    const txDateString = txDate.toISOString().split('T')[0];
    const volumeDateString = dateKey.split(' ')[0]; // Remove time part from volumePoint.x
    
    return txDateString === volumeDateString;
  });
  
  if (segmentType === 'group') {
    // For a group segment, extract categories in this group
    const groupName = segmentInfo.name;
    const categories = chart.options._categories || [];
    
    // Create a map of category ID to category info for quick lookup
    const categoryMap = new Map();
    categories.forEach((cat: any) => {
      const catGroupName = cat.groups?.name || cat.group || 'Uncategorized';
      categoryMap.set(cat.id, {
        name: cat.name,
        groupName: catGroupName
      });
    });
    
    // Find categories in this group
    const categoriesInGroup = dateTransactions.filter((tx: any) => {
      // Look up category info using category_id
      const categoryInfo = categoryMap.get(tx.category_id);
      const txGroup = categoryInfo?.groupName || 'Uncategorized';
      const matchesGroup = txGroup === groupName;
      const matchesType = (isIncome && tx.type === 'income') || (!isIncome && tx.type === 'payment');
      
      return matchesGroup && matchesType;
    });
    
    // Aggregate by category
    const categoryAggregateMap = new Map();
    
    categoriesInGroup.forEach((tx: any) => {
      const categoryInfo = categoryMap.get(tx.category_id);
      const categoryName = categoryInfo?.name || 'Uncategorized';
      const amount = Math.abs(tx.amount || 0);
      
      if (!categoryAggregateMap.has(categoryName)) {
        categoryAggregateMap.set(categoryName, {
          name: categoryName,
          value: 0,
          groupName: groupName
        });
      }
      
      // Add transaction amount to category total
      const cat = categoryAggregateMap.get(categoryName);
      cat.value += amount;
    });
    
    return {
      type: 'category',
      items: Array.from(categoryAggregateMap.values())
    };
    
  } else if (segmentType === 'category') {
    // For a category segment, extract vendors in this category
    const categoryName = segmentInfo.name;
    const categories = chart.options._categories || [];
    
    // Create a map of category ID to category info for quick lookup
    const categoryMap = new Map();
    categories.forEach((cat: any) => {
      categoryMap.set(cat.id, {
        name: cat.name,
        groupName: cat.groups?.name || cat.group || 'Uncategorized'
      });
    });
    
    // Find transactions for this category using category_id lookup
    const vendorsInCategory = dateTransactions.filter((tx: any) => {
      // Look up category info using category_id
      const categoryInfo = categoryMap.get(tx.category_id);
      const txCategoryName = categoryInfo?.name || 'Uncategorized';
      const matchesCategory = txCategoryName === categoryName;
      const matchesType = (isIncome && tx.type === 'income') || (!isIncome && tx.type === 'payment');
      
      return matchesCategory && matchesType;
    });
    
    // Aggregate by vendor
    const vendorMap = new Map();
    
    vendorsInCategory.forEach((tx: any) => {
      const vendorName = tx.vendor || 'Unknown Vendor';
      const amount = Math.abs(tx.amount || 0);
      
      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, {
          name: vendorName,
          value: 0,
          categoryName: categoryName
        });
      }
      
      // Add transaction amount to vendor total
      const vendor = vendorMap.get(vendorName);
      vendor.value += amount;
    });
    
    return {
      type: 'vendor',
      items: Array.from(vendorMap.values())
    };
  }
  
  // For vendors, there's no further breakdown
  return null;
}
