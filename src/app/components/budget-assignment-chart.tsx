'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  TooltipItem,
  BarElement,
  ChartEvent,
  ActiveElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { addDays, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Database } from '../../types/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  BarElement
);

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

interface BudgetAssignmentChartProps {
  assignments: Assignment[];
  categories: Category[];
  transactions: Transaction[]; // Make transactions required, not optional
  timeRange: '7d' | '30d' | '3m' | '12m' | 'all' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  selectedGroups: string[];
  selectedCategories: string[];
  showGoals: boolean;
  showRollover: boolean;
}

interface ChartDataPoint {
  x: string;
  y: number;
  totalBudgetPool?: number;
  assignmentBreakdown?: { [categoryId: string]: number };
}

interface VolumeDataPoint {
  x: string;
  assigned: number;
  removed: number;
  net: number;
  categories: string[];
}

export default function BudgetAssignmentChart({
  assignments,
  categories,
  transactions,
  timeRange,
  customStartDate,
  customEndDate,
  selectedGroups,
  selectedCategories,
  showGoals,
  showRollover
}: BudgetAssignmentChartProps) {
  const lineChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; dataIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number; dataIndex: number } | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    startDate: string;
    endDate: string;
    startValue: number;
    endValue: number;
    absoluteChange: number;
    percentageChange: number;
    timeSpan: number;
  } | null>(null);

  // Filter transactions based on selected groups/categories
  const filteredTransactions = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    
    return transactions.filter(transaction => {
      // Skip if transaction is null/undefined
      if (!transaction) return false;
      
      // Skip starting balance transactions
      if (transaction.type === 'starting') return false;
      
      // Find the category for this transaction
      const category = categories.find(c => c && c.id === transaction.category_id);
      
      // Only filter out payments without categories (income can have no category)
      if (!category && transaction.type === 'payment') return false;
      
      // Apply category filters
      if (selectedCategories.length > 0) {
        return transaction.category_id && selectedCategories.includes(transaction.category_id);
      }
      
      // Apply group filters
      if (selectedGroups.length > 0) {
        return category && category.group && selectedGroups.includes(category.group);
      }

      return true;
    });
  }, [transactions, categories, selectedGroups, selectedCategories]);

  // Calculate date range based on timeRange
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (timeRange) {
      case '7d':
        start = addDays(now, -7);
        break;
      case '30d':
        start = addDays(now, -30);
        break;
      case '3m':
        start = addDays(now, -90);
        break;
      case '12m':
        start = addDays(now, -365);
        break;
      case 'custom':
        start = customStartDate || addDays(now, -30);
        end = customEndDate || now;
        break;
      case 'all':
      default:
        const oldestTransaction = filteredTransactions.reduce((oldest, transaction) => {
          const transactionDate = new Date(transaction.date);
          return transactionDate < oldest ? transactionDate : oldest;
        }, now);
        start = oldestTransaction;
        break;
    }

    return { start: startOfDay(start), end: endOfDay(end) };
  }, [timeRange, customStartDate, customEndDate, filteredTransactions]);

  // Process transactions into chart data points
  const chartData = useMemo(() => {
    // Check if transactions is actually an array
    if (!Array.isArray(transactions)) {
      return { dataPoints: [], volumePoints: [] };
    }

    // Always include ALL transactions for balance calculation
    const allTransactions = transactions || [];
    const validTransactions = allTransactions.filter(t => {
      return t && t.date && t.amount !== undefined && t.amount !== null;
    });

    const allSorted = [...validTransactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Show starting balance calculation
    const startingTransaction = allTransactions.find(t => t && t.type === 'starting');
    const startingBalance = startingTransaction?.amount || 0;

    // Filter transactions within date range
    const transactionsInRange = allSorted.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inRange = !isNaN(transactionDate.getTime()) && 
             transactionDate >= dateRange.start && 
             transactionDate <= dateRange.end;
      return inRange;
    });

    // If no transactions in range, create a simple starting point
    if (transactionsInRange.length === 0) {
      const todayKey = format(new Date(), 'yyyy-MM-dd 12:00:00');
      return {
        dataPoints: [{
          x: todayKey,
          y: startingBalance,
          assignmentBreakdown: {}
        }],
        volumePoints: [{
          x: todayKey,
          assigned: 0,
          removed: 0,
          net: 0,
          categories: []
        }]
      };
    }

    // Get unique transaction dates
    const uniqueDates = [...new Set(transactionsInRange.map(t => t.date))].sort();
    
    // Determine grouping strategy based on data density and time range
    const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Always try to maximize data points
    let groupedByPeriod: { [dateKey: string]: Transaction[] };
    
    // Strategy 1: Use individual dates if we have reasonable density
    if (uniqueDates.length <= 100) {
      // Use individual transaction dates for maximum granularity
      groupedByPeriod = uniqueDates.reduce((acc, date) => {
        const key = format(new Date(date), 'yyyy-MM-dd 12:00:00');
        acc[key] = transactionsInRange.filter(t => t.date === date);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }
    // Strategy 2: For very dense data, use time-based grouping but still maximize points
    else {
      const getGranularityKey = (date: Date) => {
        // For up to 3 months, use daily
        if (diffInDays <= 90) {
          return format(date, 'yyyy-MM-dd 12:00:00');
        }
        // For up to 1 year, use weekly (this gives ~52 points instead of 12)
        else if (diffInDays <= 365) {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          return format(startOfWeek, 'yyyy-MM-dd 12:00:00');
        }
        // For longer periods, use bi-weekly (this gives ~26 points per year)
        else {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          // Group into bi-weekly periods
          const weekOfYear = Math.floor((startOfWeek.getTime() - new Date(startOfWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
          const biWeeklyPeriod = Math.floor(weekOfYear / 2) * 2;
          const biWeeklyStart = new Date(startOfWeek.getFullYear(), 0, 1 + (biWeeklyPeriod * 7));
          return format(biWeeklyStart, 'yyyy-MM-dd 12:00:00');
        }
      };

      groupedByPeriod = transactionsInRange.reduce((acc, transaction) => {
        const transactionDate = new Date(transaction.date);
        const key = getGranularityKey(transactionDate);
        
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(transaction);
        return acc;
      }, {} as { [dateKey: string]: Transaction[] });
    }

    const dataPoints: ChartDataPoint[] = [];
    const volumePoints: VolumeDataPoint[] = [];
    
    let cumulativeBalance = startingBalance;

    // Calculate running balance for each period
    const sortedPeriodKeys = Object.keys(groupedByPeriod).sort();
    
    // Add starting point if we have transactions and it makes sense
    if (sortedPeriodKeys.length > 0) {
      const firstTransactionDate = new Date(sortedPeriodKeys[0]);
      const dayBefore = new Date(firstTransactionDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      // Only add starting point if it's within our date range and wouldn't create too many points
      if (dayBefore >= dateRange.start && sortedPeriodKeys.length < 90) {
        const startingKey = format(dayBefore, 'yyyy-MM-dd 12:00:00');
        dataPoints.push({
          x: startingKey,
          y: startingBalance,
          assignmentBreakdown: {}
        });
        
        volumePoints.push({
          x: startingKey,
          assigned: 0,
          removed: 0,
          net: 0,
          categories: []
        });
      }
    }
    
    sortedPeriodKeys.forEach((periodKey, index) => {
      const periodTransactions = groupedByPeriod[periodKey] || [];
      
      let income = 0;
      let spending = 0;
      let netChange = 0;
      const affectedCategories: string[] = [];
      const categoryBreakdown: { [categoryId: string]: number } = {};

      // Process transactions for this period
      periodTransactions.forEach(transaction => {
        if (!transaction || typeof transaction.amount !== 'number') return;
        
        const amount = transaction.amount;
        
        if (transaction.type === 'income') {
          income += amount;
          netChange += amount;
        } else if (transaction.type === 'payment') {
          spending += Math.abs(amount);
          netChange -= Math.abs(amount);
        }

        // Track category breakdown
        if (transaction.category_id) {
          const category = categories.find(c => c && c.id === transaction.category_id);
          if (category) {
            if (!categoryBreakdown[transaction.category_id]) {
              categoryBreakdown[transaction.category_id] = 0;
            }
            categoryBreakdown[transaction.category_id] += transaction.type === 'payment' ? -Math.abs(amount) : amount;
            
            if (category.name && !affectedCategories.includes(category.name)) {
              affectedCategories.push(category.name);
            }
          }
        }
      });

      cumulativeBalance += netChange;

      dataPoints.push({
        x: periodKey,
        y: cumulativeBalance,
        assignmentBreakdown: categoryBreakdown
      });

      volumePoints.push({
        x: periodKey,
        assigned: income,
        removed: spending,
        net: netChange,
        categories: affectedCategories
      });
    });

    return { dataPoints, volumePoints };
  }, [transactions, categories, dateRange]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Chart.js configuration for line chart
  const lineChartConfig = useMemo(() => ({
    type: 'line' as const,
    data: {
      datasets: [
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
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        title: {
          display: true,
          text: `Account Balance Over Time (${chartData.dataPoints.length} points)`,
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        },
        legend: {
          display: false
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
              return `Balance: ${formatCurrency(value)}`;
            },
            afterBody: (context: TooltipItem<'line'>[]) => {
              const dataPoint = chartData.dataPoints[context[0].dataIndex];
              if (dataPoint?.assignmentBreakdown) {
                const breakdown = Object.entries(dataPoint.assignmentBreakdown)
                  .filter(([_, amount]) => Math.abs(amount) > 0)
                  .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                  .slice(0, 8)
                  .map(([categoryId, amount]) => {
                    const category = categories.find(c => c.id === categoryId);
                    const sign = amount >= 0 ? '+' : '-';
                    return `${category?.name || 'Unknown'}: ${sign}${formatCurrency(Math.abs(amount))}`;
                  });
                return breakdown.length > 0 ? ['', 'This Period:', ...breakdown] : [];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: (() => {
              const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
              const pointCount = chartData.dataPoints.length;
              
              if (pointCount > 100 || diffInDays > 730) return 'month' as const;
              if (pointCount > 50 || diffInDays > 180) return 'week' as const;
              return 'day' as const;
            })(),
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: Math.min(chartData.dataPoints.length > 50 ? 8 : 12, 15)
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            callback: function(value: any) {
              return formatCurrency(Number(value));
            }
          }
        }
      },
      onHover: (event: ChartEvent, activeElements: ActiveElement[]) => {
        if (event.native && event.native.target) {
          (event.native.target as HTMLElement).style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        }
      },
      onClick: (event: ChartEvent, activeElements: ActiveElement[], chart: any) => {
        if (activeElements.length > 0 && lineChartRef.current) {
          // Use the modern Chart.js way to get relative position
          const rect = chart.canvas.getBoundingClientRect();
          const mouseEvent = event.native as MouseEvent;
          const x = mouseEvent ? mouseEvent.clientX - rect.left : 0;
          const y = mouseEvent ? mouseEvent.clientY - rect.top : 0;
          const dataIndex = activeElements[0].index;
          
          if (!isDragging) {
            setDragStart({
              x,
              y,
              dataIndex
            });
            setIsDragging(true);
          } else if (dragStart) {
            setDragEnd({
              x,
              y,
              dataIndex
            });
            
            // Calculate comparison data
            const startPoint = chartData.dataPoints[dragStart.dataIndex];
            const endPoint = chartData.dataPoints[dataIndex];
            
            if (startPoint && endPoint) {
              const startDate = startPoint.x;
              const endDate = endPoint.x;
              const startValue = startPoint.y;
              const endValue = endPoint.y;
              const absoluteChange = endValue - startValue;
              const percentageChange = startValue !== 0 ? (absoluteChange / startValue) * 100 : 0;
              
              try {
                const startDateTime = new Date(startDate);
                const endDateTime = new Date(endDate);
                const timeSpanDays = Math.abs((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
                
                setComparisonData({
                  startDate,
                  endDate,
                  startValue,
                  endValue,
                  absoluteChange,
                  percentageChange,
                  timeSpan: timeSpanDays
                });
              } catch (error) {
                console.error('Error calculating time span:', error);
              }
            }
            
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
          }
        }
      }
    }
  }), [chartData, categories, formatCurrency, dateRange, isDragging, dragStart]);

  // Chart.js configuration for volume chart
  const volumeChartConfig = useMemo(() => ({
    type: 'bar' as const,
    data: {
      datasets: [
        {
          label: 'Income',
          data: chartData.volumePoints.map(point => ({ x: point.x, y: point.assigned })),
          backgroundColor: 'rgba(186, 194, 255, 0.6)',
          borderColor: '#bac2ff',
          borderWidth: 1,
        },
        {
          label: 'Spending',
          data: chartData.volumePoints.map(point => ({ x: point.x, y: -point.removed })),
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
          text: 'Income vs Spending Activity',
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
              const volumePoint = chartData.volumePoints[dataIndex];
              if (!volumePoint) return '';
              
              const lines = [
                `Income: ${formatCurrency(volumePoint.assigned)}`,
                `Spending: ${formatCurrency(volumePoint.removed)}`,
                `Net: ${formatCurrency(volumePoint.net)}`
              ];
              
              if (volumePoint.categories.length > 0) {
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
            unit: (() => {
              const diffInDays = Math.abs((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
              if (diffInDays <= 7) return 'day' as const;
              if (diffInDays <= 90) return 'day' as const;
              if (diffInDays <= 365) return 'week' as const;
              return 'month' as const;
            })(),
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff'
          }
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
  }), [chartData, formatCurrency, dateRange]);

  return (
    <div className="space-y-6">
      {/* Comparison Tooltip */}
      {comparisonData && (
        <div className="bg-white/[.05] rounded-lg p-4 border border-green/20">
          <h4 className="font-medium text-green mb-2">Comparison Analysis</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-white/50">Time Span</span>
              <p className="font-medium">
                {comparisonData.timeSpan < 1 
                  ? `${Math.round(comparisonData.timeSpan * 24)} hour${Math.round(comparisonData.timeSpan * 24) !== 1 ? 's' : ''}`
                  : `${Math.round(comparisonData.timeSpan)} day${Math.round(comparisonData.timeSpan) !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div>
              <span className="text-white/50">Balance Change</span>
              <p className={`font-medium ${comparisonData.absoluteChange >= 0 ? 'text-green' : 'text-reddy'}`}>
                {comparisonData.absoluteChange >= 0 ? '+' : ''}{formatCurrency(comparisonData.absoluteChange)}
              </p>
            </div>
            <div>
              <span className="text-white/50">Percentage Change</span>
              <p className={`font-medium ${comparisonData.percentageChange >= 0 ? 'text-green' : 'text-reddy'}`}>
                {comparisonData.percentageChange >= 0 ? '+' : ''}{comparisonData.percentageChange.toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-white/50">Period</span>
              <p className="font-medium text-xs">
                {(() => {
                  try {
                    const start = new Date(comparisonData.startDate);
                    const end = new Date(comparisonData.endDate);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                      return 'Invalid dates';
                    }
                    return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
                  } catch (error) {
                    return 'Error formatting dates';
                  }
                })()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setComparisonData(null)}
            className="mt-2 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            Clear comparison
          </button>
        </div>
      )}

      {/* Instructions */}
      {!comparisonData && (
        <div className="bg-blue/10 rounded-lg p-3 border border-blue/20">
          <p className="text-sm text-blue/90">
            💡 <strong>Tip:</strong> Click and hold on any point, then click another point to compare spending over time.
          </p>
        </div>
      )}

      {/* Show helpful message when no data */}
      {Array.isArray(transactions) && transactions.length === 0 && (
        <div className="bg-blue/10 rounded-lg p-4 border border-blue/20">
          <h4 className="font-medium text-blue mb-2">No Transaction Data</h4>
          <p className="text-sm text-blue/90">
            It looks like no transactions have been loaded. Try:
          </p>
          <ul className="text-sm text-blue/90 list-disc list-inside mt-2 space-y-1">
            <li>Adding some transactions first</li>
            <li>Checking if you're logged in properly</li>
            <li>Refreshing the page</li>
          </ul>
        </div>
      )}

      {/* Only show charts when we have valid transaction data */}
      {Array.isArray(transactions) && chartData.dataPoints.length > 0 && (
        <>
          {/* Main Line Chart */}
          <div className="bg-white/[.02] rounded-lg p-4 h-96">
            <Line ref={lineChartRef} {...lineChartConfig} />
          </div>

          {/* Volume Chart - Increased height from h-48 to h-96 */}
          <div className="bg-white/[.02] rounded-lg p-4 h-96">
            <Bar ref={volumeChartRef} {...volumeChartConfig} />
          </div>
        </>
      )}
    </div>
  );
}
