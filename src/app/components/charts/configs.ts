// Chart configurations factory
import { useMemo } from 'react';
import { format } from 'date-fns';
import { TooltipItem } from 'chart.js';
import { 
  ChartDataPoint, 
  VolumeDataPoint, 
  Category, 
  DistanceFromGoalData 
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
  onHoverLeave?: (chart: any) => void // Add hover leave handler
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
            isDragging
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
            alignToPixels: false,
            offset: false
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: xUnit === 'day' ? 14 : xUnit === 'week' ? 8 : 12,
            font: {
              family: 'Gabarito, system-ui, -apple-system, sans-serif'
            }
          }
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
        if (event.native && event.native.target) {
          (event.native.target as HTMLElement).style.cursor = isDragging ? 'grabbing' : 'crosshair';
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
    onHoverLeave
  ]);
};

export const useVolumeChartConfig = (
  filteredVolumeData: VolumeDataPoint[],
  dateRange: { start: Date; end: Date },
  xUnit: 'day' | 'week' | 'month',
  hasActiveFilters: boolean
) => {
  return useMemo(() => ({
    type: 'bar' as const,
    data: {
      datasets: [
        {
          label: 'Income',
          data: filteredVolumeData.map(point => ({ x: point.x, y: point.assigned })),
          backgroundColor: 'rgba(186, 194, 255, 0.6)',
          borderColor: '#bac2ff',
          borderWidth: 1,
        },
        {
          label: 'Spending',
          data: filteredVolumeData.map(point => ({ x: point.x, y: -point.removed })),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: '#ef4444',
          borderWidth: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            color: '#ffffff',
            font: {
              family: 'Gabarito, system-ui, -apple-system, sans-serif'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#bac2ff',
          borderWidth: 1,
          titleFont: {
            family: 'Gabarito, system-ui, -apple-system, sans-serif'
          },
          bodyFont: {
            family: 'Gabarito, system-ui, -apple-system, sans-serif'
          },
          footerFont: {
            family: 'Gabarito, system-ui, -apple-system, sans-serif'
          },
          callbacks: {
            title: (context: TooltipItem<'bar'>[]) => {
              const dateStr = context[0].label;
              try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                
                const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffInDays <= 7) {
                  return format(date, 'MMM dd, yyyy');
                } else if (diffInDays <= 90) {
                  return format(date, 'MMM dd, yyyy');
                } else {
                  return format(date, 'MMM yyyy');
                }
              } catch (error) {
                console.error('Error formatting date in volume tooltip:', error, dateStr);
                return dateStr;
              }
            },
            label: (context: TooltipItem<'bar'>) => {
              const dataIndex = context.dataIndex;
              const volumePoint = filteredVolumeData[dataIndex];
              if (!volumePoint) return '';
              
              const lines = [
                `Income: ${formatCurrency(volumePoint.assigned)}`,
                `Spending: ${formatCurrency(volumePoint.removed)}`,
                `Net: ${formatCurrency(volumePoint.net)}`
              ];
              
              // Show vendors when filters are active, otherwise show categories
              if (hasActiveFilters && volumePoint.vendors.length > 0) {
                lines.push('', 'Vendors:');
                lines.push(...volumePoint.vendors.slice(0, 5));
                if (volumePoint.vendors.length > 5) {
                  lines.push(`... and ${volumePoint.vendors.length - 5} more`);
                }
              } else if (volumePoint.categories.length > 0) {
                lines.push('', 'Categories:');
                lines.push(...volumePoint.categories.slice(0, 5));
                if (volumePoint.categories.length > 5) {
                  lines.push(`... and ${volumePoint.categories.length - 5} more`);
                }
              }
              
              return lines;
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
            alignToPixels: false,
            offset: false
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: xUnit === 'day' ? 14 : xUnit === 'week' ? 8 : 12,
            font: {
              family: 'Gabarito, system-ui, -apple-system, sans-serif'
            }
          },
          // @ts-ignore
          barPercentage: 1.0,
          // @ts-ignore
          categoryPercentage: 1.0,
          // @ts-ignore
          offset: false,
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
              return formatCurrency(Math.abs(Number(value)));
            }
          }
        }
      }
    }
  }), [filteredVolumeData.length, dateRange.start.getTime(), dateRange.end.getTime(), xUnit, hasActiveFilters]);
};
