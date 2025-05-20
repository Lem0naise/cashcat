'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast, { Toaster } from 'react-hot-toast';
import type { Database } from '@/types/supabase';
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import MobileNav from "../components/mobileNav";
import ManageBudgetModal from "../components/manage-budget-modal";
import CategoryCard from '../features/Category';
import ProtectedRoute from '../components/protected-route';
type CategoryFromDB = Database['public']['Tables']['categories']['Row'];
type Assignment = Database['public']['Tables']['assignments']['Row'];

type Category = {
    id: CategoryFromDB['id'];
    name: CategoryFromDB['name'];
    assigned: number;
    spent: number;
    goalAmount: CategoryFromDB['goal'];
    group: string;
    rollover: Assignment['rollover'];
};

export default function Budget() {
    const router = useRouter();
    const supabase = createClientComponentClient<Database>();
    const [categories, setCategories] = useState<Category[]>([]);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [monthString, setMonthString] = useState(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
    const [activeGroup, setActiveGroup] = useState<string>('All');
    const [showManageModal, setShowManageModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balanceInfo, setBalanceInfo] = useState<{ budgetPool: number; assigned: number } | null>(null);
    const [wasMassAssigningSoShouldClose, setwasMassAssigningSoShouldClose] = useState(false);
    const [isMassAssigning, setIsMassAssigning] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    // Update month string when current month changes
    useEffect(() => {
        const newMonthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        setMonthString(newMonthString);
        fetchBudgetData(); // Fetch new data when month changes
    }, [currentMonth]);

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

            // Format current month for assignments query
            const queryMonthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            setMonthString(queryMonthString);

            // Fetch categories, transactions, and assignments in parallel
            const [categoriesResponse, transactionsResponse, assignmentsResponse] = await Promise.all([
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
                    .select('amount, category_id, type')
                    .eq('user_id', user.id)
                    .gte('date', startDate)
                    .lte('date', endDate),
                supabase
                    .from('assignments')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('month', queryMonthString)
            ]);

            if (categoriesResponse.error) throw categoriesResponse.error;
            if (transactionsResponse.error) throw transactionsResponse.error;
            if (assignmentsResponse.error) throw assignmentsResponse.error;

            const categoriesData = categoriesResponse.data;
            const transactionsData = transactionsResponse.data;
            const assignmentsData = assignmentsResponse.data;
        
            console.log(assignmentsData);
            console.log(monthString);

            let startingBalance = 0;
            let totalIncome = 0;
            // Calculate spent amounts for each category
            const spentByCategory: { [key: string]: number } = {};
            transactionsData?.forEach(transaction => {
                if (!spentByCategory[transaction.category_id]) {
                    spentByCategory[transaction.category_id] = 0;
                }
                if (transaction.type == 'starting') {startingBalance = transaction.amount;}
                if (transaction.type == 'income') {totalIncome += transaction.amount;}
                // Only include negative amounts (expenses) in spent calculation
                spentByCategory[transaction.category_id] += Math.abs(transaction.amount);
            });

            // Create a map of assignments by category ID
            const assignmentsByCategory = assignmentsData.reduce((acc, assignment) => {
                acc[assignment.category_id] = assignment;
                return acc;
            }, {} as Record<string, typeof assignmentsData[0]>);

            // Update categories with spent amounts, assignments, and group names
            // Calculate total balance for current month (copied from transactions page logic)
            const totalBalance = transactionsData?.reduce((total, transaction) => total + transaction.amount, 0) || 0;

            // Calculate categories with assignments
            const categoriesWithSpent = categoriesData.map(category => {
                const assignment = assignmentsByCategory[category.id];
                return {
                    id: category.id,
                    name: category.name,
                    assigned: assignment?.assigned ?? 0,
                    spent: spentByCategory[category.id] || 0,
                    goalAmount: category.goal || 0,
                    group: category.groups?.name || 'Uncategorized',
                    rollover: assignment?.rollover ?? 0
                };
            });
            // Calculate total assigned amount 
            const totalAssigned = categoriesWithSpent.reduce((total, cat) => total + cat.assigned, 0);
            const totalBudgetPoolThisMonth = startingBalance + totalIncome; // to implement

            // Update balance info
            setBalanceInfo({
                budgetPool: totalBudgetPoolThisMonth,
                assigned: totalAssigned
            });
            
            setCategories(categoriesWithSpent);
            setError(null);
        } catch (error) {
            console.error('Error fetching budget data:', error);
            setError('Failed to load budget data');
            
            
        } finally {
            setLoading(false);
        }
    }, [currentMonth, supabase]); // Include all dependencies


    const handleAssignmentUpdate = async (categoryId: string, newAmount: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Calculate the new total assigned amount before making the API call
            const updatedCategories = categories.map(cat => 
                cat.id === categoryId ? { ...cat, assigned: newAmount } : cat
            );
            const newTotalAssigned = updatedCategories.reduce((total, cat) => total + cat.assigned, 0);

            // Update local state immediately
            setCategories(updatedCategories);
            if (balanceInfo) {
                setBalanceInfo({
                    ...balanceInfo,
                    assigned: newTotalAssigned
                });
            }

            const promise = (async () => {
                const { error } = await supabase
                    .from('assignments')
                    .upsert({
                        category_id: categoryId,
                        month: monthString,
                        assigned: newAmount,
                        user_id: user.id
                    }, {onConflict: 'category_id,month'});
                if (error) throw error;
            })();

            await toast.promise(promise, {
                loading: 'Updating assignment...',
                success: 'Updated category assignment successfully!',
                error: 'Failed to update assignment'
            });
        } catch (error) {
            console.error('Error updating assignment:', error);
            // Revert the local state changes on error
            setCategories(cats => cats.map(cat => 
                cat.id === categoryId ? { ...cat, assigned: cat.assigned } : cat
            ));
            if (balanceInfo) {
                const currentTotalAssigned = categories.reduce((total, cat) => total + cat.assigned, 0);
                setBalanceInfo({
                    ...balanceInfo,
                    assigned: currentTotalAssigned
                });
            }
            throw error;
        }
    };

    const updateCategoriesInMass = async () => {
        let updatedCategories = [...categories];

        try {
            // Start by collecting all changes to make
            const changes = new Map();
            
            // Get categories from the active group only
            const targetCategories = activeGroup === 'All' 
                ? categories 
                : categories.filter(cat => cat.group === activeGroup);

            // Handle different mass actions
            if (pendingAction === 'fill-goals') {
                targetCategories.forEach(category => {
                    const goal = category.goalAmount || 0;
                    if (goal > category.assigned) {
                        changes.set(category.id, goal);
                    }
                });
            } else if (pendingAction === 'clear') {
                targetCategories.forEach(category => {
                    changes.set(category.id, 0);
                });
            } else {
                // Handle manual input changes
                const categoryInputs = document.querySelectorAll('input[data-category-id]') as NodeListOf<HTMLInputElement>;
                categoryInputs.forEach(input => {
                    const name = input.dataset.categoryId;
                    if (!name) return;
                    
                    const category = categories.find(c => c.name === name);
                    if (!category) return;
                    
                    const newAmount = parseFloat(input.value);
                    if (!isNaN(newAmount) && newAmount !== category.assigned) {
                        changes.set(category.id, newAmount);
                    }
                });
            }

            // If there are no changes, exit early
            if (changes.size === 0) {
                return;
            }

            // Update local state first for immediate feedback
            updatedCategories = categories.map(cat => {
                const newAmount = changes.get(cat.id);
                return newAmount !== undefined ? { ...cat, assigned: newAmount } : cat;
            });

            // Update UI state immediately
            const newTotalAssigned = updatedCategories.reduce((total, cat) => total + cat.assigned, 0);
            setCategories(updatedCategories);
            if (balanceInfo) {
                setBalanceInfo({
                    ...balanceInfo,
                    assigned: newTotalAssigned
                });
            }

            // Prepare all database updates
            const updates = Array.from(changes.entries()).map(([categoryId, amount]) => 
                handleAssignmentUpdate(categoryId, amount)
            );

            // Execute all updates in parallel
            if (updates.length > 0) {
                const actionDesc = pendingAction === 'fill-goals' ? 'Filling goals' 
                    : pendingAction === 'clear' ? 'Clearing assignments' 
                    : 'Updating assignments';

                await toast.promise(Promise.all(updates), {
                    loading: `${actionDesc}...`,
                    success: 'All updates completed successfully!',
                    error: 'Failed to complete some updates'
                });
            }

            // After successful update, refetch data to ensure consistency
            await fetchBudgetData();

        } catch (error) {
            console.error('Error updating assignments:', error);
            // On error, refresh data to ensure consistency
            await fetchBudgetData();
            throw error;
        }
    };

    const massAssign = async () => {
        if (isMassAssigning) {
            try {
                await updateCategoriesInMass();
            } finally {
                setIsMassAssigning(false);
                setPendingAction(null);
            }
        } else {
            setIsMassAssigning(true);
            setwasMassAssigningSoShouldClose(true);
        }
    };

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

                <main className="pt-4 md:pt-16 pb-28 md:pb-6 md:pl-64 p-6 fade-in">
                    <div className="max-w-7xl mx-auto">
                        <div className="md:flex hidden items-center mb-8 md:mt-5">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold tracking-[-.01em]">Budget</h1>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={goToPreviousMonth}
                                        className="flex-shrink-0 p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                                    >   
                                        <Image
                                            src="/chevron-left.svg"
                                            alt="Previous month"
                                            width={36}
                                            height={36}
                                            className="opacity-70"
                                        />
                                    </button>
                                    <h2 className="text-lg font-medium min-w-[140px] text-center">
                                        {formatMonth(currentMonth)}
                                    </h2>
                                    <button 
                                        onClick={goToNextMonth}
                                        className="flex-shrink-0 p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                                    >
                                        <Image
                                            src="/chevron-right.svg"
                                            alt="Next month"
                                            width={36}
                                            height={36}
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
                                    <p className="hidden lg:inline">Manage Budget</p>
                                </button>
                            </div>
                        </div>

                        {/* Balance Assignment Info */}
                        {balanceInfo && (
                            <div 
                                className={`rounded-lg overflow-hidden transition-all duration-200 ${
                                    balanceInfo.budgetPool == balanceInfo.assigned ? ('h-[0px] pb-0') : (balanceInfo.budgetPool > balanceInfo.assigned 
                                    ? 'bg-green/10 text-green border-b-4 border-b-green h-[64px] md:pb-6 mb-6' 
                                    : 'bg-reddy/10 text-reddy border-b-4 border-b-reddy h-[64px] md:pb-6 mb-6') 
                                } ${isMassAssigning ? 'h-[108px]' : ''}
                                `}
                            onClick={isMassAssigning ? ()=>{} : massAssign}>
                                <div className="p-4 flex justify-between items-center">
                                    <div>
                                        {balanceInfo.budgetPool > balanceInfo.assigned ? (
                                            <p className="font-medium">
                                                <span className="text-lg inline">£{(balanceInfo.budgetPool - balanceInfo.assigned).toFixed(2)}</span> left this month
                                            </p>
                                        ) : (
                                            <p className="font-medium">
                                                <span className="text-lg inline">£{(balanceInfo.assigned - balanceInfo.budgetPool).toFixed(2)}</span> too much assigned
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={massAssign}
                                        className={`px-4 py-1 rounded-full ${balanceInfo.budgetPool > balanceInfo.assigned ? 'bg-green' : 'bg-reddy'} text-background text-sm font-medium hover:bg-green/90 transition-colors`}
                                    >
                                        {isMassAssigning ? 'Done' : (balanceInfo.budgetPool > balanceInfo.assigned ? 'Assign' : 'Fix Now')}
                                    </button>
                                </div>
                                
                                <div 
                                    className={`px-4 pb-4 flex gap-2 transition-all duration-200 ${
                                        isMassAssigning 
                                        ? 'opacity-100 transform translate-y-0' 
                                        : 'opacity-0 transform -translate-y-2 pointer-events-none'
                                    }`}
                                >
                                    <button
                                        className={`px-4 py-1 rounded-full text-sm transition-colors ${
                                            pendingAction === 'fill-goals' 
                                            ? 'bg-green text-background' 
                                            : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                        onClick={() => setPendingAction(
                                            pendingAction === 'fill-goals' ? null : 'fill-goals'
                                        )}
                                    >
                                        Fill This Group
                                    </button>
                                    <button
                                        className={`px-4 py-1 rounded-full text-sm transition-colors ${
                                            pendingAction === 'clear' 
                                            ? 'bg-reddy text-background' 
                                            : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                        onClick={() => setPendingAction(
                                            pendingAction === 'clear' ? null : 'clear'
                                        )}
                                    >
                                        Empty This Group
                                    </button>
                                </div>
                            </div>
                        )}

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
                        ) : categories.length === 0 ? (
                            <div className="text-center text-white/60 mt-5 max-w-md mx-auto">
                                <Image
                                    src="/transactions.svg"
                                    alt="No budget categories"
                                    width={48}
                                    height={48}
                                    className="image-black opacity-40 mx-auto mb-4"
                                />
                                <h2 className="text-2xl font-semibold mb-2">Welcome to CashCat!</h2>
                                <div className="bg-white/[.03] rounded-lg p-6 mb-2 backdrop-blur-sm">
                                    <h3 className="text-lg font-medium text-green mb-4">Get Started in 3 Steps:</h3>
                                    <ul className="inline-block text-left list-disc list-inside space-y-3 text-base">
                                        <li className="opacity-90">Create your budget</li>
                                        <li className="opacity-90">Log your first transaction</li>
                                        <li className="opacity-90">View your stats</li>
                                    </ul>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => router.push('/learn')}
                                        className="bg-green text-black px-6 py-3 rounded-lg hover:bg-green-dark transition-colors text-sm font-medium sm:order-none"
                                    >
                                        Learn the Basics
                                    </button>
                                    <button
                                        onClick={() => setShowManageModal(true)}
                                        className="px-6 py-3 rounded-lg border border-white/20 hover:bg-white/[.05] transition-colors text-sm font-medium text-white/90"
                                    >
                                        Create Your First Budget
                                    </button>
                                    
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
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
                                        rollover={category.rollover}
                                        spent={category.spent}
                                        goalAmount={category.goalAmount}
                                        group={category.group}
                                        showGroup={activeGroup === 'All'}
                                        forceFlipMassAssign={isMassAssigning}
                                        wasMassAssigningSoShouldClose={wasMassAssigningSoShouldClose}
                                        onAssignmentUpdate={(amount) => handleAssignmentUpdate(category.id, amount)}
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
