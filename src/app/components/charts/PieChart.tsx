'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  ChartEvent,
  ActiveElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';
import { format, differenceInDays, addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';

// Register Chart.js components (without ChartDataLabels globally)
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Set Chart.js global font defaults
ChartJS.defaults.font.family = 'Gabarito, system-ui, -apple-system, sans-serif';

interface PieSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
  id: string; // group id, category id, or vendor name
  type: 'group' | 'category' | 'vendor';
}

interface PieChartProps {
  transactions: Transaction[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  selectedGroups: string[];
  selectedCategories: string[];
  onSegmentClick: (segment: PieSegment) => void;
  showTooltip?: boolean;
  matchHeight?: boolean;
  // Navigation props
  timeRange: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom';
  allTimeRange?: { start: Date; end: Date };
  onDateRangeChange?: (start: Date, end: Date) => void;
  onBack?: () => void;
}

export default function PieChart({
  transactions,
  categories,
  dateRange,
  selectedGroups,
  selectedCategories,
  onSegmentClick,
  showTooltip = true,
  matchHeight = false,
  timeRange,
  allTimeRange,
  onDateRangeChange,
  onBack
}: PieChartProps) {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<PieSegment | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Date range navigation helpers
  const dateRangeInfo = useMemo(() => {
    const durationInDays = differenceInDays(dateRange.end, dateRange.start);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Detect if we're actually in MTD/YTD mode by analyzing the date range
    // This handles cases where timeRange becomes 'custom' after navigation
    const isCompleteMonth = dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
    const isCompleteYear = dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
      dateRange.end.getTime() === endOfYear(dateRange.start).getTime();
    const isCurrentMonth = dateRange.start.getTime() === startOfMonth(today).getTime() &&
      dateRange.end.getTime() <= today.getTime() &&
      dateRange.end.getTime() >= startOfMonth(today).getTime();
    const isCurrentYear = dateRange.start.getTime() === startOfYear(today).getTime() &&
      dateRange.end.getTime() <= today.getTime() &&
      dateRange.end.getTime() >= startOfYear(today).getTime();

    // Determine the actual navigation mode
    const actualMode = (timeRange === 'mtd' || isCompleteMonth || isCurrentMonth) ? 'mtd' :
      (timeRange === 'ytd' || isCompleteYear || isCurrentYear) ? 'ytd' :
        timeRange;

    // Calculate navigation availability based on actual range type
    let isAtToday: boolean;
    let isAtStart: boolean;

    if (actualMode === 'mtd') {
      // For MTD, we're at "today" if we're showing the current month
      const currentMonth = startOfMonth(today);
      const showingCurrentMonth = dateRange.start.getTime() === currentMonth.getTime();
      isAtToday = showingCurrentMonth;

      // We're at start if the previous month would be before transaction history
      const prevMonth = subMonths(dateRange.start, 1);
      const prevMonthStart = startOfMonth(prevMonth);
      isAtStart = allTimeRange ? prevMonthStart < allTimeRange.start : false;
    } else if (actualMode === 'ytd') {
      // For YTD, we're at "today" if we're showing the current year
      const currentYear = startOfYear(today);
      const showingCurrentYear = dateRange.start.getTime() === currentYear.getTime();
      isAtToday = showingCurrentYear;

      // We're at start if there are no transactions in any previous year
      // Check if the previous year has any overlap with transaction history
      const prevYear = subYears(dateRange.start, 1);
      const prevYearStart = startOfYear(prevYear);
      const prevYearEnd = endOfYear(prevYear);
      isAtStart = allTimeRange ?
        (prevYearEnd < allTimeRange.start || prevYearStart > allTimeRange.end) :
        false;
    } else {
      // For duration-based ranges, use the existing logic
      isAtToday = differenceInDays(today, dateRange.end) <= 1;
      isAtStart = allTimeRange ? differenceInDays(dateRange.start, allTimeRange.start) <= 1 : false;
    }

    // Format the date range text
    let rangeText = '';
    let durationText = '';

    if (actualMode === 'custom') {
      if (durationInDays === 0) {
        rangeText = format(dateRange.start, 'MMM dd, yyyy');
        durationText = 'Single day';
      } else if (durationInDays < 32) {
        rangeText = `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
        durationText = `${durationInDays + 1} day${durationInDays === 0 ? '' : 's'}`;
      } else {
        rangeText = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
        durationText = `${durationInDays + 1} day${durationInDays === 0 ? '' : 's'}`;
      }
    } else {
      // For preset ranges, show a more readable format and use the preset name for duration
      if (durationInDays <= 7) {
        rangeText = `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
      } else if (durationInDays < 32) {
        rangeText = `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
      } else {
        rangeText = `${format(dateRange.start, 'MMM yyyy')} - ${format(dateRange.end, 'MMM yyyy')}`;
      }

      // Use preset-friendly duration text that matches the picker
      switch (actualMode) {
        case '7d':
          durationText = 'Last 7 days';
          break;
        case '30d':
          durationText = 'Last 30 days';
          break;
        case 'mtd':
          durationText = isCurrentMonth ? 'Month to date' : 'Complete month';
          break;
        case '3m':
          durationText = 'Last 3 months';
          break;
        case 'ytd':
          durationText = isCurrentYear ? 'Year to date' : 'Complete year';
          break;
        case '12m':
          durationText = 'Last 12 months';
          break;
        case 'all':
          durationText = 'All time';
          break;
        default:
          durationText = `${durationInDays + 1} day${durationInDays === 0 ? '' : 's'}`;
      }
    }

    return {
      durationInDays,
      isAtToday,
      isAtStart,
      rangeText,
      durationText,
      actualMode, // Include the detected mode for use in navigation handlers
      canNavigateNext: !isAtToday,
      canNavigatePrev: !isAtStart && allTimeRange !== undefined
    };
  }, [dateRange, timeRange, allTimeRange]);

  const handleNavigatePrev = () => {
    if (!onDateRangeChange || !dateRangeInfo.canNavigatePrev) return;

    let newStart: Date;
    let newEnd: Date;

    if (dateRangeInfo.actualMode === 'mtd') {
      // For MTD, go to the previous complete month
      // Use the start of the current range to determine the previous month
      const currentMonthStart = startOfMonth(dateRange.start);
      const prevMonth = subMonths(currentMonthStart, 1);
      newStart = startOfMonth(prevMonth);
      newEnd = endOfMonth(prevMonth);
    } else if (dateRangeInfo.actualMode === 'ytd') {
      // For YTD, go to the previous complete year
      const currentYearStart = startOfYear(dateRange.start);
      const prevYear = subYears(currentYearStart, 1);
      newStart = startOfYear(prevYear);
      newEnd = endOfYear(prevYear);
    } else {
      // For duration-based ranges, use the existing logic
      const duration = dateRangeInfo.durationInDays;
      newEnd = subDays(dateRange.start, 1);
      newStart = subDays(newEnd, duration);
    }

    // Don't go before the start of transaction history
    // Exception: For MTD/YTD navigation, allow going to periods that partially overlap with transaction history
    if (allTimeRange) {
      if (dateRangeInfo.actualMode === 'mtd' || dateRangeInfo.actualMode === 'ytd') {
        // For MTD/YTD, only block if the entire period is before transaction history
        if (newEnd < allTimeRange.start) {
          return;
        }
      } else {
        // For duration-based ranges, block if start is before transaction history
        if (newStart < allTimeRange.start) {
          return;
        }
      }
    }

    onDateRangeChange(newStart, newEnd);
  };

  const handleNavigateNext = () => {
    if (!onDateRangeChange || !dateRangeInfo.canNavigateNext) return;

    let newStart: Date;
    let newEnd: Date;
    const today = new Date();

    if (dateRangeInfo.actualMode === 'mtd') {
      // For MTD, go to the next month (but not beyond current month)
      // Use the start of the current range to determine the next month
      const currentMonthStart = startOfMonth(dateRange.start);
      const nextMonth = addDays(endOfMonth(currentMonthStart), 1); // First day of next month
      newStart = startOfMonth(nextMonth);
      newEnd = endOfMonth(nextMonth);

      // If the next month would be in the future, show MTD of current month instead
      if (newStart > today) {
        newStart = startOfMonth(today);
        newEnd = today;
      } else if (newEnd > today) {
        newEnd = today;
      }
    } else if (dateRangeInfo.actualMode === 'ytd') {
      // For YTD, go to the next year (but not beyond current year)
      const currentYearStart = startOfYear(dateRange.start);
      const nextYear = addDays(endOfYear(currentYearStart), 1); // First day of next year
      newStart = startOfYear(nextYear);
      newEnd = endOfYear(nextYear);

      // If the next year would be in the future, show YTD of current year instead
      if (newStart > today) {
        newStart = startOfYear(today);
        newEnd = today;
      } else if (newEnd > today) {
        newEnd = today;
      }
    } else {
      // For duration-based ranges, use the existing logic
      const duration = dateRangeInfo.durationInDays;
      newStart = addDays(dateRange.end, 1);
      newEnd = addDays(newStart, duration);

      // Don't go beyond today
      if (newEnd > today) {
        onDateRangeChange(newStart, today);
        return;
      }
    }

    onDateRangeChange(newStart, newEnd);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when the PieChart is in focus or no specific element is focused
      if (document.activeElement && document.activeElement.tagName !== 'BODY') {
        return;
      }

      if (event.key === 'ArrowLeft' && dateRangeInfo.canNavigatePrev) {
        event.preventDefault();
        handleNavigatePrev();
      } else if (event.key === 'ArrowRight' && dateRangeInfo.canNavigateNext) {
        event.preventDefault();
        handleNavigateNext();
      }
    };

    if (onDateRangeChange) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [dateRangeInfo.canNavigatePrev, dateRangeInfo.canNavigateNext, onDateRangeChange]);

  // Monitor container size for responsive behavior
  useEffect(() => {
    let resizeObserver: ResizeObserver;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions(prev => {
          // Only update if dimensions actually changed significantly
          if (Math.abs(prev.width - width) > 10 || Math.abs(prev.height - height) > 10) {
            return { width, height };
          }
          return prev;
        });
      }
    };

    if (containerRef.current) {
      updateDimensions();

      // Use ResizeObserver for more efficient resize detection
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });

      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Calculate if we should show labels based on available space
  const shouldShowLabels = useMemo(() => {
    // Use percentage-based thresholds relative to viewport
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;

    // Minimum dimensions needed to show labels comfortably
    // Scale based on viewport size for better responsiveness
    const minWidthForLabels = Math.max(400, viewportWidth * 0.4);
    const minHeightForLabels = Math.max(350, viewportHeight * 0.45);

    return containerDimensions.width >= minWidthForLabels && containerDimensions.height >= minHeightForLabels;
  }, [containerDimensions]);

  // Calculate cutout percentage based on container size and available space
  const calculateCutout = useMemo(() => {
    const containerSize = Math.min(containerDimensions.width, containerDimensions.height);

    if (containerSize === 0) return '45%'; // Default while loading

    // Base cutout percentages for different scenarios
    let baseCutout: number;

    if (shouldShowLabels) {
      // When labels are showing, use a larger cutout to keep segments from being too thick
      if (containerSize >= 700) {
        baseCutout = 60; // Large screens - bigger center hole
      } else if (containerSize >= 500) {
        baseCutout = 55; // Medium screens
      } else {
        baseCutout = 50; // Smaller screens with labels
      }
    } else {
      // When labels are hidden, we can use a smaller cutout since we have more space
      if (containerSize >= 400) {
        baseCutout = 55; // Medium to large screens without labels
      } else if (containerSize >= 300) {
        baseCutout = 50; // Small screens
      } else {
        baseCutout = 45; // Very small screens - thin segments are ok here
      }
    }

    // Ensure the center hole is always readable (minimum 120px diameter)
    const minCenterDiameter = 120;
    const availableSpace = shouldShowLabels ? containerSize - 140 : containerSize - 80;
    const minCutoutPercentage = (minCenterDiameter / availableSpace) * 100;

    // Use the larger of our base cutout or minimum required cutout
    const finalCutout = Math.max(baseCutout, minCutoutPercentage);

    // Cap at 70% to ensure segments are always visible
    return `${Math.min(70, finalCutout)}%`;
  }, [containerDimensions.width, containerDimensions.height, shouldShowLabels]);

  // Determine chart mode based on filters
  const chartMode = useMemo(() => {
    if (selectedCategories.length > 0) {
      // Check if all selected categories are from the same group
      const categoryGroups = categories
        .filter(cat => selectedCategories.includes(cat.id))
        .map(cat => (cat as any).groups?.name || cat.group || 'Uncategorized');

      const uniqueGroups = new Set(categoryGroups);
      if (uniqueGroups.size === 1) {
        return 'vendor'; // All categories from same group - show vendors
      } else {
        return 'category'; // Multiple groups - show categories
      }
    } else if (selectedGroups.length > 0) {
      return 'category'; // Groups selected - show categories within those groups
    } else {
      return 'group'; // No filters - show groups
    }
  }, [selectedGroups, selectedCategories, categories]);

  // Process transactions and create pie chart data
  const pieChartData = useMemo(() => {
    // Filter transactions by date range and type (only payments for spending)
    const filteredTransactions = transactions.filter(transaction => {
      if (!transaction || transaction.type !== 'payment') return false;

      const transactionDate = new Date(transaction.date);
      return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
    });

    // Create category map for lookups
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    let segmentData: { [key: string]: { value: number; label: string; type: 'group' | 'category' | 'vendor' } } = {};

    if (chartMode === 'group') {
      // Group by spending groups
      filteredTransactions.forEach(transaction => {
        if (!transaction.category_id) return;

        const category = categoryMap.get(transaction.category_id);
        if (!category) return;

        const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
        const amount = Math.abs(transaction.amount);

        if (!segmentData[groupName]) {
          segmentData[groupName] = { value: 0, label: groupName, type: 'group' };
        }
        segmentData[groupName].value += amount;
      });
    } else if (chartMode === 'category') {
      // Group by categories (within selected groups if any)
      const targetCategories = selectedGroups.length > 0
        ? categories.filter(cat => {
          const categoryGroup = (cat as any).groups?.name || cat.group || 'Uncategorized';
          return selectedGroups.includes(categoryGroup);
        })
        : categories;

      filteredTransactions.forEach(transaction => {
        if (!transaction.category_id) return;

        const category = categoryMap.get(transaction.category_id);
        if (!category) return;

        // Only include if category is in our target list
        if (!targetCategories.find(cat => cat.id === category.id)) return;

        const amount = Math.abs(transaction.amount);

        if (!segmentData[category.id]) {
          segmentData[category.id] = { value: 0, label: category.name, type: 'category' };
        }
        segmentData[category.id].value += amount;
      });
    } else if (chartMode === 'vendor') {
      // Group by vendors (within selected categories)
      filteredTransactions.forEach(transaction => {
        if (!transaction.category_id || !selectedCategories.includes(transaction.category_id)) return;
        if (!transaction.vendor) return;

        const amount = Math.abs(transaction.amount);

        if (!segmentData[transaction.vendor]) {
          segmentData[transaction.vendor] = { value: 0, label: transaction.vendor, type: 'vendor' };
        }
        segmentData[transaction.vendor].value += amount;
      });
    }

    // Convert to array and sort by value
    const segments = Object.entries(segmentData)
      .map(([key, data]) => ({ id: key, ...data }))
      .sort((a, b) => b.value - a.value)
      .filter(segment => segment.value > 0);

    // Calculate total and percentages
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);

    // Create colors for segments
    const colors = [
      '#5B73FF', // Primary blue
      '#84D684', // Green
      '#f2602f', // Orange
      '#FFB3BA', // Light pink
      '#BAFFC9', // Light green
      '#BAE1FF', // Light blue
      '#FFFFBA', // Light yellow
      '#E6BAFF', // Light purple
      '#FFD1BA', // Light orange
      '#C9FFBA', // Very light green
      '#FFBABA', // Light red
      '#BAD1FF', // Another light blue
    ];

    const pieSegments: PieSegment[] = segments.map((segment, index) => ({
      label: segment.label,
      value: segment.value,
      percentage: total > 0 ? (segment.value / total) * 100 : 0,
      color: colors[index % colors.length],
      id: segment.id,
      type: segment.type
    }));

    return {
      segments: pieSegments,
      total,
      labels: pieSegments.map(s => s.label),
      data: pieSegments.map(s => s.value),
      backgroundColor: pieSegments.map(s => s.color),
      borderColor: pieSegments.map(s => s.color),
    };
  }, [transactions, categories, dateRange, selectedGroups, selectedCategories, chartMode]);

  // Chart.js configuration
  const chartData = useMemo(() => ({
    labels: pieChartData.labels,
    datasets: [
      {
        data: pieChartData.data,
        backgroundColor: pieChartData.backgroundColor,
        borderColor: 'rgba(30, 30, 30, 1)', // Dark background color for gaps
        borderWidth: 4, // Larger border for bigger gaps
        borderRadius: 6, // Consistent border radius
        borderSkipped: false, // Ensure all borders get rounded corners
        spacing: 0, // Remove linear spacing, use border for gaps instead
        hoverBorderWidth: 4, // Keep same border width on hover
        hoverOffset: 8, // Reduced hover offset for more precise detection
        hoverBorderRadius: 6, // Keep same border radius on hover
      },
    ],
  }), [pieChartData]);

  // Create a stable key based on data structure, not layout changes
  const chartKey = useMemo(() => {
    return `chart-${pieChartData.segments.length}-${pieChartData.total}-${chartMode}`;
  }, [pieChartData.segments.length, pieChartData.total, chartMode]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    animation: {
      duration: 0, // Disable animations to prevent redraw on layout changes
    },
    interaction: {
      intersect: true, // Only activate segments that the mouse is directly over
      mode: 'point' as const, // Use point mode for precise detection
      includeInvisible: false, // Don't include invisible elements
    },
    layout: {
      padding: shouldShowLabels ?
        Math.max(20, Math.min(100, containerDimensions.width * 0.15)) : // Dynamic padding based on container width
        Math.max(10, containerDimensions.width * 0.05), // Minimal padding when no labels
    },
    plugins: {
      legend: {
        display: false, // We'll create a custom legend
      },
      tooltip: {
        enabled: false, // Disable default tooltip
      },
      datalabels: {
        display: function (context: any) {
          if (!shouldShowLabels) return false; // Hide labels on small screens
          const segment = pieChartData.segments[context.dataIndex];
          return segment && segment.percentage >= 5; // Show labels for segments >= 5%
        },
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: shouldShowLabels ? Math.max(12, Math.min(16, containerDimensions.width * 0.025)) : 0, // Responsive font size
        },
        formatter: function (value: number, context: any) {
          if (!shouldShowLabels) return '';
          const segment = pieChartData.segments[context.dataIndex];
          return segment ? segment.label : ''; // Remove currency from labels to save space
        },
        anchor: 'end' as const,
        align: 'end' as const,
        offset: shouldShowLabels ? Math.max(8, Math.min(15, containerDimensions.width * 0.02)) : 0, // Responsive offset
        padding: 4,
        textStrokeColor: 'rgba(0,0,0,0.8)',
        textStrokeWidth: 1,
      },
    },
    cutout: calculateCutout, // Use calculated cutout
    onHover: (event: ChartEvent, activeElements: ActiveElement[]) => {
      if (chartRef.current?.canvas) {
        chartRef.current.canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      }

      // Update hovered segment for center display
      if (activeElements.length > 0) {
        const index = activeElements[0].index;
        // Validate the index is within bounds
        if (index >= 0 && index < pieChartData.segments.length) {
          const segment = pieChartData.segments[index];
          setHoveredSegment(segment || null);
        } else {
          setHoveredSegment(null);
        }
      } else {
        setHoveredSegment(null);
      }
    },
    onClick: (event: ChartEvent, activeElements: ActiveElement[]) => {
      if (activeElements.length > 0) {
        const index = activeElements[0].index;
        // Validate the index is within bounds
        if (index >= 0 && index < pieChartData.segments.length) {
          const segment = pieChartData.segments[index];
          if (segment) {
            onSegmentClick(segment);
          }
        }
      }
    },
  }), [shouldShowLabels, matchHeight, calculateCutout, pieChartData.segments, onSegmentClick]);

  if (pieChartData.segments.length === 0) {
    return (
      <div className={`bg-white/[.03] rounded-lg p-4 flex flex-col ${matchHeight ? 'h-full' : ''}`}>
        {/* Date Range Navigation Header - Even shown when no data */}
        {onDateRangeChange && (
          <div className="flex items-center justify-between mb-4 px-2">
            <button
              onClick={handleNavigatePrev}
              disabled={!dateRangeInfo.canNavigatePrev}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigatePrev
                ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90 active:bg-white/[.12] focus:outline-none focus:ring-2 focus:ring-green/30'
                : 'text-white/20 cursor-not-allowed'
                }`}
              title={
                dateRangeInfo.actualMode === 'mtd' ? 'Previous month (← arrow key)' :
                  dateRangeInfo.actualMode === 'ytd' ? 'Previous year (← arrow key)' :
                    'Previous period (← arrow key)'
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="rotate-180">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="text-center flex-1 mx-4">
              <h3 className="text-white font-semibold text-lg tracking-tight">{dateRangeInfo.rangeText}</h3>
              <p className="text-white/50 text-sm mt-0.5 font-medium">
                {dateRangeInfo.durationText}
              </p>
            </div>

            <button
              onClick={handleNavigateNext}
              disabled={!dateRangeInfo.canNavigateNext}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigateNext
                ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90 active:bg-white/[.12] focus:outline-none focus:ring-2 focus:ring-green/30'
                : 'text-white/20 cursor-not-allowed'
                }`}
              title={
                dateRangeInfo.actualMode === 'mtd' ? 'Next month (→ arrow key)' :
                  dateRangeInfo.actualMode === 'ytd' ? 'Next year (→ arrow key)' :
                    'Next period (→ arrow key)'
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-center flex-1">
          <div className="text-center text-white/60">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="font-medium mb-2">No Spending Data</h3>
            <p className="text-sm">No spending transactions found for the selected time period.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white/[.03] rounded-lg p-4 transition-all duration-300 ease-out ${matchHeight ? 'h-full flex flex-col' : ''}`}
    >
      {/* Date Range Navigation Header */}
      {onDateRangeChange && (
        <div className="flex items-center justify-between mb-4 px-2">
          <button
            onClick={handleNavigatePrev}
            disabled={!dateRangeInfo.canNavigatePrev}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigatePrev
              ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90 active:bg-white/[.12] focus:outline-none focus:ring-2 focus:ring-green/30'
              : 'text-white/20 cursor-not-allowed'
              }`}
            title={
              dateRangeInfo.actualMode === 'mtd' ? 'Previous month (← arrow key)' :
                dateRangeInfo.actualMode === 'ytd' ? 'Previous year (← arrow key)' :
                  'Previous period (← arrow key)'
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="rotate-180">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="text-center flex-1 mx-4">
            <h3 className="text-white font-semibold text-lg tracking-tight">{dateRangeInfo.rangeText}</h3>
            <p className="text-white/50 text-sm mt-0.5 font-medium">
              {dateRangeInfo.durationText}
            </p>
          </div>
          <button
            onClick={handleNavigateNext}
            disabled={!dateRangeInfo.canNavigateNext}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigateNext
              ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90 active:bg-white/[.12] focus:outline-none focus:ring-2 focus:ring-green/30'
              : 'text-white/20 cursor-not-allowed'
              }`}
            title={
              dateRangeInfo.actualMode === 'mtd' ? 'Next month (→ arrow key)' :
                dateRangeInfo.actualMode === 'ytd' ? 'Next year (→ arrow key)' :
                  'Next period (→ arrow key)'
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Maximized chart container */}
      <div className={`w-full flex items-center justify-center transition-all duration-300 ease-out ${matchHeight ? 'flex-1' : ''}`} style={{ overflow: 'visible' }}>
        {/* Chart Section with minimal padding but maximum chart space */}
        <div className="flex items-center justify-center w-full h-full transition-all duration-300 ease-out" style={{ overflow: 'visible' }}>
          <div className={`relative w-full ${shouldShowLabels ? (matchHeight ? 'max-w-[500px]' : 'max-w-[600px]') : 'max-w-full'}`}>
            <div className="w-full h-full overflow-visible relative transition-all duration-300 ease-out">
              <Doughnut
                ref={chartRef}
                data={chartData}
                options={chartOptions}
                plugins={[ChartDataLabels]}
                redraw={false} // Prevent unnecessary redraws
              />
            </div>
            {/* Center Total or Hovered Segment */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-2">
                {hoveredSegment ? (
                  <>
                    <div className={`text-white/50 mb-1 ${shouldShowLabels ? 'text-sm' : 'text-xs'}`}>
                      {hoveredSegment.label}
                    </div>
                    <div className={`font-bold text-white ${shouldShowLabels ? 'text-2xl' : 'text-lg'}`}>
                      {formatCurrency(hoveredSegment.value)}
                    </div>
                    <div className={`text-white/40 mt-1 ${shouldShowLabels ? 'text-xs' : 'text-xs'}`}>
                      {hoveredSegment.percentage.toFixed(1)}% of total
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-white/50 mb-1 ${shouldShowLabels ? 'text-sm' : 'text-xs'}`}>
                      Total Spending
                    </div>
                    <div className={`font-bold text-white ${shouldShowLabels ? 'text-2xl' : 'text-lg'}`}>
                      {formatCurrency(pieChartData.total)}
                    </div>
                    <div className={`text-white/40 mt-1 ${shouldShowLabels ? 'text-xs' : 'text-xs'}`}>
                      {chartMode === 'group' && 'All Groups'}
                      {chartMode === 'category' && (selectedGroups.length > 0 ? selectedGroups[0] : '')}
                      {chartMode === 'vendor' && (selectedCategories.length > 0 ? categories.find(c => c.id === selectedCategories[0])?.name : 'Breakdown')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button for Drill-down */}
      {onBack && (chartMode === 'category' || chartMode === 'vendor') && (
        <div className="flex justify-center mt-2 mb-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/[.08] hover:bg-white/[.12] active:bg-white/[.15] text-white/80 hover:text-white rounded-full text-sm font-medium transition-all duration-200 border border-white/[.05]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
            Return
          </button>
        </div>
      )}
    </div>
  );
}
