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
import SpendingHabitsWidget from '../components/charts/SpendingHabitsWidget';
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
import { ProGate } from '../components/pro-gate';
import SankeyInline from './sankey/sankey-inline';
import { Capacitor } from '@capacitor/core';
import { subDays, startOfMonth, subMonths, endOfMonth, startOfYear, subYears, endOfYear } from 'date-fns';

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function Stats() {
    const supabase = createClient();
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();
    const { data: categories = [], isLoading: categoriesLoading } = useCategories();
    const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();

    const loading = assignmentsLoading || categoriesLoading || transactionsLoading;

    useMobileViewportStability();

    const isDesktop = useIsDesktop();
    const isNative = Capacitor.isNativePlatform();

    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom'>('3m');
    const [customStartDate, setCustomStartDate] = useState<Date>();
    const [customEndDate, setCustomEndDate] = useState<Date>();
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showGoals, setShowGoals] = useState(false);
    const [showRollover, setShowRollover] = useState(false);

    // Mobile only – toggle between Spending and Balance charts
    const [activityChartMode, setActivityChartMode] = useState<'spending' | 'income'>('spending');

    const hasActiveFilters = selectedGroups.length > 0 || selectedCategories.length > 0;

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

    // ── Compute all stats from filtered transactions ──────────────────────────
    const { allTimeStart, allTimeEnd } = useMemo(
        () => calculateAllTimeRange(assignments, transactions),
        [assignments, transactions]
    );

    const dateRange = useMemo(
        () => calculateDateRange(timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd),
        [timeRange, customStartDate, customEndDate, allTimeStart, allTimeEnd]
    );

    // Comparison date range for MoM arrows (previous same-length period)
    const comparisonDateRange = useMemo(() => {
        const isCompleteMonth =
            dateRange.start.getTime() === startOfMonth(dateRange.start).getTime() &&
            dateRange.end.getTime() === endOfMonth(dateRange.start).getTime();
        const isCompleteYear =
            dateRange.start.getTime() === startOfYear(dateRange.start).getTime() &&
            dateRange.end.getTime() === endOfYear(dateRange.start).getTime();
        const actualMode =
            (timeRange === 'mtd' || isCompleteMonth) ? 'mtd' :
                (timeRange === 'ytd' || isCompleteYear) ? 'ytd' :
                    timeRange;

        if (actualMode === 'mtd') {
            const prev = subMonths(dateRange.start, 1);
            return { start: startOfMonth(prev), end: endOfMonth(prev) };
        } else if (actualMode === 'ytd') {
            const prev = subYears(dateRange.start, 1);
            return { start: startOfYear(prev), end: endOfYear(prev) };
        } else {
            const duration = dateRange.end.getTime() - dateRange.start.getTime();
            const compEnd = new Date(dateRange.start.getTime() - 1);
            const compStart = new Date(dateRange.start.getTime() - duration);
            return { start: compStart, end: compEnd };
        }
    }, [dateRange, timeRange]);

    const quickStats = useMemo(() => {
        let totalSpent = 0;
        let totalIncome = 0;
        let txnCount = 0;
        let largestTxn = 0;

        transactions.forEach(t => {
            if (!t) return;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return;

            if (selectedGroups.length > 0) {
                const category = categories.find(c => c.id === t.category_id);
                if (!category) return;
                const groupName = category.groups?.name || category.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return;
            }
            if (selectedCategories.length > 0) {
                if (!selectedCategories.includes(t.category_id || '')) return;
            }

            if (t.type === 'payment') {
                const abs = Math.abs(t.amount);
                totalSpent += abs;
                txnCount += 1;
                if (abs > largestTxn) largestTxn = abs;
            } else if (t.type === 'income') {
                totalIncome += Math.abs(t.amount);
            }
        });

        const days = Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
        const dailyAvg = totalSpent / days;
        const net = totalIncome - totalSpent;

        return { totalSpent, totalIncome, txnCount, dailyAvg, largestTxn, net };
    }, [transactions, dateRange, selectedGroups, selectedCategories, categories]);

    const filterInsightsConfig = useMemo(() => {
        if (selectedCategories.length === 1) {
            const cat = categories.find(c => c.id === selectedCategories[0]);
            if (cat) return { filterType: 'category' as const, filterId: cat.id, filterLabel: cat.name };
        }
        if (selectedGroups.length === 1 && selectedCategories.length === 0) {
            return { filterType: 'group' as const, filterId: selectedGroups[0], filterLabel: selectedGroups[0] };
        }
        return null;
    }, [selectedGroups, selectedCategories, categories]);

    const showTopCategories = selectedCategories.length === 0;

    const handleCustomDateChange = (start: Date, end: Date) => {
        setCustomStartDate(start);
        setCustomEndDate(end);
        if (timeRange !== 'custom') setTimeRange('custom');
    };

    const handleGroupsChange = (groups: string[]) => setSelectedGroups(groups);
    const handleCategoriesChange = (cats: string[]) => setSelectedCategories(cats);
    const handleTimeRangeChange = (range: typeof timeRange) => setTimeRange(range);
    const handleSetComparisonPeriod = (start: Date, end: Date) => {
        setTimeRange('custom');
        setCustomStartDate(start);
        setCustomEndDate(end);
    };

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
                        <div className="max-w-18xl mx-auto">
                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
                            </div>
                        </div>
                    </main>
                </div>
            </ProtectedRoute>
        );
    }

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

                <main className={`pt-[env(safe-area-inset-top)] mt-4 md:pt-16 pb-32 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-4 sm:p-6 fade-in`}>
                    <div className="max-w-12xl mx-auto">

                        {(assignments.length === 0 && transactions.length === 0) ? (
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
                            <div className={`space-y-3 sm:space-y-4 transition-all duration-300 ease-out ${zoomAnimating ? 'opacity-90 scale-[0.995]' : 'opacity-100 scale-100'}`}>

                                {/* ── 1. Chart Controls ───────────────────────────────────────────── */}
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




                                {/* ── 3 + 4. KPI/Insights + Pie chart (desktop: stable two-column) ── */}
                                {/* The pie column is always fixed-width on desktop so clicking a segment
                                    doesn't cause a layout shift. The left column swaps between the
                                    Overview KPI card (no filter) and FilterInsights/SpendingHabits
                                    (filter active). */}
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_auto]">

                                    {/* Left column: Overview OR FilterInsights/SpendingHabits */}
                                    {filterInsightsConfig ? (
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
                                                if (filterInsightsConfig.filterType === 'category') {
                                                    setSelectedCategories([]);
                                                } else {
                                                    setSelectedGroups([]);
                                                    setSelectedCategories([]);
                                                }
                                            }}
                                            onSetComparisonPeriod={handleSetComparisonPeriod}
                                        />
                                    ) : hasActiveFilters ? (
                                        <div className="stats-card">
                                            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                                </svg>
                                                Spending Habits
                                            </h2>
                                            <SpendingHabitsWidget
                                                transactions={transactions}
                                                categories={categories}
                                                dateRange={dateRange}
                                                selectedGroups={selectedGroups}
                                                selectedCategories={selectedCategories}
                                            />
                                        </div>
                                    ) : (
                                        <div className="stats-card">
                                            {/* Income vs Spending summary */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0">
                                                    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                                                </svg>
                                                <h2 className="text-sm font-semibold text-white">Overview</h2>
                                            </div>

                                            {/* Income vs Spending bar */}
                                            <div className="mb-3 bg-white/[.03] rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <div className="text-xs text-white/50">Income</div>
                                                        <div className="text-base font-bold text-green">{formatCurrency(quickStats.totalIncome)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-white/50">Spending</div>
                                                        <div className="text-base font-bold text-white">{formatCurrency(quickStats.totalSpent)}</div>
                                                    </div>
                                                </div>
                                                {/* Stacked bar */}
                                                {(quickStats.totalIncome > 0 || quickStats.totalSpent > 0) && (() => {
                                                    const total = Math.max(quickStats.totalIncome, quickStats.totalSpent);
                                                    const incomePct = total > 0 ? (quickStats.totalIncome / total) * 100 : 0;
                                                    const spendPct = total > 0 ? (quickStats.totalSpent / total) * 100 : 0;
                                                    return (
                                                        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-white/[.05]">
                                                            <div className="h-full rounded-full bg-green/60 transition-all duration-500" style={{ width: `${incomePct}%` }} />
                                                            <div className="h-full rounded-full bg-white/30 transition-all duration-500" style={{ width: `${spendPct}%` }} />
                                                        </div>
                                                    );
                                                })()}
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-white/40">Net</span>
                                                    <span className={`text-sm font-semibold tabular-nums ${quickStats.net >= 0 ? 'text-green' : 'text-orange-400'}`}>
                                                        {quickStats.net >= 0 ? '+' : ''}{formatCurrency(quickStats.net)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 5-KPI flex row – stays horizontal, wraps only when needed */}
                                            <div className="flex flex-wrap gap-2">
                                                <div className="bg-white/[.03] rounded-lg p-2.5 flex-1 min-w-[80px]">
                                                    <div className="text-xs text-white/50 mb-0.5">Spent</div>
                                                    <div className="text-sm font-bold text-white tabular-nums">{formatCurrency(quickStats.totalSpent)}</div>
                                                </div>
                                                <div className="bg-white/[.03] rounded-lg p-2.5 flex-1 min-w-[80px]">
                                                    <div className="text-xs text-white/50 mb-0.5">Transactions</div>
                                                    <div className="text-sm font-bold text-white tabular-nums">{quickStats.txnCount}</div>
                                                </div>
                                                <div className="bg-white/[.03] rounded-lg p-2.5 flex-1 min-w-[80px]">
                                                    <div className="text-xs text-white/50 mb-0.5">Daily Avg</div>
                                                    <div className="text-sm font-bold text-white tabular-nums">{formatCurrency(quickStats.dailyAvg)}</div>
                                                </div>
                                                <div className="bg-white/[.03] rounded-lg p-2.5 flex-1 min-w-[80px]">
                                                    <div className="text-xs text-white/50 mb-0.5">Largest</div>
                                                    <div className="text-sm font-bold text-white tabular-nums">{formatCurrency(quickStats.largestTxn)}</div>
                                                </div>
                                                <div className="bg-white/[.03] rounded-lg p-2.5 flex-1 min-w-[80px]">
                                                    <div className="text-xs text-white/50 mb-0.5">Per Txn</div>
                                                    <div className="text-sm font-bold text-white tabular-nums">
                                                        {quickStats.txnCount > 0 ? formatCurrency(quickStats.totalSpent / quickStats.txnCount) : '—'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Spending Habits below KPIs when no filter active */}
                                            <div className="mt-4 pt-4 border-t border-white/[.05]">
                                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    Spending Habits
                                                </h3>
                                                <SpendingHabitsWidget
                                                    transactions={transactions}
                                                    categories={categories}
                                                    dateRange={dateRange}
                                                    selectedGroups={selectedGroups}
                                                    selectedCategories={selectedCategories}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Right column: Pie chart – always fixed width on desktop */}
                                    <div className="stats-card lg:w-[480px] xl:w-[520px]">
                                        <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
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
                                            onSegmentClick={(segment) => {
                                                if (segment.type === 'group') {
                                                    setSelectedGroups([segment.id]);
                                                    setSelectedCategories([]);
                                                } else if (segment.type === 'category') {
                                                    setSelectedCategories([segment.id]);
                                                }
                                            }}
                                            onBack={() => {
                                                if (selectedCategories.length > 0) setSelectedCategories([]);
                                                else if (selectedGroups.length > 0) setSelectedGroups([]);
                                            }}
                                            showTooltip={true}
                                            matchHeight={false}
                                            timeRange={timeRange}
                                            allTimeRange={allTimeStart && allTimeEnd ? { start: allTimeStart, end: allTimeEnd } : undefined}
                                            onDateRangeChange={handleCustomDateChange}
                                        />
                                    </div>
                                </div>


                                {/* ── 4. Top Categories + Top Vendors ────────────────────────────── */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                    {showTopCategories && (
                                        <div className="stats-card">
                                            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
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
                                                        comparisonDateRange={comparisonDateRange}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`stats-card ${!showTopCategories ? 'lg:col-span-2' : ''}`}>
                                        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
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

                                {/* ── 5. Activity charts ──────────────────────────────────────────── */}
                                {/* Desktop: both side-by-side. Mobile: toggle */}
                                {isDesktop ? (
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        {/* Spending Over Time */}
                                        <div className="stats-card">
                                            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                    <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="8" rx="0.5" /><rect x="12" y="6" width="3" height="12" rx="0.5" /><rect x="17" y="13" width="3" height="5" rx="0.5" />
                                                </svg>
                                                Spending Over Time
                                            </h2>
                                            <SpendingOverTime
                                                transactions={transactions}
                                                categories={categories}
                                                dateRange={dateRange}
                                                selectedGroups={selectedGroups}
                                                selectedCategories={selectedCategories}
                                            />
                                        </div>

                                        {/* Balance / Budget Chart */}
                                        <div className="stats-card">
                                            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                                                </svg>
                                                Balance
                                            </h2>
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
                                                        const el = document.getElementById('line-chart-container');
                                                        if (el) {
                                                            const rect = el.getBoundingClientRect();
                                                            window.scrollTo({ top: rect.top + window.pageYOffset - 72, behavior: 'smooth' });
                                                        }
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Mobile: single card with toggle */
                                    <div className="stats-card">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                                                    <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="8" rx="0.5" /><rect x="12" y="6" width="3" height="12" rx="0.5" /><rect x="17" y="13" width="3" height="5" rx="0.5" />
                                                </svg>
                                                Activity
                                            </h2>
                                            <div className="flex gap-1 bg-white/[.03] rounded-lg p-1">
                                                <button
                                                    onClick={() => setActivityChartMode('spending')}
                                                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${activityChartMode === 'spending' ? 'bg-green text-black font-medium' : 'text-white/60 hover:text-white/80'}`}
                                                >
                                                    Spending
                                                </button>
                                                <button
                                                    onClick={() => setActivityChartMode('income')}
                                                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${activityChartMode === 'income' ? 'bg-green text-black font-medium' : 'text-white/60 hover:text-white/80'}`}
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
                                                        const el = document.getElementById('line-chart-container');
                                                        if (el) {
                                                            const rect = el.getBoundingClientRect();
                                                            window.scrollTo({ top: rect.top + window.pageYOffset - 72, behavior: 'smooth' });
                                                        }
                                                    });
                                                }}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* ── 7. Money Flow (Sankey) — inline pro-gated ───────────────── */}
                                <div className="stats-card">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0">
                                            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                                        </svg>
                                        <h2 className="text-sm font-semibold text-white">Money Flow Diagram</h2>
                                        {!isNative && <span className="ml-1 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-green/15 text-green border border-green/25">Pro</span>}
                                    </div>
                                    <ProGate
                                        featureName="Money Flow Diagram"
                                        featureDescription="See exactly where your money goes — income sources flow through spending groups, categories, and vendors in one beautiful interactive visualization."
                                        dismissible={false}
                                    >
                                        <SankeyInline />
                                    </ProGate>
                                </div>

                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
