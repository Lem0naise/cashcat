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
  shouldShowDistanceFromGoal: boolean,
  distanceFromGoalData: DistanceFromGoalData,
  filteredCategoriesWithGoals: Category[],
  selectedCategories: string[],
  xUnit: 'day' | 'week' | 'month'
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
          tension: 0.2,
          pointRadius: chartData.dataPoints.length > 50 ? 2 : chartData.dataPoints.length > 30 ? 4 : 6,
          pointHoverRadius: chartData.dataPoints.length > 50 ? 4 : chartData.dataPoints.length > 30 ? 6 : 10,
          pointBackgroundColor: '#bac2ff',
          pointBorderColor: '#0a0a0a',
          pointBorderWidth: 1,
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
            chartData,
            selectedCategories,
            shouldShowDistanceFromGoal,
            distanceFromGoalData
          }
        },
        title: {
          display: true,
          text: shouldShowDistanceFromGoal 
            ? `Category Progress Tracking (${filteredCategoriesWithGoals.length} categories)`
            : `Account Balance Over Time (${chartData.dataPoints.length} points)`,
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        },
        legend: {
          display: shouldShowDistanceFromGoal && filteredCategoriesWithGoals.length > 1,
          labels: {
            color: '#ffffff'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#bac2ff',
          borderWidth: 1,
          callbacks: {
            title: (context: TooltipItem<'line'>[]) => {
              const dateStr = context[0].label;
              try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                
                return format(date, 'MMM dd, yyyy');
              } catch (error) {
                console.error('Error formatting date in tooltip:', error, dateStr);
                return dateStr;
              }
            },
            label: (context: TooltipItem<'line'>) => {
              const value = context.parsed.y;
              const datasetIndex = context.datasetIndex;
              const category = filteredCategoriesWithGoals[datasetIndex];
              
              if (!category) {
                return shouldShowDistanceFromGoal ? `${formatCurrency(value)} remaining` : `Balance: ${formatCurrency(value)}`;
              }
              
              if (shouldShowDistanceFromGoal) {
                if (category.goal === null || category.goal === undefined) {
                  // Savings category
                  if (value >= 0) {
                    return `${category.name}: ${formatCurrency(value)} accumulated`;
                  } else {
                    return `${category.name}: ${formatCurrency(Math.abs(value))} spent from savings`;
                  }
                } else {
                  // Regular spending category with goal
                  if (value >= 0) {
                    return `${category.name}: ${formatCurrency(value)} remaining`;
                  } else {
                    return `${category.name}: ${formatCurrency(Math.abs(value))} over budget`;
                  }
                }
              } else {
                return `Balance: ${formatCurrency(value)}`;
              }
            },
            afterBody: (context: TooltipItem<'line'>[]) => {
              if (shouldShowDistanceFromGoal) {
                // Show additional goal information for distance from goal view
                const datasetIndex = context[0].datasetIndex;
                const category = filteredCategoriesWithGoals[datasetIndex];
                if (category) {
                  const currentValue = context[0].parsed.y;
                  
                  if (category.goal === null || category.goal === undefined) {
                    // Savings category without goal
                    const spentAmount = Math.max(0, -currentValue); // If negative, show how much was spent
                    return [
                      '',
                      `Category Type: Savings/No Goal`,
                      currentValue >= 0 
                        ? `Value accumulated this month: ${formatCurrency(currentValue)}`
                        : `Spent from savings this month: ${formatCurrency(spentAmount)}`
                    ];
                  } else {
                    // Regular spending category with goal
                    const goalAmount = category.goal;
                    const spentAmount = goalAmount - currentValue;
                    return [
                      '',
                      `Monthly Goal: ${formatCurrency(goalAmount)}`,
                      `Month-to-date Spent: ${formatCurrency(Math.max(0, spentAmount))}`,
                      currentValue >= 0 
                        ? `Remaining this month: ${formatCurrency(currentValue)}`
                        : `Over budget this month: ${formatCurrency(Math.abs(currentValue))}`
                    ];
                  }
                }
                return [];
              } else {
                // Show assignment breakdown for account balance view
                const dataPoint = chartData.dataPoints[context[0].dataIndex];
                if (dataPoint?.assignmentBreakdown) {
                  const breakdown = Object.entries(dataPoint.assignmentBreakdown)
                    .filter(([_, amount]) => Math.abs(amount as number) > 0)
                    .sort(([,a], [,b]) => Math.abs(b as number) - Math.abs(a as number))
                    .slice(0, 8)
                    .map(([categoryId, amount]) => {
                      const category = categories.find(c => c.id === categoryId);
                      const amountNum = amount as number;
                      const sign = amountNum >= 0 ? '+' : '-';
                      return `${category?.name || 'Unknown'}: ${sign}${formatCurrency(Math.abs(amountNum))}`;
                    });
                  return breakdown.length > 0 ? ['', 'This Period:', ...breakdown] : [];
                }
                return [];
              }
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
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
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
      onHover: (event: any, activeElements: any[]) => {
        if (event.native && event.native.target) {
          (event.native.target as HTMLElement).style.cursor = isDragging ? 'grabbing' : 'crosshair';
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
    shouldShowDistanceFromGoal, 
    distanceFromGoalData.datasets.length, 
    filteredCategoriesWithGoals.length,
    selectedCategories.length,
    xUnit
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
            weight: 'bold' as const
          }
        },
        legend: {
          display: true,
          labels: {
            color: '#ffffff'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#bac2ff',
          borderWidth: 1,
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
            callback: function(value: any) {
              return formatCurrency(Math.abs(Number(value)));
            }
          }
        }
      }
    }
  }), [filteredVolumeData.length, dateRange.start.getTime(), dateRange.end.getTime(), xUnit, hasActiveFilters]);
};
