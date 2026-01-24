'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { format, differenceInDays, addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { Database } from '../../../types/supabase';
import { calculateDateRange, calculateAllTimeRange } from '../../components/charts/utils';
import MobileNav from "../../components/mobileNav";
import Navbar from "../../components/navbar";
import ProtectedRoute from "../../components/protected-route";
import Sidebar from "../../components/sidebar";
import { useMobileViewportStability } from '../../hooks/useMobileViewportStability';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import SankeyDiagram from './components/sankey-diagram';
import Link from 'next/link';

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function SankeyPage() {
    const supabase = createClientComponentClient<Database>();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    
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

    // Fetch data from Supabase
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            // Fetch assignments and categories
            const [assignmentsResponse, categoriesResponse] = await Promise.all([
                supabase
                    .from('assignments')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('month', { ascending: true }),
                supabase
                    .from('categories')
                    .select(`
                        *,
                        groups (
                            id,
                            name
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at'),
            ]);

            if (assignmentsResponse.error) throw assignmentsResponse.error;
            if (categoriesResponse.error) throw categoriesResponse.error;

            setAssignments(assignmentsResponse.data || []);
            setCategories(categoriesResponse.data || []);

            // Paginate transactions
            let allTransactions: Transaction[] = [];
            let from = 0;
            const batchSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const response = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: true })
                    .range(from, from + batchSize - 1);

                if (response.error) throw response.error;

                const batch = response.data || [];
                allTransactions = [...allTransactions, ...batch];
                hasMore = batch.length === batchSize;
                from += batchSize;
            }

            setTransactions(allTransactions);
        } catch (error) {
            console.error('Error fetching Sankey data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
        [assignments.length, transactions.length]
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
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                                Back to Statistics
                            </Link>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-[-.01em]">Money Flow</h1>
                                    <p className="text-sm text-white/60 mt-1">
                                        Visualize how money flows from income sources through your budget
                                    </p>
                                </div>
                                
                                {/* View controls */}
                                <div className="hidden md:flex items-center gap-2">
                                    <button
                                        onClick={handleCollapseAll}
                                        className="px-3 py-2 text-sm bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Collapse All
                                    </button>
                                    <button
                                        onClick={handleExpandAllGroups}
                                        className="px-3 py-2 text-sm bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Expand Groups
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Time Range Selection */}
                        <div className="mb-6">
                            <div className="bg-white/[.03] rounded-lg p-4">
                                <h3 className="font-medium mb-3">Time Range</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: '7d', label: 'Last 7 Days' },
                                        { value: '30d', label: 'Last 30 Days' },
                                        { value: 'mtd', label: 'Month to Date' },
                                        { value: '3m', label: 'Last 3 Months' },
                                        { value: 'ytd', label: 'Year to Date' },
                                        { value: '12m', label: 'Last 12 Months' },
                                        { value: 'all', label: 'All Time' },
                                        { value: 'custom', label: 'Custom Range' }
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleTimeRangeChange(option.value as any)}
                                            className={`px-3 py-2 text-sm rounded-lg transition-all ${
                                                timeRange === option.value
                                                    ? 'bg-green text-black'
                                                    : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Custom Date Inputs */}
                                {timeRange === 'custom' && (
                                    <div className="mt-4 flex flex-wrap gap-3 items-center">
                                        <div>
                                            <label className="text-sm text-white/60 block mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => {
                                                    const newStart = new Date(e.target.value);
                                                    handleCustomDateChange(newStart, customEndDate || newStart);
                                                }}
                                                className="px-3 py-2 bg-white/[.05] rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-white/60 block mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={customEndDate ? format(customEndDate, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => {
                                                    const newEnd = new Date(e.target.value);
                                                    handleCustomDateChange(customStartDate || newEnd, newEnd);
                                                }}
                                                className="px-3 py-2 bg-white/[.05] rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!hasData ? (
                            // No data state
                            <div className="text-center text-white/60 mt-20">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                                        <path d="M3 3V21H21V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                        <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold mb-2">No Transaction Data</h2>
                                <p className="text-sm max-w-md mx-auto">
                                    No transactions found for the selected time period. Try selecting a different date range.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">{/* Mobile view controls */}
                                <div className="md:hidden flex items-center gap-2">
                                    <button
                                        onClick={handleCollapseAll}
                                        className="flex-1 px-3 py-2 text-sm bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Collapse All
                                    </button>
                                    <button
                                        onClick={handleExpandAllGroups}
                                        className="flex-1 px-3 py-2 text-sm bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Expand Groups
                                    </button>
                                </div>

                                {/* Legend */}
                                <div className="bg-white/[.03] rounded-lg p-4">
                                    <h3 className="font-medium mb-3 text-sm">How to use:</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
                                        <div className="flex items-start gap-2">
                                            <div className="w-4 h-4 bg-blue-500 rounded mt-0.5 flex-shrink-0" />
                                            <span><strong className="text-white">Blue nodes</strong> represent income sources</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-4 h-4 bg-green rounded mt-0.5 flex-shrink-0" />
                                            <span><strong className="text-white">Colored nodes</strong> represent spending groups</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 flex-shrink-0">
                                                <rect width="16" height="16" fill="currentColor" opacity="0.3" rx="2" />
                                            </svg>
                                            <span><strong className="text-white">Click groups</strong> to expand into categories</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 flex-shrink-0">
                                                <rect width="16" height="16" fill="currentColor" opacity="0.3" rx="2" />
                                            </svg>
                                            <span><strong className="text-white">Click categories</strong> to expand into vendors</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sankey Diagram */}
                                <div className="bg-white/[.03] rounded-lg border border-green/20 overflow-hidden">
                                    {/* Date Range Navigation Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[.05]">
                                        <button
                                            onClick={handleNavigatePrev}
                                            disabled={!dateRangeInfo.canNavigatePrev}
                                            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                                                dateRangeInfo.canNavigatePrev
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
                                            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                                                dateRangeInfo.canNavigateNext
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
