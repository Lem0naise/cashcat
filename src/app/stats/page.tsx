'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Database } from '../../types/supabase';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAssignments } from '../hooks/useAssignments';
import BudgetAssignmentChart from '../components/BudgetAssignmentChartRefactored';
import ChartControls from '../components/chart-controls';
import PieChart from '../components/charts/PieChart';
import PieSegmentInsights from '../components/charts/PieSegmentInsights';
import { PieSegment } from '../components/charts/types';
import { calculateDateRange, calculateAllTimeRange } from '../components/charts/utils';
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
    const supabase = createClientComponentClient<Database>();
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

    // Pie chart state
    const [selectedPieSegment, setSelectedPieSegment] = useState<PieSegment | null>(null);
    const [persistedGroupSegment, setPersistedGroupSegment] = useState<PieSegment | null>(null);

    // Initial data setup removed as hooks handle it automatically


    // Get available groups for filtering
    // Memoize expensive calculations to prevent re-computation on every render
    const categoriesWithGroupNames = useMemo(() =>
        categories.map(cat => ({
            ...cat,
            groupName: cat.groups?.name || cat.group || 'Uncategorized',
        })), [categories]);

    const availableGroups = useMemo(() =>
        Array.from(new Set(
            categoriesWithGroupNames.map(cat => cat.groupName)
        )).sort(), [categoriesWithGroupNames]);

    // Get available categories for filtering
    const availableCategories = useMemo(() =>
        categoriesWithGroupNames.map(cat => ({
            id: cat.id,
            name: cat.name,
            group: cat.groupName
        })), [categoriesWithGroupNames]);

    const handleCustomDateChange = (start: Date, end: Date) => {
        setCustomStartDate(start);
        setCustomEndDate(end);
        // Set time range to custom when navigating via date picker
        if (timeRange !== 'custom') {
            setTimeRange('custom');
        }
        // Don't close insights panel when navigating via date picker - keep the same segment visible
        // The insights will automatically update to show data for the new time period
    };

    // Filter change handlers that also close insights panel
    const handleGroupsChange = (groups: string[]) => {
        setSelectedGroups(groups);
        // Close insights when manually changing group filters - this changes the context
        setSelectedPieSegment(null);
        setPersistedGroupSegment(null);
    };

    const handleCategoriesChange = (categories: string[]) => {
        setSelectedCategories(categories);
        // Close insights when manually changing category filters - this changes the context
        setSelectedPieSegment(null);
        setPersistedGroupSegment(null);
    };

    const handleTimeRangeChange = (range: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom') => {
        setTimeRange(range);
        // Only close insights panel when manually changing time range (not during navigation)
        // This preserves the insights when using arrow key navigation
        setSelectedPieSegment(null);
        setPersistedGroupSegment(null);
    };

    // Pie chart handlers
    const handlePieSegmentClick = (segment: PieSegment) => {
        // When clicking a category segment while we have a persisted group segment,
        // replace the group insights with category insights
        if (segment.type === 'category' && persistedGroupSegment) {
            setPersistedGroupSegment(null);
        }

        setSelectedPieSegment(segment);

        // Scroll to the insights panel on both mobile and desktop since it's now always below
        requestAnimationFrame(() => {
            // Find the appropriate insights panel based on screen size
            const insightsPanel = isDesktop
                ? document.getElementById('desktop-insights-panel')
                : document.getElementById('mobile-insights-panel');

            if (insightsPanel) {
                // Calculate the position accounting for the fixed header
                const headerHeight = 64; // pt-16 = 64px header height
                const additionalOffset = 16; // Extra spacing for better visual positioning
                const elementPosition = insightsPanel.getBoundingClientRect().top + window.pageYOffset;
                const targetPosition = elementPosition - headerHeight - additionalOffset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    };

    const handleClosePieInsights = () => {
        setSelectedPieSegment(null);
        setPersistedGroupSegment(null);
    };

    const handleFilterBySegment = (segment: PieSegment) => {
        // Clear existing filters first
        setSelectedGroups([]);
        setSelectedCategories([]);

        // Apply filters based on segment type
        if (segment.type === 'group') {
            setSelectedGroups([segment.id]);
            // When clicking "detailed insights" on a group, persist the group segment for continued display
            setPersistedGroupSegment(segment);
            // Keep the insights panel open but showing the group segment
            // The segment will remain visible until user clicks a category or manually closes
        } else if (segment.type === 'category') {
            // Find the group this category belongs to and set both group and category filters
            const category = categories.find(cat => cat.id === segment.id);
            if (category) {
                const groupName = category.groups?.name || category.group || 'Uncategorized';
                setSelectedGroups([groupName]);
                setSelectedCategories([segment.id]);
            }
            // When selecting a category, replace the group insights with category insights
            setPersistedGroupSegment(null);
            // Close the current insights panel - it will be replaced with category insights when clicked
            setSelectedPieSegment(null);
        } else if (segment.type === 'vendor') {
            // For vendor, we need to keep the current category selection that led to this vendor view
            // The vendor view only appears when categories from the same group are selected
            // So we don't need to change the filters, just close the insights panel
            setPersistedGroupSegment(null);
            setSelectedPieSegment(null);
        }
    };

    const handleSetComparisonPeriod = (start: Date, end: Date) => {
        // Set time range to custom and update the custom dates
        setTimeRange('custom');
        setCustomStartDate(start);
        setCustomEndDate(end);
        // Don't close insights panel when setting comparison period - keep the same segment visible
        // The insights will automatically update to show data for the new time period
    };

    // Smooth UI state for zoom transitions
    const [zoomAnimating, setZoomAnimating] = useState(false);
    const triggerZoomAnimation = useCallback(() => {
        // Briefly animate container for intentional zoom feel
        setZoomAnimating(true);
        window.setTimeout(() => setZoomAnimating(false), 350);
    }, []);

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

                <main className={`pt-16 pb-32 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in`}>
                    <div className="max-w-7xl mx-auto">
                        {/* Mobile header */}
                        <div className="md:hidden mb-6">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Statistics</h1>
                        </div>

                        {/* Desktop header */}
                        <div className="hidden md:flex items-center justify-between mb-8 md:mt-8">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Statistics</h1>
                        </div>

                        {/* Money Flow Card */}
                        <Link href="/stats/sankey">
                            <div className="bg-gradient-to-br from-blue-500/20 to-green/20 rounded-lg p-6 border border-blue-500/30 hover:border-green/50 transition-all cursor-pointer mb-6 group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green rounded-lg flex items-center justify-center">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 3v18h18" />
                                                <path d="m19 9-5 5-4-4-3 3" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Money Flow Diagram</h3>
                                            <p className="text-sm text-white/60">Interactive Sankey visualization of income and spending</p>
                                        </div>
                                    </div>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                                    >
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {assignments.length === 0 ? (
                            // No data state
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
                            // Main content
                            <div
                                className={`space-y-6 transition-all duration-300 ease-out ${zoomAnimating ? 'opacity-90 scale-[0.995]' : 'opacity-100 scale-100'}`}
                            >
                                {/* Chart Controls */}
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
                                // Removed showGoals, onShowGoalsChange, showRollover, onShowRolloverChange
                                />

                                {/* Pie Chart Section */}
                                {(() => {
                                    // Calculate date ranges for pie chart
                                    const { allTimeStart, allTimeEnd } = calculateAllTimeRange(assignments, transactions);
                                    const dateRange = calculateDateRange(
                                        timeRange,
                                        customStartDate,
                                        customEndDate,
                                        allTimeStart,
                                        allTimeEnd
                                    );

                                    return (
                                        <div className="w-full space-y-6">
                                            {/* Pie Chart Section - Always full width */}
                                            <div className="w-full">
                                                <PieChart
                                                    transactions={transactions}
                                                    categories={categories}
                                                    dateRange={dateRange}
                                                    selectedGroups={selectedGroups}
                                                    selectedCategories={selectedCategories}
                                                    onSegmentClick={handlePieSegmentClick}
                                                    showTooltip={!selectedPieSegment}
                                                    matchHeight={false} // Never match height since insights are below
                                                    timeRange={timeRange}
                                                    allTimeRange={allTimeStart && allTimeEnd ? { start: allTimeStart, end: allTimeEnd } : undefined}
                                                    onDateRangeChange={handleCustomDateChange}
                                                />
                                            </div>

                                            {/* Insights Panel - Always below pie chart on both mobile and desktop */}
                                            {(selectedPieSegment || persistedGroupSegment) && (
                                                <div className="w-full insights-panel-enter">
                                                    <div className="lg:hidden mobile-chart-insights" id="mobile-insights-panel">
                                                        {/* Mobile insights */}
                                                        <PieSegmentInsights
                                                            segment={selectedPieSegment || persistedGroupSegment}
                                                            transactions={transactions}
                                                            categories={categories}
                                                            dateRange={dateRange}
                                                            onClose={handleClosePieInsights}
                                                            onFilterBySegment={handleFilterBySegment}
                                                            onSetComparisonPeriod={handleSetComparisonPeriod}
                                                            isMobileOptimized={true}
                                                            isPersistedGroupView={!selectedPieSegment && !!persistedGroupSegment}
                                                            timeRange={timeRange}
                                                        />
                                                    </div>
                                                    <div className="hidden lg:block" id="desktop-insights-panel">
                                                        {/* Desktop insights */}
                                                        <PieSegmentInsights
                                                            segment={selectedPieSegment || persistedGroupSegment}
                                                            transactions={transactions}
                                                            categories={categories}
                                                            dateRange={dateRange}
                                                            onClose={handleClosePieInsights}
                                                            onFilterBySegment={handleFilterBySegment}
                                                            onSetComparisonPeriod={handleSetComparisonPeriod}
                                                            isMobileOptimized={false}
                                                            isPersistedGroupView={!selectedPieSegment && !!persistedGroupSegment}
                                                            timeRange={timeRange}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Budget Assignment Chart*/}
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
                                        // Apply custom date range and trigger subtle animation
                                        setTimeRange('custom');
                                        setCustomStartDate(start);
                                        setCustomEndDate(end);
                                        triggerZoomAnimation();
                                        // Smoothly scroll the line chart into view to reinforce the zoom
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


                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
