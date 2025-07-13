'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Database } from '../../types/supabase';
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

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function Stats() {
    const supabase = createClientComponentClient<Database>();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    
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

    // Fetch data from Supabase
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            // Fetch assignments, categories, and transactions
            const [assignmentsResponse, categoriesResponse, transactionsResponse] = await Promise.all([
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
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: true })
            ]);

            if (assignmentsResponse.error) throw assignmentsResponse.error;
            if (categoriesResponse.error) throw categoriesResponse.error;
            if (transactionsResponse.error) throw transactionsResponse.error;

            setAssignments(assignmentsResponse.data || []);
            setCategories(categoriesResponse.data || []);
            setTransactions(transactionsResponse.data || []);
        } catch (error) {
            console.error('Error fetching stats data:', error);
            toast.error('Failed to load statistics data');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Get available groups for filtering
    // Memoize expensive calculations to prevent re-computation on every render
    const categoriesWithGroupNames = useMemo(() => 
        categories.map(cat => ({
            ...cat,
            groupName: (cat as any).groups?.name || cat.group || 'Uncategorized',
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
        // Close insights panel when filters change
        setSelectedPieSegment(null);
    };

    // Filter change handlers that also close insights panel
    const handleGroupsChange = (groups: string[]) => {
        setSelectedGroups(groups);
        setSelectedPieSegment(null);
    };

    const handleCategoriesChange = (categories: string[]) => {
        setSelectedCategories(categories);
        setSelectedPieSegment(null);
    };

    const handleTimeRangeChange = (range: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom') => {
        setTimeRange(range);
        setSelectedPieSegment(null);
    };

    // Pie chart handlers
    const handlePieSegmentClick = (segment: PieSegment) => {
        setSelectedPieSegment(segment);
    };

    const handleClosePieInsights = () => {
        setSelectedPieSegment(null);
    };

    const handleFilterBySegment = (segment: PieSegment) => {
        // Clear existing filters first
        setSelectedGroups([]);
        setSelectedCategories([]);
        
        // Apply filters based on segment type
        if (segment.type === 'group') {
            setSelectedGroups([segment.id]);
        } else if (segment.type === 'category') {
            // Find the group this category belongs to and set both group and category filters
            const category = categories.find(cat => cat.id === segment.id);
            if (category) {
                const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
                setSelectedGroups([groupName]);
                setSelectedCategories([segment.id]);
            }
        } else if (segment.type === 'vendor') {
            // For vendor, we need to keep the current category selection that led to this vendor view
            // The vendor view only appears when categories from the same group are selected
            // So we don't need to change the filters, just close the insights panel
        }
        
        // Close the insights panel
        setSelectedPieSegment(null);
    };

    const handleSetComparisonPeriod = (start: Date, end: Date) => {
        // Set time range to custom and update the custom dates
        setTimeRange('custom');
        setCustomStartDate(start);
        setCustomEndDate(end);
        // Close insights panel when changing time range
        setSelectedPieSegment(null);
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                    <Navbar />
                    <Sidebar />
                    <MobileNav />
                    
                    <main className="pt-16 pb-28 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in">
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
                
                <main className="pt-16 pb-28 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in">
                    <div className="max-w-7xl mx-auto">
                        {/* Mobile header */}
                        <div className="md:hidden mb-6">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Statistics</h1>
                        </div>

                        {/* Desktop header */}
                        <div className="hidden md:flex items-center justify-between mb-8 md:mt-8">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Statistics</h1>
                        </div>

                        {assignments.length === 0 ? (
                            // No data state
                            <div className="text-center text-white/60 mt-20">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                                        <path d="M3 3V21H21V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                        <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold mb-2">No Budget History</h2>
                                <p className="text-sm max-w-md mx-auto">
                                    Start using your budget for a few months to see charts and trends of your spending habits.
                                </p>
                            </div>
                        ) : (
                            // Main content
                            <div className="space-y-6">
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

                                    return selectedPieSegment ? (
                                        // Layout with insights panel - pie chart takes 2/3 width
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                                            <div className="lg:col-span-2 flex flex-col">
                                                <PieChart
                                                    transactions={transactions}
                                                    categories={categories}
                                                    dateRange={dateRange}
                                                    selectedGroups={selectedGroups}
                                                    selectedCategories={selectedCategories}
                                                    onSegmentClick={handlePieSegmentClick}
                                                    showTooltip={!selectedPieSegment}
                                                    matchHeight={!!selectedPieSegment}
                                                />
                                            </div>
                                            <div className="lg:col-span-1 flex flex-col">
                                                <PieSegmentInsights
                                                    segment={selectedPieSegment}
                                                    transactions={transactions}
                                                    categories={categories}
                                                    dateRange={dateRange}
                                                    onClose={handleClosePieInsights}
                                                    onFilterBySegment={handleFilterBySegment}
                                                    onSetComparisonPeriod={handleSetComparisonPeriod}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // Full width layout when no insights panel
                                        <div className="w-full">
                                            <PieChart
                                                transactions={transactions}
                                                categories={categories}
                                                dateRange={dateRange}
                                                selectedGroups={selectedGroups}
                                                selectedCategories={selectedCategories}
                                                onSegmentClick={handlePieSegmentClick}
                                                showTooltip={!selectedPieSegment}
                                                matchHeight={!!selectedPieSegment}
                                            />
                                        </div>
                                    );
                                })()}

                                {/* Budget Assignment Chart - NOW WITH TRANSACTIONS! */}
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
                                />

                                {/* Summary Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white/[.03] rounded-lg p-4">
                                        <h3 className="text-sm text-white/50 mb-1">Total Assignments</h3>
                                        <p className="text-2xl font-bold text-green">
                                            {assignments.reduce((sum, a) => sum + (a.assigned || 0), 0).toLocaleString('en-GB', {
                                                style: 'currency',
                                                currency: 'GBP',
                                                minimumFractionDigits: 0
                                            })}
                                        </p>
                                    </div>
                                    <div className="bg-white/[.03] rounded-lg p-4">
                                        <h3 className="text-sm text-white/50 mb-1">Active Categories</h3>
                                        <p className="text-2xl font-bold text-white">
                                            {categories.length}
                                        </p>
                                    </div>
                                    <div className="bg-white/[.03] rounded-lg p-4">
                                        <h3 className="text-sm text-white/50 mb-1">Budget Groups</h3>
                                        <p className="text-2xl font-bold text-white">
                                            {availableGroups.length}
                                        </p>
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
