'use client';

import { createClient } from '@/app/utils/supabase';
import { useCallback, useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Database } from '../../types/supabase';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAssignments } from '../hooks/useAssignments';
import BudgetAssignmentChart from '../components/BudgetAssignmentChartRefactored';
import ChartControls from '../components/chart-controls';
import PieChart from '../components/charts/PieChart';
import FilterInsights from '../components/charts/PieSegmentInsights';
import TopCategoriesChart from '../components/charts/TopCategoriesChart';
import TopVendorsChart from '../components/charts/TopVendorsChart';
import SpendingOverTime from '../components/charts/SpendingOverTime';
import { PieSegment } from '../components/charts/types';
import { calculateDateRange, calculateAllTimeRange, formatCurrency } from '../components/charts/utils';
import MobileNav from "../components/mobileNav";
import Navbar from "../components/navbar";
import ProtectedRoute from "../components/protected-route";
import Sidebar from "../components/sidebar";
import { useMobileViewportStability } from '../hooks/useMobileViewportStability';
import { useIsDesktop } from '../hooks/useIsDesktop';
import Link from 'next/link';

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function Stats() {
    const supabase = createClient();
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
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showGoals, setShowGoals] = useState(false);
    const [showRollover, setShowRollover] = useState(false);

    // Activity chart mode: 'spending' (SpendingOverTime) or 'income' (BudgetAssignmentChart)
    const [activityChartMode, setActivityChartMode] = useState<'spending' | 'income'>('spending');

    // Whether filters are active (group or category selected)
    const hasActiveFilters = selectedGroups.length > 0 || selectedCategories.length > 0;



    // Memoize expensive calculations
    const categoriesWithGroupNames = useMemo(() =>
        categories.map(cat => ({
            ...cat,
            groupName: cat.groups?.name || cat.group || 'Uncategorized',
        })), [categories]);

    const availableGroups = useMemo(() =>
        Array.from(new Set(
            categoriesWithGroupNames.map(cat => cat.groupName)
        )).sort(), [categoriesWithGroupNames]);

    const availableCategories = useMemo(() =>
        categoriesWithGroupNames.map(cat => ({
            id: cat.id,
            name: cat.name,
            group: cat.groupName
        })), [categoriesWithGroupNames]);

    // Quick stats (filtered by date range + groups + categories)
    const quickStats = useMemo(() => {
        const { allTimeStart, allTimeEnd } = calculateAllTimeRange(assignments, transactions);
        const dr = calculateDateRange(timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd);

        const filtered = transactions.filter(t => {
            if (!t || t.type !== 'payment') return false;
            const d = new Date(t.date);
            if (d < dr.start || d > dr.end) return false;

            // Apply group filter
            if (selectedGroups.length > 0) {
                const category = categories.find(c => c.id === t.category_id);
                if (!category) return false;
                const groupName = category.groups?.name || category.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return false;
            }

            // Apply category filter
            if (selectedCategories.length > 0) {
                if (!selectedCategories.includes(t.category_id || '')) return false;
            }

            return true;
        });

        const totalSpent = filtered.reduce((s, t) => s + Math.abs(t.amount), 0);
        const txnCount = filtered.length;
        const days = Math.max(1, (dr.end.getTime() - dr.start.getTime()) / (1000 * 60 * 60 * 24));
        const dailyAvg = totalSpent / days;

        return { totalSpent, txnCount, dailyAvg };
    }, [transactions, assignments, timeRange, customStartDate, customEndDate, selectedGroups, selectedCategories, categories]);

    // Determine what FilterInsights should show based on current filters
    const filterInsightsConfig = useMemo(() => {
        if (selectedCategories.length === 1) {
            const cat = categories.find(c => c.id === selectedCategories[0]);
            if (cat) {
                return {
                    filterType: 'category' as const,
                    filterId: cat.id,
                    filterLabel: cat.name,
                };
            }
        }
        if (selectedGroups.length === 1 && selectedCategories.length === 0) {
            return {
                filterType: 'group' as const,
                filterId: selectedGroups[0],
                filterLabel: selectedGroups[0],
            };
        }
        return null;
    }, [selectedGroups, selectedCategories, categories]);

    const showTopCategories = selectedCategories.length === 0;

    const handleCustomDateChange = (start: Date, end: Date) => {
        setCustomStartDate(start);
        setCustomEndDate(end);
        if (timeRange !== 'custom') {
            setTimeRange('custom');
        }
    };

    const handleGroupsChange = (groups: string[]) => {
        setSelectedGroups(groups);
    };

    const handleCategoriesChange = (categories: string[]) => {
        setSelectedCategories(categories);
    };

    const handleTimeRangeChange = (range: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom') => {
        setTimeRange(range);
    };

    const handleSetComparisonPeriod = (start: Date, end: Date) => {
        setTimeRange('custom');
        setCustomStartDate(start);
        setCustomEndDate(end);
    };

    // Zoom animation
    const [zoomAnimating, setZoomAnimating] = useState(false);
    const triggerZoomAnimation = useCallback(() => {
        setZoomAnimating(true);
        window.setTimeout(() => setZoomAnimating(false), 350);
    }, []);

    const hasNoData = assignments.length === 0 && categories.length === 0 && transactions.length === 0;
    if (loading && hasNoData) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                    <Navbar />
                    <Sidebar />
                    <MobileNav />
                    <main className="pt-[env(safe-area-inset-top)] md:pt-16 pb-32 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in">
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

    // Calculate date ranges
    const { allTimeStart, allTimeEnd } = calculateAllTimeRange(assignments, transactions);
    const dateRange = calculateDateRange(timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <Navbar />
                <Sidebar />
                <MobileNav />

                <Toaster
                    containerClassName='mb-[15dvh]'
                    position="bottom-center"
                    toastOptions={{
                        style: { background: '#333', color: '#fff' },
                        success: { iconTheme: { primary: '#bac2ff', secondary: '#fff' } },
                        error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } }
                    }}
                />

                <main className={`pt-[env(safe-area-inset-top)] md:pt-16 pb-32 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-4 sm:p-6 fade-in`}>
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8 sm:mb-8 md:mt-8">

                        </div>

                        {assignments.length === 0 ? (
                            <div className="text-center text-white/60 mt-20">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                                        <path d="M3 3V21H21V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                        <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold mb-2">No Budget History</h2>
                                <p className="text-sm max-w-md mx-auto">
                                    Start using your budget for a few months to see charts and trends of your spending habits.
                                </p>
                            </div>
                        ) : (
                            <div className={`space-y-4 sm:space-y-6 transition-all duration-300 ease-out ${zoomAnimating ? 'opacity-90 scale-[0.995]' : 'opacity-100 scale-100'}`}>
                                {/* 1. Chart Controls */}
                                <ChartControls
                                    timeRange={timeRange}
                                    onTimeRangeChange={handleTimeRangeChange}
                                    customStartDate={customStartDate}
                                    customEndDate={customEndDate}
                                    onCustomDateChange={handleCustomDateChange}
                                    availableGroups={availableGroups}
                                    selectedGroups={selectedGroups}
                                    onGroupsChange={handleGroupsChange}
                                    availableCategories={availableCategories}
                                    selectedCategories={selectedCategories}
                                    onCategoriesChange={handleCategoriesChange}
                                />

                                {/* 2. Quick Stats Row */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    <div className="stats-card">
                                        <div className="text-xs text-white/50 mb-0.5">Total Spent</div>
                                        <div className="text-sm sm:text-lg font-bold text-white">{formatCurrency(quickStats.totalSpent)}</div>
                                    </div>
                                    <div className="stats-card">
                                        <div className="text-xs text-white/50 mb-0.5">Transactions</div>
                                        <div className="text-sm sm:text-lg font-bold text-white">{quickStats.txnCount}</div>
                                    </div>
                                    <div className="stats-card">
                                        <div className="text-xs text-white/50 mb-0.5">Daily Avg</div>
                                        <div className="text-sm sm:text-lg font-bold text-white">{formatCurrency(quickStats.dailyAvg)}</div>
                                    </div>
                                </div>

                                {/* 3. Filter Insights – shown when a single group or category is selected */}
                                {filterInsightsConfig && (
                                    <FilterInsights
                                        filterType={filterInsightsConfig.filterType}
                                        filterId={filterInsightsConfig.filterId}
                                        filterLabel={filterInsightsConfig.filterLabel}
                                        transactions={transactions}
                                        categories={categories}
                                        dateRange={dateRange}
                                        timeRange={timeRange}
                                        allTimeRange={allTimeStart && allTimeEnd ? { start: allTimeStart, end: allTimeEnd } : undefined}
                                        onDateRangeChange={handleCustomDateChange}
                                        onClose={() => {
                                            // Clear the filter that's driving insights
                                            if (filterInsightsConfig.filterType === 'category') {
                                                setSelectedCategories([]);
                                            } else {
                                                setSelectedGroups([]);
                                                setSelectedCategories([]);
                                            }
                                        }}
                                        onSetComparisonPeriod={handleSetComparisonPeriod}
                                    />
                                )}

                                {/* 4. Top Categories & Top Vendors – side-by-side on desktop */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    {showTopCategories && (<div className="stats-card">
                                        <h2 className="text-sm sm:text-base font-semibold text-white mb-3 flex items-center gap-2">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                                            </svg>
                                            Top Categories
                                        </h2>
                                        <div className="overflow-x-auto hide-scrollbar">
                                            <div className="min-w-[300px]">
                                                <TopCategoriesChart
                                                    transactions={transactions}
                                                    categories={categories}
                                                    dateRange={dateRange}
                                                    selectedGroups={selectedGroups}
                                                />
                                            </div>
                                        </div>
                                    </div>)}

                                    <div className={`stats-card ${!showTopCategories ? 'lg:col-span-2' : ''}`}>
                                        <h2 className="text-sm sm:text-base font-semibold text-white mb-3 flex items-center gap-2">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9" />
                                            </svg>
                                            Top Vendors
                                        </h2>
                                        <div className="overflow-x-auto hide-scrollbar">
                                            <div className="min-w-[300px]">
                                                <TopVendorsChart
                                                    transactions={transactions}
                                                    categories={categories}
                                                    dateRange={dateRange}
                                                    selectedGroups={selectedGroups}
                                                    selectedCategories={selectedCategories}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Activity Chart – swappable between Spending Over Time and Income vs Spending */}
                                <div className="stats-card">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="8" rx="0.5" /><rect x="12" y="6" width="3" height="12" rx="0.5" /><rect x="17" y="13" width="3" height="5" rx="0.5" />
                                            </svg>
                                            Activity
                                        </h2>

                                        {/* Mode toggle – only show "Income vs Spending" when no filters are active */}
                                        <div className="flex gap-1 bg-white/[.03] rounded-lg p-1">
                                            <button
                                                onClick={() => setActivityChartMode('spending')}
                                                className={`px-3 py-1.5 text-xs rounded-md transition-all ${activityChartMode === 'spending'
                                                    ? 'bg-green text-black font-medium'
                                                    : 'text-white/60 hover:text-white/80'
                                                    }`}
                                            >
                                                Spending
                                            </button>
                                            <button
                                                onClick={() => setActivityChartMode('income')}
                                                className={`px-3 py-1.5 text-xs rounded-md transition-all ${activityChartMode === 'income'
                                                    ? 'bg-green text-black font-medium'
                                                    : 'text-white/60 hover:text-white/80'
                                                    }`}
                                            >
                                                Balance
                                            </button>
                                        </div>
                                    </div>

                                    {activityChartMode === 'spending' ? (
                                        <SpendingOverTime
                                            transactions={transactions}
                                            categories={categories}
                                            dateRange={dateRange}
                                            selectedGroups={selectedGroups}
                                            selectedCategories={selectedCategories}
                                        />
                                    ) : (
                                        <BudgetAssignmentChart
                                            assignments={assignments}
                                            categories={categories}
                                            transactions={transactions}
                                            timeRange={timeRange}
                                            customStartDate={customStartDate}
                                            customEndDate={customEndDate}
                                            selectedGroups={selectedGroups}
                                            selectedCategories={selectedCategories}
                                            showGoals={showGoals}
                                            showRollover={showRollover}
                                            onZoomRange={(start: Date, end: Date) => {
                                                setTimeRange('custom');
                                                setCustomStartDate(start);
                                                setCustomEndDate(end);
                                                triggerZoomAnimation();
                                                requestAnimationFrame(() => {
                                                    const chartContainer = document.getElementById('line-chart-container');
                                                    if (chartContainer) {
                                                        const headerHeight = 64;
                                                        const rect = chartContainer.getBoundingClientRect();
                                                        const target = rect.top + window.pageYOffset - headerHeight - 8;
                                                        window.scrollTo({ top: target, behavior: 'smooth' });
                                                    }
                                                });
                                            }}
                                        />
                                    )}
                                </div>

                                {/* 6. Spending Breakdown (Pie Chart) – always visible */}
                                <div className="stats-card">
                                    <h2 className="text-sm sm:text-base font-semibold text-white mb-4 flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                            <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 019.95 9H12V2z" />
                                        </svg>
                                        Spending Breakdown
                                    </h2>
                                    <PieChart
                                        transactions={transactions}
                                        categories={categories}
                                        dateRange={dateRange}
                                        selectedGroups={selectedGroups}
                                        selectedCategories={selectedCategories}
                                        onSegmentClick={() => { }}
                                        showTooltip={true}
                                        matchHeight={false}
                                        timeRange={timeRange}
                                        allTimeRange={allTimeStart && allTimeEnd ? { start: allTimeStart, end: allTimeEnd } : undefined}
                                        onDateRangeChange={handleCustomDateChange}
                                    />
                                </div>

                                {/* 7. Money Flow (Sankey) Card */}
                                <Link href="/stats/sankey">
                                    <div className="stats-card group hover:border-green/40 transition-all cursor-pointer flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500/30 to-green/30 rounded-lg flex items-center justify-center">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green">
                                                    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm sm:text-base text-white">Money Flow Diagram</h3>
                                                <p className="text-xs text-white/50">Interactive Sankey visualization</p>
                                            </div>
                                        </div>
                                        <svg
                                            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            className="text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"
                                        >
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
