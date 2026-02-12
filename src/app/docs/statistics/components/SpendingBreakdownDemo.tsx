'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Database } from '../../../../types/supabase';
import PieChart from '../../../components/charts/PieChart';
import PieSegmentInsights from '../../../components/charts/PieSegmentInsights';
import { PieSegment } from '../../../components/charts/types';
import ChartControls from '../../../components/chart-controls';
import { calculateDateRange, calculateAllTimeRange } from '../../../components/charts/utils';

type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Assignment = Database['public']['Tables']['assignments']['Row'];

export default function SpendingBreakdownDemo() {
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

    // Pie chart state
    const [selectedPieSegment, setSelectedPieSegment] = useState<PieSegment | null>(null);

    // Fetch data from Supabase
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setLoading(false);
                return; // Don't throw error in docs - just show empty state
            }

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
            // Don't show toast errors in docs
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Get available groups for filtering
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
        setSelectedPieSegment(null);
    };

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
        }

        // Close the insights panel
        setSelectedPieSegment(null);
    };

    const handleSetComparisonPeriod = (start: Date, end: Date) => {
        setTimeRange('custom');
        setCustomStartDate(start);
        setCustomEndDate(end);
        setSelectedPieSegment(null);
    };

    if (loading) {
        return (
            <div className="bg-white/[.02] rounded-lg border border-white/[.05] p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-white/[.02] rounded-lg border border-white/[.05] p-6">
                <div className="text-center text-white/60 py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                            <path d="M3 3V21H21V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Demo Requires Transaction Data</h3>
                    <p className="text-sm max-w-md mx-auto">
                        To see the interactive spending breakdown chart, you'll need to add some transactions first.
                    </p>
                </div>
            </div>
        );
    }

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
        <div className="bg-white/[.02] rounded-lg border border-white/[.05] p-4 md:p-6 space-y-6">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-green mb-2">🔴 Live Demo: Spending Breakdown Chart</h3>
                <p className="text-white/70 text-sm">
                    This is your actual spending breakdown chart. Click on any segment to see the detailed insights described in this guide.
                </p>
            </div>

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
            />

            {/* Pie Chart Section */}
            {selectedPieSegment ? (
                // Layout with insights panel - pie chart takes 2/3 width
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    <div className="lg:col-span-2 flex flex-col">
                        <PieChart
                            transactions={transactions}
                            categories={categories}
                            dateRange={dateRange}
                            timeRange={timeRange}
                            selectedGroups={selectedGroups}
                            selectedCategories={selectedCategories}
                            onSegmentClick={handlePieSegmentClick}
                            showTooltip={!selectedPieSegment}
                            matchHeight={!!selectedPieSegment}
                        />
                    </div>
                    <div className="lg:col-span-1 flex flex-col">
                        <PieSegmentInsights
                            filterType={selectedPieSegment.type}
                            filterId={selectedPieSegment.id}
                            filterLabel={selectedPieSegment.label}
                            filterColor={selectedPieSegment.color}
                            transactions={transactions}
                            categories={categories}
                            dateRange={dateRange}
                            timeRange={timeRange}
                            onClose={handleClosePieInsights}
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
                        timeRange={timeRange}
                        selectedGroups={selectedGroups}
                        selectedCategories={selectedCategories}
                        onSegmentClick={handlePieSegmentClick}
                        showTooltip={!selectedPieSegment}
                        matchHeight={!!selectedPieSegment}
                    />
                </div>
            )}

            <div className="text-center pt-4 border-t border-white/[.05]">
                <p className="text-white/50 text-xs">
                    💡 Click on any segment of the pie chart above to see detailed insights and comparison tools
                </p>
            </div>
        </div>
    );
}
