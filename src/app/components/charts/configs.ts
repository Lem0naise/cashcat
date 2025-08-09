// Chart configurations factory
import { useMemo } from 'react';
import { format } from 'date-fns';
import { TooltipItem } from 'chart.js';
import { 
  ChartDataPoint, 
  VolumeDataPoint, 
  Category, 
  DistanceFromGoalData,
  Transaction 
} from './types';
import { formatCurrency } from './utils';
import { comparisonSelectionPlugin } from './plugins';

export const useLineChartConfig = (
  chartData: { dataPoints: ChartDataPoint[]; volumePoints: VolumeDataPoint[] },
  categories: Category[],
  dateRange: { start: Date; end: Date },
  isDragging: boolean,
  dragStartDataIndex: number | null,
  dragEndDataIndex: number | null,
  hoverDataIndex: number | null,
  shouldShowDistanceFromGoal: boolean,
  distanceFromGoalData: DistanceFromGoalData,
  filteredCategoriesWithGoals: Category[],
  selectedCategories: string[],
  xUnit: 'day' | 'week' | 'month',
  comparisonData: any, // Add comparison data parameter
  onRealTimeUpdate?: (data: any) => void, // Add real-time update callback
  calculateComparisonData?: (startIdx: number, endIdx: number, dataToUse: any[], datasets?: any[]) => any, // Add calculation function
  onHover?: (event: any, chart: any) => void, // Add hover handler
  onHoverLeave?: (chart: any) => void, // Add hover leave handler
  onZoomRange?: (start: Date, end: Date) => void, // New: Zoom action from selection
  suppressNextLineAnim: boolean = false
) => {
  return useMemo(() => ({
    type: 'line' as const,
    data: {
      datasets: shouldShowDistanceFromGoal ? distanceFromGoalData.datasets : [
        {
          label: 'Account Balance',
          data: chartData.dataPoints,
          borderColor: '#bac2ff',
          backgroundColor: 'rgba(186, 194, 255, 0.1)',
          fill: true,
          tension: 0.4,
          cubicInterpolationMode: 'monotone' as const,
          pointRadius: 3,
          pointHoverRadius: 3,
          pointBackgroundColor: '#bac2ff',
          pointBorderColor: '#bac2ff',
          pointBorderWidth: 0,
        }
      ]
    },
    plugins: [comparisonSelectionPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        // Disable the immediate next re-draw animation when requested (post-zoom morph)
        duration: suppressNextLineAnim ? 0 : 800,
        easing: 'easeOutQuart' as const
      },
      // Smooth morphing when changing x-scale min/max (used for in-canvas Zoom)
      transitions: {
        zoom: {
          animation: {
            duration: 600,
            easing: 'easeOutCubic' as const
          }
        }
      } as const,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        comparisonSelection: {
          selectionState: {
            dragStartDataIndex,
            dragEndDataIndex,
            hoverDataIndex,
            chartData,
            selectedCategories,
            shouldShowDistanceFromGoal,
            distanceFromGoalData,
            comparisonData,
            onRealTimeUpdate,
            calculateComparisonData,
            isDragging,
            onZoomRange
          }
        } as any, // Type assertion to avoid TypeScript issues
        title: {
          display: true,
          text: shouldShowDistanceFromGoal 
            ? `Category Progress Tracking (${filteredCategoriesWithGoals.length} categories)`
            : `Account Balance Over Time`,
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold' as const,
            family: 'Gabarito, system-ui, -apple-system, sans-serif'
          }
        },
        legend: {
  display: shouldShowDistanceFromGoal && filteredCategoriesWithGoals.length > 1,
  labels: {
    usePointStyle: true,
    pointStyle: "circle",
    color: '#ffffff',
    padding: 20,
    boxWidth: 10,
    boxHeight: 8,
    textAlign: 'left' as const,
    font: {
      family: 'Gabarito, system-ui, -apple-system, sans-serif',
      size: 15 // Match your legend font size
    }
  },
  onClick: () => {}
},
        tooltip: {
          enabled: false // Disable tooltips in favor of hover lines and comparison analysis
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          // Keep the x-scale pinned to current data extents so the line spans the full width
          min: (() => {
            const pts = chartData.dataPoints;
            if (pts && pts.length > 0) {
              const first = new Date(pts[0].x).getTime();
              return first;
            }
            return dateRange.start.getTime();
          })(),
          max: (() => {
            const pts = chartData.dataPoints;
            if (pts && pts.length > 0) {
              const last = new Date(pts[pts.length - 1].x).getTime();
              return last;
            }
            return dateRange.end.getTime();
          })(),
          time: {
            unit: xUnit,
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            alignToPixels: true,
            offset: false
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: xUnit === 'day' ? 14 : xUnit === 'week' ? 8 : 12,
            font: {
              family: 'Gabarito, system-ui, -apple-system, sans-serif'
            },
            source: 'data' as const,
            align: 'center' as const
          },
          bounds: 'data' as const,
          offset: false
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            font: {
              family: 'Gabarito, system-ui, -apple-system, sans-serif'
            },
            callback: function(value: any) {
              if (shouldShowDistanceFromGoal) {
                const numValue = Number(value);
                if (numValue >= 0) {
                  return `+${formatCurrency(numValue)}`;
                } else {
                  return `-${formatCurrency(Math.abs(numValue))}`;
                }
              } else {
                return formatCurrency(Number(value));
              }
            }
          }
        }
      },
      onHover: (event: any, activeElements: any[], chart: any) => {
        // Respect the plugin-drawn Zoom button hit area for cursor feedback
        if (event && event.native && event.native.target) {
          const canvas = event.native.target as HTMLCanvasElement;
          const mouseEvt = event.native as MouseEvent;
          // Prefer offsetX/offsetY which are relative to the canvas
          const mx = (mouseEvt as any).offsetX ?? event.x;
          const my = (mouseEvt as any).offsetY ?? event.y;
          const rect = (chart as any)._zoomButtonRect as { x: number; y: number; w: number; h: number } | undefined;
          const overZoom = !!rect && mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
          canvas.style.cursor = overZoom ? 'pointer' : (isDragging ? 'grabbing' : 'crosshair');
        }
        
        // Call custom hover handler if provided
        if (onHover && event.native) {
          onHover(event.native, chart);
        }
      },
      onLeave: (event: any, activeElements: any[], chart: any) => {
        // Call custom hover leave handler if provided
        if (onHoverLeave) {
          onHoverLeave(chart);
        }
      },
    }
  }), [
    chartData.dataPoints.length, 
    categories.length, 
    dateRange.start.getTime(), 
    dateRange.end.getTime(), 
    isDragging, 
    dragStartDataIndex, 
    dragEndDataIndex,
    hoverDataIndex,
    shouldShowDistanceFromGoal, 
    distanceFromGoalData.datasets.length, 
    filteredCategoriesWithGoals.length,
    selectedCategories.length,
    xUnit,
    onRealTimeUpdate,
    calculateComparisonData,
    onHover,
  onHoverLeave,
  suppressNextLineAnim
  ]);
};

