'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '../../types/supabase';
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import MobileNav from "../components/mobileNav";
import ManageBudgetModal from "../components/manage-budget-modal";
import CategoryCard from '../features/Category';
import ProtectedRoute from '../components/protected-route';

type Category = {
    id: string;
    name: string;
    assigned: number;
    spent: number;
    goalAmount: number;
    group: string;
};

export default function Budget() {
    const supabase = createClientComponentClient<Database>();
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeGroup, setActiveGroup] = useState<string>('All');
    const [showManageModal, setShowManageModal] = useState(false);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            month: 'long',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    // Memoize fetchBudgetData to prevent unnecessary recreations
    const fetchBudgetData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            // Get first and last day of the selected month
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            // Format dates for database query
            const startDate = firstDay.toISOString().split('T')[0];
            const endDate = lastDay.toISOString().split('T')[0];

            // Fetch categories and transactions in parallel
            const [categoriesResponse, transactionsResponse] = await Promise.all([
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
                    .select('amount, category_id')
                    .eq('user_id', user.id)
                    .gte('date', startDate)
                    .lte('date', endDate)
            ]);

            if (categoriesResponse.error) throw categoriesResponse.error;
            if (transactionsResponse.error) throw transactionsResponse.error;

            const categoriesData = categoriesResponse.data;
            const transactionsData = transactionsResponse.data;

            // Calculate spent amounts for each category
            const spentByCategory: { [key: string]: number } = {};
            transactionsData?.forEach(transaction => {
                if (!spentByCategory[transaction.category_id]) {
                    spentByCategory[transaction.category_id] = 0;
                }
                // Only include negative amounts (expenses) in spent calculation
                if (transaction.amount < 0) {
                    spentByCategory[transaction.category_id] += Math.abs(transaction.amount);
                }
            });

            // Update categories with spent amounts and group names
            const categoriesWithSpent = categoriesData.map(category => ({
                id: category.id,
                name: category.name,
                assigned: category.assigned || 0,
                spent: spentByCategory[category.id] || 0,
                goalAmount: category.goal || 0,
                group: category.groups?.name || 'Uncategorized' // Use the group name from the joined data
            }));

            console.log(categoriesWithSpent);

            setCategories(categoriesWithSpent);
            setError(null);
        } catch (error) {
            console.error('Error fetching budget data:', error);
            setError('Failed to load budget data');
            
            if (process.env.NODE_ENV === 'development') {
                setCategories([
                    // Essentials
                    {id:'1', name:'Rent', assigned: 460.34, spent: 0, goalAmount: 800, group: 'Essentials'},
                    {id:'2', name:'Utilities', assigned: 150, spent: 120.50, goalAmount: 150, group: 'Essentials'},
                    {id:'3', name:'Groceries', assigned: 400, spent: 292.40, goalAmount: 400, group: 'Essentials'},
                    {id:'4', name:'Transport', assigned: 80, spent: 95.60, goalAmount: 80, group: 'Essentials'},
                    
                    // Food & Dining
                    {id:'5', name:'Takeouts', assigned: 90, spent: 122.63, goalAmount: 90, group: 'Food & Dining'},
                    {id:'6', name:'Restaurants', assigned: 120, spent: 85.20, goalAmount: 150, group: 'Food & Dining'},
                    {id:'7', name:'Coffee Shops', assigned: 45, spent: 38.40, goalAmount: 50, group: 'Food & Dining'},
                    
                    // Savings & Goals
                    {id:'8', name:'Emergency Fund', assigned: 3000, spent: 0, goalAmount: 5000, group: 'Savings & Goals'},
                    {id:'9', name:'Holiday', assigned: 800, spent: 0, goalAmount: 1200, group: 'Savings & Goals'},
                    {id:'10', name:'New Laptop', assigned: 600, spent: 0, goalAmount: 1500, group: 'Savings & Goals'},
                    
                    // Entertainment
                    {id:'11', name:'Streaming', assigned: 30, spent: 30, goalAmount: 30, group: 'Entertainment'},
                    {id:'12', name:'Gaming', assigned: 35, spent: 29.99, goalAmount: 40, group: 'Entertainment'},
                    {id:'13', name:'Movies', assigned: 40, spent: 32.00, goalAmount: 50, group: 'Entertainment'},
                    
                    // Health & Wellness
                    {id:'14', name:'Gym', assigned: 35, spent: 35.00, goalAmount: 35, group: 'Health & Wellness'},
                    {id:'15', name:'Healthcare', assigned: 80, spent: 25.00, goalAmount: 100, group: 'Health & Wellness'},
                ]);
            }
        } finally {
            setLoading(false);
        }
    }, [currentMonth, supabase]); // Include all dependencies

    useEffect(() => {
        fetchBudgetData();
    }, [fetchBudgetData]); // Only depend on the memoized function

    const groups = ['All', ...new Set(categories.map(cat => cat.group))];
    const filteredCategories = activeGroup === 'All' 
        ? categories 
        : categories.filter(cat => cat.group === activeGroup);

    return(
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <div className="hidden md:block"><Navbar /></div>
                <Sidebar />
                <MobileNav />
                

                {/* Mobile month switcher and manage button */}
                <div className="flex md:hidden z-50 items-center border-b border-white/[.2] min-w-screen">
                    <div className="w-14">
                        {/* Space for future button */}
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center">
                            <button 
                                onClick={goToPreviousMonth}
                                className="p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                            >
                                <Image
                                    src="/chevron-left.svg"
                                    alt="Previous month"
                                    width={36}
                                    height={36}
                                    className="opacity-90"
                                />
                            </button>
                            <h2 className="text-base font-medium min-w-[120px] text-center text-lg">
                                {formatMonth(currentMonth)}
                            </h2>
                            <button 
                                onClick={goToNextMonth}
                                className="p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                            >
                                <Image
                                    src="/chevron-right.svg"
                                    alt="Next month"
                                    width={36}
                                    height={36}
                                    className="opacity-90"
                                />
                            </button>
                        </div>
                    </div>
                    <div className="w-14 flex justify-end">
                        <button 
                            onClick={() => setShowManageModal(true)}
                            className="flex gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                        >
                            <Image
                                src="/settings.svg"
                                alt="Manage budget"
                                width={20}
                                height={20}
                                className="opacity-70"
                            />
                        </button>
                    </div>
                </div>


                <main className="pt-4 md:pt-16 pb-28 md:pb-6 md:pl-64 p-6 fade-in">
                    <div className="max-w-7xl mx-auto">
                        <div className="md:flex hidden items-center mb-8 md:mt-5">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold tracking-[-.01em]">Money</h1>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={goToPreviousMonth}
                                        className="p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                                    >
                                        <Image
                                            src="/chevron-left.svg"
                                            alt="Previous month"
                                            width={24}
                                            height={24}
                                            className="opacity-70"
                                        />
                                    </button>
                                    <h2 className="text-lg font-medium min-w-[140px] text-center">
                                        {formatMonth(currentMonth)}
                                    </h2>
                                    <button 
                                        onClick={goToNextMonth}
                                        className="p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                                    >
                                        <Image
                                            src="/chevron-right.svg"
                                            alt="Next month"
                                            width={24}
                                            height={24}
                                            className="opacity-70"
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex justify-end">
                                <button
                                    onClick={() => setShowManageModal(true)}
                                    className="bg-primary hover:bg-white/[.05] px-4 py-2 rounded-lg flex items-center gap-2 opacity-70 hover:opacity-100 transition-all"
                                >
                                    <Image
                                        src="/settings.svg"
                                        alt="Manage budget"
                                        width={16}
                                        height={16}
                                        className="opacity-90"
                                    />
                                    Manage Budget
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto hide-scrollbar -mx-6 px-6 mb-6 bg-gradient-to-r from-black-500/10 to-black-500/100">
                            <div className="flex gap-2 min-w-max">
                                {groups.map((group) => (
                                    <button
                                        key={group}
                                        onClick={() => setActiveGroup(group)}
                                        className={`px-4 py-2 rounded-full text-sm transition-all ${
                                            activeGroup === group
                                                ? 'bg-green text-background'
                                                : 'bg-white/15 hover:bg-white/[.05]'
                                        }`}
                                    >
                                        {group}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-reddy/20 text-reddy p-4 rounded-lg">
                                {error}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {filteredCategories.map((category) => (
                                    <div key={category.id}
                                    className="transform transition-all hover:scale-[1.01] hover:shadow-md"
                                    style={{ 
                                        animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards'
                                    }}
                                    >
                                    <CategoryCard
                                        name={category.name}
                                        assigned={category.assigned}
                                        spent={category.spent}
                                        goalAmount={category.goalAmount}
                                        group={category.group}
                                        showGroup={activeGroup === 'All'}
                                    />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                <ManageBudgetModal
                  isOpen={showManageModal}
                  onClose={() => (fetchBudgetData(), setShowManageModal(false))}
                />
            </div>
        </ProtectedRoute>
    );
}
