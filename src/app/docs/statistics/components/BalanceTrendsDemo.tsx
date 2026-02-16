'use client';

import { createClient } from '@/app/utils/supabase';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Database } from '../../../../types/supabase';
import BudgetAssignmentChart from '../../../components/BudgetAssignmentChartRefactored';
import ChartControls from '../../../components/chart-controls';
import { calculateDateRange, calculateAllTimeRange } from '../../../components/charts/utils';

type Assignment = Database['public']['Tables']['assignments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function BalanceTrendsDemo() {
    const supabase = createClient();
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

    if (loading) {
        return (
            <div className="bg-white/[.02] rounded-lg border border-white/[.05] p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <div className="bg-white/[.02] rounded-lg border border-white/[.05] p-6">
                <div className="text-center text-white/60 py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[.05] flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/40">
                            <path d="M3 3V21H21V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Demo Requires Data</h3>
                    <p className="text-sm max-w-md mx-auto">
                        To see the interactive balance trends chart, you'll need to add some budget assignments and transactions first.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/[.02] rounded-lg border border-white/[.05] p-4 md:p-6 space-y-6">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-green mb-2">🔴 Live Demo: Balance Trends Chart</h3>
                <p className="text-white/70 text-sm">
                    This is your actual balance trends chart. Try the controls below to explore the features described in this guide.
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

            {/* Balance Trends Chart */}
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

            <div className="text-center pt-4 border-t border-white/[.05]">
                <p className="text-white/50 text-xs">
                    💡 Try dragging across the chart above to see the comparison analysis features in action
                </p>
            </div>
        </div>
    );
}