export const useVolumeChartConfig = (
  filteredVolumeData: VolumeDataPoint[],
  dateRange: { start: Date; end: Date },
  xUnit: 'day' | 'week' | 'month',
  hasActiveFilters: boolean,
  categories: Category[],
  selectedCategories: string[] = [],
  selectedGroups: string[] = [],
  transactions?: Transaction[], // Add optional transactions parameter
  suppressNextBarAnim: boolean = false
) => {
  return useMemo(() => {
    // Import our segmentation utilities
    const { processSegmentedBarData, generateColorShades, createGradient } = require('./utils/segmentedBars');
    const { segmentedBarsPlugin } = require('./plugins/segmentedBars');
    
    // Process the volume data to generate segments - now with transactions for accurate segment values
    const segmentedBarData = processSegmentedBarData(
      filteredVolumeData,
      categories,
      selectedCategories,
      selectedGroups,
      transactions // Pass transactions to enable accurate segment calculations
    );
    
    // Generate colors for income (purple) and spending (red) segments
    const incomeBaseColor = '#bac2ff'; // Light purple
    const spendingBaseColor = '#ef4444'; // Red
    
    // Determine the maximum number of segments to generate colors for
    const maxIncomeSegments = Math.max(
      ...segmentedBarData.map((point: any) => point.incomeSegments.segments.length),
      1
    );
    const maxSpendingSegments = Math.max(
      ...segmentedBarData.map((point: any) => point.spendingSegments.segments.length),
      1
    );
    
    // Generate color arrays for the segments
    const incomeColors = generateColorShades(incomeBaseColor, maxIncomeSegments);
    const spendingColors = generateColorShades(spendingBaseColor, maxSpendingSegments);

    return {
      type: 'bar' as const,
      plugins: [segmentedBarsPlugin],
      data: {
        datasets: [
          {
            label: 'Income',
            data: filteredVolumeData.map((point, index) => {
              const segments = segmentedBarData[index]?.incomeSegments.segments || [];
              const segmentType = segmentedBarData[index]?.incomeSegments.segmentType || 'category';
              
              return {
                x: point.x,
                y: point.assigned,
                segments: segments,
                total: point.assigned,
                segmentType
              };
            }),
            backgroundColor: incomeBaseColor,
            borderColor: '#bac2ff',
            borderWidth: 1,
            stack: 'stack0',
            maxBarThickness: 80,
            // Custom properties for segmented bars plugin
            useSegmentedBars: true,
            segmentColors: incomeColors
          },
          {
            label: 'Spending',
            data: filteredVolumeData.map((point, index) => {
              const segments = segmentedBarData[index]?.spendingSegments.segments || [];
              const segmentType = segmentedBarData[index]?.spendingSegments.segmentType || 'category';
              
              return {
                x: point.x,
                y: -point.removed,
                segments: segments,
                total: point.removed,
                segmentType
              };
            }),
            backgroundColor: spendingBaseColor,
            borderColor: '#ef4444',
            borderWidth: 1,
            stack: 'stack0',
            maxBarThickness: 80,
            // Custom properties for segmented bars plugin
            useSegmentedBars: true,
            segmentColors: spendingColors
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Smooth morphing + default animation (suppressed when needed)
        transitions: {
          zoom: {
            animation: {
              duration: 600,
              easing: 'easeOutCubic' as const
            }
          }
        } as const,
        animation: {
          duration: suppressNextBarAnim ? 0 : 800,
          easing: 'easeOutQuart' as const
        },
        // Bar chart specific options for full width bars
        barPercentage: 1.0,
        categoryPercentage: 1.0,
        elements: {
          bar: {
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 3
          }
        },
        // Store raw transactions in chart options for advanced analysis
        _transactions: transactions, // Make transactions available to plugins
        _categories: categories, // Make categories available to plugins
        plugins: {
          title: {
            display: true,
            text: hasActiveFilters 
              ? 'Filtered Income vs Spending Activity' 
              : 'Income vs Spending Activity',
            color: '#ffffff',
            font: {
              size: 14,
              weight: 'bold' as const,
              family: 'Gabarito, system-ui, -apple-system, sans-serif'
            }
          },
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              color: '#ffffff',
              padding: 20,
              boxWidth: 10,
              boxHeight: 8,
              textAlign: 'left' as const,
              font: {
                family: 'Gabarito, system-ui, -apple-system, sans-serif'
              }
            }
          },
          tooltip: {
            // Disable the standard tooltips since we'll use a fixed info box below the chart
            enabled: false,
            callbacks: {
              // Enhanced tooltip to show segment-specific data
              beforeLabel: (context: TooltipItem<'bar'>) => {
                // Check if we have a segment index
                if (context.datasetIndex === undefined || context.raw === undefined) {
                  return '';
                }
                
                // Get the dataset and its data
                const dataset = context.chart.data.datasets[context.datasetIndex];
                const dataPoint = dataset.data[context.dataIndex];
                
                // Skip if not using segmented bars
                if (!dataPoint) {
                  return '';
                }
                
                // Determine if we're looking at income or spending
                const isIncome = context.datasetIndex === 0;
                
                // Get the segmented data
                const volumePoint = filteredVolumeData[context.dataIndex];
                const segmentData = segmentedBarData[context.dataIndex];
                
                if (!volumePoint || !segmentData) {
                  return '';
                }
                
                // Set up the segment type label
                const segmentType = isIncome 
                  ? segmentData.incomeSegments.segmentType 
                  : segmentData.spendingSegments.segmentType;
                
                const segmentTypeLabel = segmentType === 'vendor' 
                  ? 'Vendors' 
                  : segmentType === 'category' ? 'Categories' : 'Groups';
                
                return `${isIncome ? 'Income' : 'Spending'} Breakdown by ${segmentTypeLabel}:`;
              },
              
              label: (context: TooltipItem<'bar'>) => {
                const dataIndex = context.dataIndex;
                const volumePoint = filteredVolumeData[dataIndex];
                if (!volumePoint) return '';
                
                const isIncome = context.datasetIndex === 0;
                const segmentData = segmentedBarData[dataIndex];
                
                // Check if we're hovering over a specific segment
                const hoveredSegment = context.chart.hoveredSegmentInfo;
                
                // If we have a specific segment being hovered, show just that segment's info
                if (hoveredSegment) {
                  const name = hoveredSegment.name;
                  const value = hoveredSegment.value;
                  const percentage = hoveredSegment.percentage.toFixed(1);
                  
                  // Get the segment type for proper attribution
                  const segmentType = isIncome 
                    ? segmentData?.incomeSegments?.segmentType 
                    : segmentData?.spendingSegments?.segmentType;
                  
                  const segmentTypeLabel = 
                    segmentType === 'vendor' ? 'Vendor' : 
                    segmentType === 'category' ? 'Category' : 'Group';
                  
                  // Return segment-specific info
                  return [
                    `${segmentTypeLabel}: ${name}`,
                    `${formatCurrency(value)}`,
                    `${percentage}% of total ${isIncome ? 'income' : 'spending'}`,
                    '',
                    isIncome && volumePoint
                      ? `From a total income of ${formatCurrency(volumePoint.assigned)}`
                      : volumePoint
                        ? `From a total spending of ${formatCurrency(volumePoint.removed)}`
                        : ''
                  ];
                }
                
                // Otherwise, show info for all segments
                // Get segments for the relevant dataset
                const segments = isIncome 
                  ? segmentData.incomeSegments.segments 
                  : segmentData.spendingSegments.segments;
                
                // Format segments into tooltip lines
                const lines = segments.map((segment: any) => {
                  const percentage = segment.percentage.toFixed(1);
                  return `${segment.name}: ${formatCurrency(segment.value)} (${percentage}%)`;
                });
                
                // Add totals
                lines.push('');
                if (isIncome) {
                  lines.push(`Total Income: ${formatCurrency(volumePoint.assigned)}`);
                } else {
                  lines.push(`Total Spending: ${formatCurrency(volumePoint.removed)}`);
                }
                
                return lines;
              },
              
              afterLabel: (context: TooltipItem<'bar'>) => {
                const dataIndex = context.dataIndex;
                if (dataIndex === undefined || dataIndex < 0 || 
                    dataIndex >= filteredVolumeData.length) return '';
                
                const volumePoint = filteredVolumeData[dataIndex];
                if (!volumePoint) return '';
                
                // Check if we're hovering over a specific segment
                const hoveredSegment = context.chart.hoveredSegmentInfo;
                
                // If hovering a specific segment, don't show net amount
                if (hoveredSegment) {
                  return [];
                }
                
                // Show net amount for general bar hover
                return [`Net: ${formatCurrency(volumePoint.net)}`];
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time' as const,
            time: {
              unit: xUnit,
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              alignToPixels: true,
              offset: false
            },
            ticks: {
              color: '#ffffff',
              maxTicksLimit: xUnit === 'day' ? 14 : xUnit === 'week' ? 8 : 12,
              font: {
                family: 'Gabarito, system-ui, -apple-system, sans-serif'
              },
              source: 'data' as const,
              align: 'center' as const
            },
            bounds: 'data' as const,
            offset: false,
            // Keep the x-scale pinned to current data extents so bars span the full width (aligned with line chart)
            min: (() => {
              const pts = filteredVolumeData;
              if (pts && pts.length > 0) {
                const first = new Date(pts[0].x).getTime();
                return first;
              }
              return dateRange.start.getTime();
            })(),
            max: (() => {
              const pts = filteredVolumeData;
              if (pts && pts.length > 0) {
                const last = new Date(pts[pts.length - 1].x).getTime();
                return last;
              }
              return dateRange.end.getTime();
            })()
          },
          y: {
            stacked: false,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#ffffff',
              font: {
                family: 'Gabarito, system-ui, -apple-system, sans-serif'
              },
              callback: function(value: any) {
                return formatCurrency(Math.abs(Number(value)));
              }
            }
          }
        }
      }
    };
  }, [
    filteredVolumeData.length,
    dateRange.start.getTime(),
    dateRange.end.getTime(),
    xUnit,
    hasActiveFilters,
    categories.length,
    selectedCategories.join(','),
    selectedGroups.join(','),
    transactions // Add transactions to the dependency array
  ]);
};
