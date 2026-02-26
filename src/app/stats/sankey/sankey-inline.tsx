/**
 * SankeyInline — the Sankey diagram rendered inline inside another page.
 * No Navbar / Sidebar / ProtectedRoute — those are provided by the parent.
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, differenceInDays, addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { calculateDateRange, calculateAllTimeRange } from '../../components/charts/utils';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useAssignments } from '../../hooks/useAssignments';
import SankeyDiagram from './components/sankey-diagram';

export default function SankeyInline() {
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();
    const { data: categories = [], isLoading: categoriesLoading } = useCategories();
    const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();

    const loading = assignmentsLoading || categoriesLoading || transactionsLoading;

    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom'>('3m');
    const [customStartDate, setCustomStartDate] = useState<Date>();
    const [customEndDate, setCustomEndDate] = useState<Date>();
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const handleCustomDateChange = (start: Date, end: Date) => {
        setCustomStartDate(start);
        setCustomEndDate(end);
        if (timeRange !== 'custom') setTimeRange('custom');
    };

    const { allTimeStart, allTimeEnd } = useMemo(() =>
        calculateAllTimeRange(assignments, transactions),
        [assignments, transactions]
    );

    const dateRange = useMemo(() =>
        calculateDateRange(timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd),
        [timeRange, customStartDate?.getTime(), customEndDate?.getTime(), allTimeStart?.getTime(), allTimeEnd?.getTime()]
    );

    const handleNodeClick = (node: any) => {
        const newExpanded = new Set(expandedNodes);
        if (node.type === 'group' || node.type === 'category') {
            if (newExpanded.has(node.id)) {
                newExpanded.delete(node.id);
                if (node.type === 'group') {
                    Array.from(newExpanded).forEach(id => {
                        if (id.startsWith('category-')) newExpanded.delete(id);
                    });
                }
            } else {
                newExpanded.add(node.id);
            }
            setExpandedNodes(newExpanded);
        }
    };

    const handleCollapseAll = () => setExpandedNodes(new Set());

    const handleExpandAllGroups = () => {
        const newExpanded = new Set<string>();
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
        groupNodes.forEach(id => { if (id) newExpanded.add(id); });
        setExpandedNodes(newExpanded);
    };

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
            isAtStart = allTimeStart ? startOfMonth(prevMonth) < allTimeStart : false;
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
            if (durationInDays < 32) {
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
            durationInDays, isAtToday, isAtStart, rangeText, durationText, actualMode,
            canNavigateNext: !isAtToday,
            canNavigatePrev: !isAtStart && allTimeStart !== undefined
        };
    }, [dateRange, timeRange, allTimeStart, allTimeEnd]);

    const handleNavigatePrev = () => {
        if (!dateRangeInfo.canNavigatePrev) return;
        let newStart: Date, newEnd: Date;
        if (dateRangeInfo.actualMode === 'mtd') {
            const prev = subMonths(startOfMonth(dateRange.start), 1);
            newStart = startOfMonth(prev); newEnd = endOfMonth(prev);
        } else if (dateRangeInfo.actualMode === 'ytd') {
            const prev = subYears(startOfYear(dateRange.start), 1);
            newStart = startOfYear(prev); newEnd = endOfYear(prev);
        } else {
            newEnd = subDays(dateRange.start, 1);
            newStart = subDays(newEnd, dateRangeInfo.durationInDays);
        }
        if (allTimeStart) {
            if ((dateRangeInfo.actualMode === 'mtd' || dateRangeInfo.actualMode === 'ytd') && newEnd < allTimeStart) return;
            else if (newStart < allTimeStart) return;
        }
        setCustomStartDate(newStart); setCustomEndDate(newEnd); setTimeRange('custom');
    };

    const handleNavigateNext = () => {
        if (!dateRangeInfo.canNavigateNext) return;
        let newStart: Date, newEnd: Date;
        const today = new Date();
        if (dateRangeInfo.actualMode === 'mtd') {
            const next = addDays(endOfMonth(startOfMonth(dateRange.start)), 1);
            newStart = startOfMonth(next); newEnd = endOfMonth(next);
            if (newStart > today) { newStart = startOfMonth(today); newEnd = today; }
            else if (newEnd > today) { newEnd = today; }
        } else if (dateRangeInfo.actualMode === 'ytd') {
            const next = addDays(endOfYear(startOfYear(dateRange.start)), 1);
            newStart = startOfYear(next); newEnd = endOfYear(next);
            if (newStart > today) { newStart = startOfYear(today); newEnd = today; }
            else if (newEnd > today) { newEnd = today; }
        } else {
            newStart = addDays(dateRange.end, 1);
            newEnd = addDays(newStart, dateRangeInfo.durationInDays);
            if (newEnd > today) newEnd = today;
        }
        setCustomStartDate(newStart); setCustomEndDate(newEnd); setTimeRange('custom');
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (document.activeElement && document.activeElement.tagName !== 'BODY') return;
            if (event.key === 'ArrowLeft' && dateRangeInfo.canNavigatePrev) { event.preventDefault(); handleNavigatePrev(); }
            else if (event.key === 'ArrowRight' && dateRangeInfo.canNavigateNext) { event.preventDefault(); handleNavigateNext(); }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [dateRangeInfo.canNavigatePrev, dateRangeInfo.canNavigateNext]);

    const hasData = transactions.some(t =>
        new Date(t.date) >= dateRange.start && new Date(t.date) <= dateRange.end
    );

    if (loading && assignments.length === 0 && transactions.length === 0) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Time range pills */}
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
                            onClick={() => setTimeRange(option.value as any)}
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

            {timeRange === 'custom' && (
                <div className="flex gap-3 items-center">
                    <div className="flex-1">
                        <label className="text-xs text-white/50 block mb-1">Start</label>
                        <input type="date"
                            value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleCustomDateChange(new Date(e.target.value), customEndDate || new Date(e.target.value))}
                            className="w-full px-3 py-1.5 bg-white/[.05] rounded-lg text-xs border border-white/10"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-white/50 block mb-1">End</label>
                        <input type="date"
                            value={customEndDate ? format(customEndDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleCustomDateChange(customStartDate || new Date(e.target.value), new Date(e.target.value))}
                            className="w-full px-3 py-1.5 bg-white/[.05] rounded-lg text-xs border border-white/10"
                        />
                    </div>
                </div>
            )}

            {!hasData ? (
                <div className="text-center text-white/60 py-16">
                    <p className="text-sm">No transactions for this period. Try a different date range.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Expand/Collapse controls */}
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleCollapseAll}
                            className="px-3 py-1.5 text-xs bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors">
                            Collapse All
                        </button>
                        <button onClick={handleExpandAllGroups}
                            className="px-3 py-1.5 text-xs bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors">
                            Expand Groups
                        </button>
                    </div>

                    <div className="bg-white/[.03] rounded-xl border border-white/[.08] overflow-hidden">
                        {/* Date range navigation */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[.05]">
                            <button onClick={handleNavigatePrev} disabled={!dateRangeInfo.canNavigatePrev}
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigatePrev
                                    ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90'
                                    : 'text-white/20 cursor-not-allowed'}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="rotate-180">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            <div className="text-center flex-1 mx-4">
                                <h3 className="text-white font-semibold text-lg tracking-tight">{dateRangeInfo.rangeText}</h3>
                                <p className="text-white/50 text-sm mt-0.5 font-medium">{dateRangeInfo.durationText}</p>
                            </div>

                            <button onClick={handleNavigateNext} disabled={!dateRangeInfo.canNavigateNext}
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${dateRangeInfo.canNavigateNext
                                    ? 'text-white/70 hover:text-white hover:bg-white/[.08] active:scale-90'
                                    : 'text-white/20 cursor-not-allowed'}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="h-[500px] md:h-[620px]">
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
    );
}
