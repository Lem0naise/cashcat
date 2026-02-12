'use client';

import { useEffect, useState, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { format, differenceInDays, addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { Database } from '../../../types/supabase';
import { calculateDateRange, calculateAllTimeRange } from '../../components/charts/utils';
import MobileNav from "../../components/mobileNav";
import Navbar from "../../components/navbar";
import ProtectedRoute from "../../components/protected-route";
import Sidebar from "../../components/sidebar";
import { useMobileViewportStability } from '../../hooks/useMobileViewportStability';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useAssignments } from '../../hooks/useAssignments';
import SankeyDiagram from './components/sankey-diagram';
import Link from 'next/link';

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function SankeyPage() {
    // TanStack Query Hooks
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();
    const { data: categories = [], isLoading: categoriesLoading } = useCategories();
    const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();

    // Combined loading state
    const loading = assignmentsLoading || categoriesLoading || transactionsLoading;

    // Mobile viewport stability hook
    useMobileViewportStability();

    // Responsive breakpoint detection
    const isDesktop = useIsDesktop();

    // Chart state
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom'>('3m');
    const [customStartDate, setCustomStartDate] = useState<Date>();
    const [customEndDate, setCustomEndDate] = useState<Date>();

    // Expansion state for Sankey nodes
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const handleCustomDateChange = (start: Date, end: Date) => {
        setCustomStartDate(start);
        setCustomEndDate(end);
        if (timeRange !== 'custom') {
            setTimeRange('custom');
        }
    };

    const handleTimeRangeChange = (range: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom') => {
        setTimeRange(range);
    };

    // Calculate date ranges
    const { allTimeStart, allTimeEnd } = useMemo(() =>
        calculateAllTimeRange(assignments, transactions),
        [assignments, transactions]
    );

    const dateRange = useMemo(() =>
        calculateDateRange(timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd),
        [timeRange, customStartDate?.getTime(), customEndDate?.getTime(), allTimeStart?.getTime(), allTimeEnd?.getTime()]
    );

    // Handle node clicks for expansion
    const handleNodeClick = (node: any) => {
        const newExpanded = new Set(expandedNodes);

        if (node.type === 'group' || node.type === 'category') {
            if (newExpanded.has(node.id)) {
                // Collapse: remove this node and all its descendants
                newExpanded.delete(node.id);

                // If collapsing a group, also collapse all its categories
                if (node.type === 'group') {
                    Array.from(newExpanded).forEach(id => {
                        if (id.startsWith('category-')) {
                            newExpanded.delete(id);
                        }
                    });
                }
            } else {
                // Expand
                newExpanded.add(node.id);
            }

            setExpandedNodes(newExpanded);
        }
    };

    // Handle collapse all
    const handleCollapseAll = () => {
        setExpandedNodes(new Set());
    };

    // Handle expand all groups
    const handleExpandAllGroups = () => {
        const newExpanded = new Set<string>();

        // Find all group nodes
        const groupNodes = Array.from(
            new Set(
                transactions
                    .filter(t => t.type === 'payment' && t.category_id)
                    .map(t => {
                        const cat = categories.find(c => c.id === t.category_id);
                        if (!cat) return null;
                        const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                        return `group-${groupName}`;
                    })
                    .filter(Boolean)
            )
        );

        groupNodes.forEach(id => {
            if (id) newExpanded.add(id);
        });

        setExpandedNodes(newExpanded);
    };

    // Date range navigation info
    const dateRangeInfo = useMemo(() => {
        const durationInDays = differenceInDays(dateRange.end, dateRange.start);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

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

        const actualMode = (timeRange === 'mtd' || isCompleteMonth || isCurrentMonth) ? 'mtd' :
            (timeRange === 'ytd' || isCompleteYear || isCurrentYear) ? 'ytd' : timeRange;

        let isAtToday: boolean;
        let isAtStart: boolean;

        if (actualMode === 'mtd') {
            const currentMonth = startOfMonth(today);
            isAtToday = dateRange.start.getTime() === currentMonth.getTime();
            const prevMonth = subMonths(dateRange.start, 1);
            const prevMonthStart = startOfMonth(prevMonth);
            isAtStart = allTimeStart ? prevMonthStart < allTimeStart : false;
        } else if (actualMode === 'ytd') {
            const currentYear = startOfYear(today);
            isAtToday = dateRange.start.getTime() === currentYear.getTime();
            const prevYear = subYears(dateRange.start, 1);
            const prevYearStart = startOfYear(prevYear);
            const prevYearEnd = endOfYear(prevYear);
            isAtStart = allTimeStart && allTimeEnd ?
                (prevYearEnd < allTimeStart || prevYearStart > allTimeEnd) : false;
        } else {
            isAtToday = differenceInDays(today, dateRange.end) <= 1;
            isAtStart = allTimeStart ? differenceInDays(dateRange.start, allTimeStart) <= 1 : false;
        }

        let rangeText = '';
        let durationText = '';

        if (actualMode === 'custom') {
            if (durationInDays === 0) {
                rangeText = format(dateRange.start, 'MMM dd, yyyy');
                durationText = 'Single day';
            } else if (durationInDays < 32) {
                rangeText = `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
                durationText = `${durationInDays + 1} days`;
            } else {
                rangeText = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
                durationText = `${durationInDays + 1} days`;
            }
        } else {
            if (durationInDays <= 7) {
                rangeText = `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
            } else if (durationInDays < 32) {
                rangeText = `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
            } else {
                rangeText = `${format(dateRange.start, 'MMM yyyy')} - ${format(dateRange.end, 'MMM yyyy')}`;
            }

            switch (actualMode) {
                case '7d': durationText = 'Last 7 days'; break;
                case '30d': durationText = 'Last 30 days'; break;
                case 'mtd': durationText = isCurrentMonth ? 'Month to date' : 'Complete month'; break;
                case '3m': durationText = 'Last 3 months'; break;
                case 'ytd': durationText = isCurrentYear ? 'Year to date' : 'Complete year'; break;
                case '12m': durationText = 'Last 12 months'; break;
                case 'all': durationText = 'All time'; break;
                default: durationText = `${durationInDays + 1} days`;
            }
        }

        return {
            durationInDays,
            isAtToday,
            isAtStart,
            rangeText,
            durationText,
            actualMode,
            canNavigateNext: !isAtToday,
            canNavigatePrev: !isAtStart && allTimeStart !== undefined
        };
    }, [dateRange, timeRange, allTimeStart, allTimeEnd]);

    const handleNavigatePrev = () => {
        if (!dateRangeInfo.canNavigatePrev) return;

        let newStart: Date;
        let newEnd: Date;

        if (dateRangeInfo.actualMode === 'mtd') {
            const currentMonthStart = startOfMonth(dateRange.start);
            const prevMonth = subMonths(currentMonthStart, 1);
            newStart = startOfMonth(prevMonth);
            newEnd = endOfMonth(prevMonth);
        } else if (dateRangeInfo.actualMode === 'ytd') {
            const currentYearStart = startOfYear(dateRange.start);
            const prevYear = subYears(currentYearStart, 1);
            newStart = startOfYear(prevYear);
            newEnd = endOfYear(prevYear);
        } else {
            const duration = dateRangeInfo.durationInDays;
            newEnd = subDays(dateRange.start, 1);
            newStart = subDays(newEnd, duration);
        }

        if (allTimeStart) {
            if (dateRangeInfo.actualMode === 'mtd' || dateRangeInfo.actualMode === 'ytd') {
                if (newEnd < allTimeStart) return;
            } else {
                if (newStart < allTimeStart) return;
            }
        }

        setCustomStartDate(newStart);
        setCustomEndDate(newEnd);
        setTimeRange('custom');
    };

    const handleNavigateNext = () => {
        if (!dateRangeInfo.canNavigateNext) return;

        let newStart: Date;
        let newEnd: Date;
        const today = new Date();

        if (dateRangeInfo.actualMode === 'mtd') {
            const currentMonthStart = startOfMonth(dateRange.start);
            const nextMonth = addDays(endOfMonth(currentMonthStart), 1);
            newStart = startOfMonth(nextMonth);
            newEnd = endOfMonth(nextMonth);

            if (newStart > today) {
                newStart = startOfMonth(today);
                newEnd = today;
            } else if (newEnd > today) {
                newEnd = today;
            }
        } else if (dateRangeInfo.actualMode === 'ytd') {
            const currentYearStart = startOfYear(dateRange.start);
            const nextYear = addDays(endOfYear(currentYearStart), 1);
            newStart = startOfYear(nextYear);
            newEnd = endOfYear(nextYear);

            if (newStart > today) {
                newStart = startOfYear(today);
                newEnd = today;
            } else if (newEnd > today) {
                newEnd = today;
            }
        } else {
            const duration = dateRangeInfo.durationInDays;
            newStart = addDays(dateRange.end, 1);
            newEnd = addDays(newStart, duration);

            if (newEnd > today) {
                newEnd = today;
            }
        }

        setCustomStartDate(newStart);
        setCustomEndDate(newEnd);
        setTimeRange('custom');
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
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

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [dateRangeInfo.canNavigatePrev, dateRangeInfo.canNavigateNext]);

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                    <Navbar />
                    <Sidebar />
                    <MobileNav />

                    <main className="pt-16 pb-32 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
                            </div>
                        </div>
                    </main>
                </div>
            </ProtectedRoute>
        );
    }

    const hasData = transactions.some(t =>
        new Date(t.date) >= dateRange.start && new Date(t.date) <= dateRange.end
    );

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <Navbar />
                <Sidebar />
                <MobileNav />

                {/* Toast notifications */}
                <Toaster
                    containerClassName='mb-[15dvh]'
                    position="bottom-center"
                    toastOptions={{
                        style: {
                            background: '#333',
                            color: '#fff',
                        },
                        success: {
                            iconTheme: {
                                primary: '#bac2ff',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#EF4444',
                                secondary: '#fff',
                            },
                        }
                    }}
                />

                <main className="pt-16 pb-32 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in">
                    <div className="max-w-7xl mx-auto">
                        {/* Header with back link */}
                        <div className="mb-6">
                            <Link
                                href="/stats"
                                className="text-sm text-white/60 hover:text-white/80 flex items-center gap-2 mb-4"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Back to Statistics
                            </Link>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-[-.01em]">Money Flow</h1>
                                    <p className="text-xs sm:text-sm text-white/50 mt-0.5">
                                        Visualize how money flows through your budget
                                    </p>
                                </div>

                                {/* View controls */}
                                <div className="hidden md:flex items-center gap-1.5">
                                    <button
                                        onClick={handleCollapseAll}
                                        className="px-3 py-1.5 text-xs bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Collapse All
                                    </button>
                                    <button
                                        onClick={handleExpandAllGroups}
                                        className="px-3 py-1.5 text-xs bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Expand Groups
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Time Range Selection - compact scrollable pills */}
                        <div className="mb-4">
                            <div className="overflow-x-auto hide-scrollbar">
                                <div className="flex gap-1.5 pb-1">
                                    {[
                                        { value: '7d', label: '7D' },
                                        { value: '30d', label: '30D' },
                                        { value: 'mtd', label: 'MTD' },
                                        { value: '3m', label: '3M' },
                                        { value: 'ytd', label: 'YTD' },
                                        { value: '12m', label: '12M' },
                                        { value: 'all', label: 'All' },
                                        { value: 'custom', label: 'Custom' }
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleTimeRangeChange(option.value as any)}
                                            className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 ${timeRange === option.value
                                                ? 'bg-green text-black font-medium'
                                                : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Date Inputs */}
                            {timeRange === 'custom' && (
                                <div className="mt-3 flex gap-3 items-center">
                                    <div className="flex-1">
                                        <label className="text-xs text-white/50 block mb-1">Start</label>
                                        <input
                                            type="date"
                                            value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                                const newStart = new Date(e.target.value);
                                                handleCustomDateChange(newStart, customEndDate || newStart);
                                            }}
                                            className="w-full px-3 py-1.5 bg-white/[.05] rounded-lg text-xs border border-white/10"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-white/50 block mb-1">End</label>
                                        <input
                                            type="date"
                                            value={customEndDate ? format(customEndDate, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                                const newEnd = new Date(e.target.value);
                                                handleCustomDateChange(customStartDate || newEnd, newEnd);
                                            }}
                                            className="w-full px-3 py-1.5 bg-white/[.05] rounded-lg text-xs border border-white/10"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!hasData ? (
                            // No data state
                            <div className="text-center text-white/60 mt-20">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                                        <path d="M3 3V21H21V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                        <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold mb-2">No Transaction Data</h2>
                                <p className="text-sm max-w-md mx-auto">
                                    No transactions found for the selected time period. Try selecting a different date range.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">{/* Mobile view controls */}
                                <div className="md:hidden flex items-center gap-1.5">
                                    <button
                                        onClick={handleCollapseAll}
                                        className="flex-1 px-3 py-1.5 text-xs bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Collapse
                                    </button>
                                    <button
                                        onClick={handleExpandAllGroups}
                                        className="flex-1 px-3 py-1.5 text-xs bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Expand
                                    </button>
                                </div>

                                {/* Legend - collapsible on mobile */}
                                <details className="bg-white/[.03] rounded-lg group">
                                    <summary className="p-3 cursor-pointer text-xs sm:text-sm font-medium text-white/70 hover:text-white/90 transition-colors flex items-center justify-between list-none">
                                        <span>How to use</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 group-open:rotate-180 transition-transform">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </summary>
                                    <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-xs text-white/60">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 bg-blue-500 rounded shrink-0" />
                                            <span>Income sources</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 bg-green rounded shrink-0" />
                                            <span>Spending groups</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-white/40">Click groups →</span>
                                            <span>categories</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-white/40">Click categories →</span>
                                            <span>vendors</span>
                                        </div>
                                    </div>
                                </details>

                                {/* Sankey Diagram */}
                                <div className="bg-white/[.03] rounded-xl border border-white/[.08] overflow-hidden">
                                    {/* Date Range Navigation Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[.05]">
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

                                    <div className="h-[600px] md:h-[700px]">
                                        <SankeyDiagram
                                            transactions={transactions}
                                            categories={categories}
                                            dateRange={dateRange}
                                            onNodeClick={handleNodeClick}
                                            expandedNodes={expandedNodes}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
