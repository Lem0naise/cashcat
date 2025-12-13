'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Database } from '../../../types/supabase';
import { calculateDateRange, calculateAllTimeRange } from '../../components/charts/utils';
import ChartControls from '../../components/chart-controls';
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
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
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
                                />

                                {/* Mobile view controls */}
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
