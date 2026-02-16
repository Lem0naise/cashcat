'use client';

import type { Database } from '@/types/supabase';
import { createClient } from '@/app/utils/supabase';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ManageBudgetModal from "../components/manage-budget-modal";
import MobileNav from "../components/mobileNav";
import Navbar from "../components/navbar";
import ProtectedRoute from '../components/protected-route';
import Sidebar from "../components/sidebar";
import CategoryCard from '../features/Category';
import AccountModal from '../components/account-modal';
import { getCachedUserId } from '../hooks/useAuthUserId';
import Link from 'next/link';
// TanStack Query hooks for offline-first data
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAssignments } from '../hooks/useAssignments';
import { useUpdateAssignment } from '../hooks/useUpdateAssignment';
import { useSyncAll } from '../hooks/useSyncAll';

type CategoryFromDB = Database['public']['Tables']['categories']['Row'];
type Assignment = Database['public']['Tables']['assignments']['Row'];

type Category = {
    id: CategoryFromDB['id'];
    name: CategoryFromDB['name'];
    assigned: number;
    spent: number;
    goalAmount: CategoryFromDB['goal'];
    group: string;
    rollover: number;
    available: number;
    dailyLeft?: number; // Amount available per day for rest of month
};


const EMPTY_ARRAY: any[] = [];

export default function Budget() {
    const router = useRouter();
    const supabase = createClient();

    const { data: allTransactionsData = EMPTY_ARRAY, isLoading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useTransactions();
    const { data: rawCategoriesData = EMPTY_ARRAY, isLoading: categoriesLoading, refetch: refetchCategories } = useCategories();
    const { data: allAssignmentsData = EMPTY_ARRAY, isLoading: assignmentsLoading, refetch: refetchAssignments } = useAssignments();
    const updateAssignmentMutation = useUpdateAssignment();
    const { syncAll, isSyncing } = useSyncAll();

    // ... (state definitions)



    // ...

    // In handleAssignmentUpdate


    // ...

    // Modals
    // onClose={() => {setShowAccountModal(false); refreshData()}}

    const [categories, setCategories] = useState<Category[]>([]);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [monthString, setMonthString] = useState(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
    const [activeGroup, setActiveGroup] = useState<string>('All');
    const [showManageModal, setShowManageModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    // Combine all loading states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balanceInfo, setBalanceInfo] = useState<{ budgetPool: number; assigned: number } | null>(null);
    const [wasMassAssigningSoShouldClose, setwasMassAssigningSoShouldClose] = useState(false);
    const [isMassAssigning, setIsMassAssigning] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [hideBudgetValues, setHideBudgetValues] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [showOverspentAlert, setShowOverspentAlert] = useState(false);
    const [reminderText, setReminderText] = useState<string>('');
    const [reminderLoading, setReminderLoading] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

    // Draft assignments for mass assign mode (categoryId -> drafted amount)
    const [draftAssignments, setDraftAssignments] = useState<Map<string, number>>(new Map());

    // Compute the total draft difference from current assignments
    const draftDifference = useMemo(() => {
        let diff = 0;
        draftAssignments.forEach((draftAmount, catId) => {
            const cat = categories.find(c => c.id === catId);
            if (cat) {
                diff += draftAmount - cat.assigned;
            }
        });
        return diff;
    }, [draftAssignments, categories]);

    // Live "left to assign" that updates as user types during mass assign
    const draftLeftToAssign = useMemo(() => {
        if (!balanceInfo) return 0;
        const currentLeftToAssign = balanceInfo.budgetPool - balanceInfo.assigned;
        return currentLeftToAssign - draftDifference;
    }, [balanceInfo, draftDifference]);

    // Calculate underfunded amount for each category (considering rollover)
    // A category is underfunded if goal > (assigned + rollover), meaning it actually needs more
    const getUnderfundedAmount = useCallback((cat: Category): number => {
        if (!cat.goalAmount || cat.goalAmount <= 0) return 0;
        const currentFunded = cat.assigned + cat.rollover;
        const needed = cat.goalAmount - currentFunded;
        return needed > 0 ? Math.round(needed * 100) / 100 : 0;
    }, []);

    // Get underfunded amount considering draft assignments
    const getDraftUnderfundedAmount = useCallback((cat: Category): number => {
        if (!cat.goalAmount || cat.goalAmount <= 0) return 0;
        const draftAmount = draftAssignments.get(cat.id) ?? cat.assigned;
        const currentFunded = draftAmount + cat.rollover;
        const needed = cat.goalAmount - currentFunded;
        return needed > 0 ? Math.round(needed * 100) / 100 : 0;
    }, [draftAssignments]);

    // Get all underfunded categories
    const getUnderfundedCategories = useCallback(() => {
        return categories.filter(cat => getUnderfundedAmount(cat) > 0);
    }, [categories, getUnderfundedAmount]);

    // Total amount needed to fund all underfunded categories
    const totalUnderfundedAmount = useMemo(() => {
        return categories.reduce((sum, cat) => sum + getDraftUnderfundedAmount(cat), 0);
    }, [categories, getDraftUnderfundedAmount]);






    const calculateRolloverForCategory = useCallback((
        categoryId: string,
        targetMonth: string,
        allAssignments: Assignment[]
    ): number => {
        if (!categoryId) return 0;

        const categoryAssignments = allAssignments.filter(a => a.category_id === categoryId);

        // Find earliest month from assignments
        const earliestAssignmentMonth = categoryAssignments.length > 0
            ? categoryAssignments.reduce((earliest, a) => a.month < earliest ? a.month : earliest, categoryAssignments[0].month)
            : null;

        // Determine the actual start month
        let startMonth = earliestAssignmentMonth;

        if (!startMonth || startMonth >= targetMonth) return 0;

        let currentDate = new Date(startMonth + '-01');
        currentDate.setDate(1);

        let rollover = 0;

        while (true) {
            const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthStr >= targetMonth) break;

            const assignment = allAssignments.find(a => a.category_id === categoryId && a.month === monthStr);
            const assigned = assignment?.assigned || 0;

            // Reverted to direct filtering for maximum accuracy
            const monthStart = monthStr + '-01';
            const nextMonthDate = new Date(monthStart);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            const monthEnd = new Date(nextMonthDate.getTime() - 1).toISOString().split('T')[0];

            const monthSpent = allTransactionsData
                ? allTransactionsData
                    .filter(t => t.category_id === categoryId &&
                        t.date >= monthStart &&
                        t.date <= monthEnd &&
                        t.type === 'payment')
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                : 0;

            rollover = rollover + assigned - monthSpent;

            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1);
        }

        return rollover;
    }, [allTransactionsData]);

    // Helper function to calculate days remaining in current month
    const getDaysRemainingInMonth = useCallback((date: Date = currentMonth): number => {
        const today = new Date();
        const currentDate = new Date(date.getFullYear(), date.getMonth(), today.getDate());
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // If we're viewing a future month, return total days in that month
        if (date.getMonth() > today.getMonth() || date.getFullYear() > today.getFullYear()) {
            return lastDayOfMonth.getDate();
        }

        // If we're viewing a past month, return 0
        if (date.getMonth() < today.getMonth() || date.getFullYear() < today.getFullYear()) {
            return 0;
        }

        // For current month, calculate remaining days including today
        const daysRemaining = lastDayOfMonth.getDate() - today.getDate() + 1;
        return Math.max(0, daysRemaining);
    }, [currentMonth]);


    // Only fetch assignments, categories, and reminder for the current month
    const calculateBudgetData = useCallback(async (queryMonthString: string) => {
        try {
            // No need to set loading=true here if we are already handling it via the useEffect check
            // checking !transactionsLoading etc.

            // Derive data from cache instead of fetching
            const categoriesData = rawCategoriesData;
            const allAssignments = allAssignmentsData;

            // Filter assignments for current month
            const assignmentsData = allAssignments.filter(a => a.month === queryMonthString);

            // Filter transactions for current month
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
            const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

            const transactionsData = allTransactionsData.filter(t => {
                // Filter by date range
                return t.date >= startDate && t.date <= endDate;
            });

            let startingBalance = 0;
            let totalIncome = 0;
            // Calculate spent amounts for each category
            const spentByCategory: { [key: string]: number } = {};

            // Get starting balance and total income from ALL transactions (cached)
            allTransactionsData?.forEach(transaction => {
                if (transaction.type == 'starting') { startingBalance += transaction.amount; }
                if (transaction.type == 'income') { totalIncome += transaction.amount; }
            });

            // Calculate spending for current month only
            transactionsData?.forEach(transaction => {
                if (!spentByCategory[transaction.category_id]) {
                    spentByCategory[transaction.category_id] = 0;
                }
                // Only include negative amounts (expenses) in spent calculation
                if (transaction.type === 'payment') {
                    spentByCategory[transaction.category_id] += Math.abs(transaction.amount);
                }
            });

            // Create a map of assignments by category ID
            const assignmentsByCategory = assignmentsData.reduce((acc, assignment) => {
                acc[assignment.category_id] = assignment;
                return acc;
            }, {} as Record<string, typeof assignmentsData[0]>);

            // Calculate categories with assignments and rollovers
            const categoriesWithSpent = categoriesData.map(category => {
                const assignment = assignmentsByCategory[category.id];
                // Always use numbers and round to 2 decimals
                const assigned = Math.round((Number(assignment?.assigned ?? 0)) * 100) / 100;
                const spent = Math.round((Number(spentByCategory[category.id] || 0)) * 100) / 100;
                const rollover = Math.round((Number(calculateRolloverForCategory(category.id, queryMonthString, allAssignments || []))) * 100) / 100;
                const available = Math.round((assigned + rollover - spent) * 100) / 100;
                const daysRemaining = getDaysRemainingInMonth();
                const dailyLeft = daysRemaining > 0 ? Math.round((available / daysRemaining) * 100) / 100 : 0;
                return {
                    id: category.id,
                    name: category.name,
                    assigned,
                    spent,
                    goalAmount: category.goal || 0,
                    group: category.groups?.name || category.group || 'Uncategorized',
                    rollover,
                    available,
                    dailyLeft
                };
            });
            // Calculate total actual money available (same as transactions page total balance)
            // Fix: Filter transactions up to the end of the current view month
            const totalActualMoney = allTransactionsData
                ?.filter(t => t.date <= endDate)
                ?.reduce((total, transaction) => total + transaction.amount, 0) || 0;
            // Calculate total available in all categories including future assignments
            const futureAssignments = allAssignments
                ?.filter(assignment => assignment.month > queryMonthString)
                ?.reduce((total, assignment) => total + (assignment.assigned || 0), 0) || 0;

            const totalAvailableInCategories = categoriesWithSpent.reduce((total, cat) => total + cat.available, 0) + futureAssignments;

            // Update balance info - Compare total balance to total available in categories
            setBalanceInfo({
                budgetPool: totalActualMoney,
                assigned: totalAvailableInCategories
            });
            console.log('DEBUG: setBalanceInfo (leftToAssign/overspent):', {
                budgetPool: totalActualMoney,
                assigned: totalAvailableInCategories,
                leftToAssign: totalActualMoney - totalAvailableInCategories
            });

            setCategories(categoriesWithSpent);
            setError(null);
        } catch (error) {
            console.error('Error calculating budget data:', error);
            setError('Failed to load budget data. Please try again in a second.');
        } finally {
            setLoading(false);
        }
    }, [calculateRolloverForCategory, getDaysRemainingInMonth, currentMonth, rawCategoriesData, allAssignmentsData, allTransactionsData]);

    // Helper to refresh all data from server
    const refreshData = async () => {
        await Promise.all([
            refetchTransactions(),
            refetchCategories(),
            refetchAssignments()
        ]);
    };

    // Handle transaction loading errors - only show error if we have NO cached data
    useEffect(() => {
        if (transactionsError && allTransactionsData.length === 0) {
            setError('Failed to load transactions.');
        }
    }, [transactionsError, allTransactionsData]);

    // On month change or data update, recalculate budget
    // BUT only if all data is loaded
    useEffect(() => {
        const newMonthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        setMonthString(newMonthString);

        if (transactionsLoading || categoriesLoading || assignmentsLoading) {
            // If we have cached data, calculate anyway to show it immediately
            const hasData = allTransactionsData.length > 0 || rawCategoriesData.length > 0 || allAssignmentsData.length > 0;
            if (!hasData) {
                setLoading(true);
                return;
            }
        }

        if (allTransactionsData && rawCategoriesData && allAssignmentsData) {
            calculateBudgetData(newMonthString);
        }
    }, [currentMonth, allTransactionsData, rawCategoriesData, allAssignmentsData, transactionsLoading, categoriesLoading, assignmentsLoading, calculateBudgetData]);


    // Listen for hide budget values changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedHideBudgetValues = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('hideBudgetValues') === 'true' : false;
            setHideBudgetValues(savedHideBudgetValues);

            const handleHideBudgetValuesChange = (event: CustomEvent) => {
                setHideBudgetValues(event.detail.hideBudgetValues);
            };

            window.addEventListener('hideBudgetValuesChanged', handleHideBudgetValuesChange as EventListener);
            return () => {
                window.removeEventListener('hideBudgetValuesChanged', handleHideBudgetValuesChange as EventListener);
            };
        }
    }, []);

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

    const goToCurrentMonth = () => {
        setCurrentMonth(new Date());
    };

    // Helper function to determine if we're viewing a past, current, or future month
    const getMonthStatus = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonthNum = today.getMonth();

        const viewingYear = currentMonth.getFullYear();
        const viewingMonthNum = currentMonth.getMonth();

        if (viewingYear < currentYear || (viewingYear === currentYear && viewingMonthNum < currentMonthNum)) {
            return 'past';
        } else if (viewingYear > currentYear || (viewingYear === currentYear && viewingMonthNum > currentMonthNum)) {
            return 'future';
        } else {
            return 'current';
        }
    };



    // Fetch reminder separately
    useEffect(() => {
        const fetchReminder = async () => {
            try {
                setReminderLoading(true);
                const userId = getCachedUserId();
                if (!userId) return;

                const { data, error } = await supabase
                    .from('information')
                    .select('reminder')
                    .eq('user_id', userId)
                    .eq('month', monthString)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching reminder:', error);
                }
                setReminderText(data?.reminder || '');
            } catch (err) {
                // ignore
            } finally {
                setReminderLoading(false);
            }
        };
        fetchReminder();
    }, [monthString, supabase]);


    const handleAssignmentUpdate = async (categoryId: string, newAmount: number, toToast: boolean = true) => {
        try {
            const userId = getCachedUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get current assignment for this category/month to calculate difference
            const { data: currentAssignment } = await supabase
                .from('assignments')
                .select('assigned')
                .eq('category_id', categoryId)
                .eq('month', monthString)
                .eq('user_id', userId)
                .single();

            const currentAssigned = currentAssignment?.assigned || 0;
            const assignmentDifference = newAmount - currentAssigned;

            // Calculate the new total assigned amount before making the API call
            const updatedCategories = categories.map(cat => {
                if (cat.id === categoryId) {
                    // Recalculate available when assigned changes
                    const newAvailable = newAmount + cat.rollover - cat.spent;
                    const daysRemaining = getDaysRemainingInMonth();
                    const dailyLeft = daysRemaining > 0 ? newAvailable / daysRemaining : 0;
                    return { ...cat, assigned: newAmount, available: newAvailable, dailyLeft };
                }
                return cat;
            });

            // Update local state immediately
            setCategories(updatedCategories);
            if (balanceInfo) {
                setBalanceInfo({
                    ...balanceInfo,
                    assigned: balanceInfo.assigned + assignmentDifference // Add the difference to total assigned
                });
            }

            const promise = updateAssignmentMutation.mutateAsync({
                categoryId: categoryId,
                month: monthString,
                assigned: newAmount
            });

            if (toToast) {
                await toast.promise(promise, {
                    loading: 'Updating assignment...',
                    success: 'Updated assignment successfully!',
                    error: 'Failed to update assignment'
                });
            }
        } catch (error) {
            console.error('Error updating assignment:', error);
            // Revert the local state changes on error
            setCategories(cats => cats.map(cat =>
                cat.id === categoryId ? { ...cat, assigned: cat.assigned } : cat
            ));
            // Refresh data to ensure consistency
            if (monthString && allTransactionsData) {
                await calculateBudgetData(monthString);
            }
            throw error;
        }
    };

    // New: balance all overspent categories so their available is 0
    const balanceOverspentCategories = async () => {
        try {
            const overspent = getOverspentCategories();
            if (overspent.length === 0) return;
            // For each overspent category, set assigned = spent - rollover
            const changes = new Map();
            overspent.forEach(cat => {
                const newAssigned = cat.spent - cat.rollover;
                if (newAssigned !== cat.assigned) {
                    changes.set(cat.id, newAssigned);
                }
            });
            if (changes.size === 0) return;
            // Update local state for immediate feedback
            const updatedCategories = categories.map(cat => {
                const newAmount = changes.get(cat.id);
                if (newAmount !== undefined) {
                    const newAvailable = newAmount + cat.rollover - cat.spent;
                    const daysRemaining = getDaysRemainingInMonth();
                    const dailyLeft = daysRemaining > 0 ? newAvailable / daysRemaining : 0;
                    return { ...cat, assigned: newAmount, available: newAvailable, dailyLeft };
                }
                return cat;
            });
            setCategories(updatedCategories);
            // Prepare all database updates
            const updates = Array.from(changes.entries()).map(([categoryId, amount]) =>
                handleAssignmentUpdate(categoryId, amount, false),
            );
            await toast.promise(Promise.all(updates), {
                loading: 'Balancing overspent categories...',
                success: `Balanced ${updates.length} categories!`,
                error: 'Failed to balance some categories'
            });
            // Refetch data to ensure consistency
            if (monthString && allTransactionsData) {
                await calculateBudgetData(monthString);
            }
        } catch (error) {
            console.error('Error balancing overspent categories:', error);
            if (monthString && allTransactionsData) {
                await calculateBudgetData(monthString);
            }
            throw error;
        }
    };

    const updateCategoriesInMass = async () => {
        try {
            // Use draft assignments as the source of changes
            const changes = new Map<string, number>();

            draftAssignments.forEach((draftAmount, catId) => {
                const cat = categories.find(c => c.id === catId);
                if (cat && Math.round(draftAmount * 100) !== Math.round(cat.assigned * 100)) {
                    changes.set(catId, draftAmount);
                }
            });

            // If there are no changes, exit early
            if (changes.size === 0) {
                return;
            }

            // Calculate total assignment difference for balance info update
            let totalDifference = 0;
            for (const [categoryId, newAmount] of changes.entries()) {
                const category = categories.find(c => c.id === categoryId);
                if (category) {
                    totalDifference += newAmount - category.assigned;
                }
            }

            // Update local state first for immediate feedback
            const updatedCategories = categories.map(cat => {
                const newAmount = changes.get(cat.id);
                if (newAmount !== undefined) {
                    const newAvailable = newAmount + cat.rollover - cat.spent;
                    const daysRemaining = getDaysRemainingInMonth();
                    const dailyLeft = daysRemaining > 0 ? newAvailable / daysRemaining : 0;
                    return { ...cat, assigned: newAmount, available: newAvailable, dailyLeft };
                }
                return cat;
            });

            // Update UI state immediately
            setCategories(updatedCategories);
            if (balanceInfo) {
                setBalanceInfo({
                    ...balanceInfo,
                    assigned: balanceInfo.assigned + totalDifference
                });
            }

            // Prepare all database updates
            const updates = Array.from(changes.entries()).map(([categoryId, amount]) =>
                handleAssignmentUpdate(categoryId, amount, false),
            );

            // Execute all updates in parallel
            if (updates.length > 0) {
                await toast.promise(Promise.all(updates), {
                    loading: `Updating ${updates.length} categories...`,
                    success: `Updated ${updates.length} categories successfully!`,
                    error: 'Failed to complete some updates'
                });
            }

            // After successful update, refetch data to ensure consistency
            if (monthString && allTransactionsData) {
                await calculateBudgetData(monthString);
            }

        } catch (error) {
            console.error('Error updating assignments:', error);
            if (monthString && allTransactionsData) {
                await calculateBudgetData(monthString);
            }
            throw error;
        }
    };

    const massAssign = async () => {
        if (isMassAssigning) {
            // Apply: commit draft changes
            try {
                await updateCategoriesInMass();
            } finally {
                setIsMassAssigning(false);
                setPendingAction(null);
                setDraftAssignments(new Map());
            }
        } else {
            // Enter mass assign mode: initialize drafts from current assignments
            const initialDrafts = new Map<string, number>();
            categories.forEach(cat => {
                initialDrafts.set(cat.id, cat.assigned);
            });
            setDraftAssignments(initialDrafts);
            setIsMassAssigning(true);
            setwasMassAssigningSoShouldClose(true);
            // Auto-expand all groups so all categories are visible
            const allGroups = new Set(categories.map(cat => cat.group));
            setExpandedGroups(allGroups);
        }
    };

    const cancelMassAssign = () => {
        setIsMassAssigning(false);
        setPendingAction(null);
        setDraftAssignments(new Map());
        setwasMassAssigningSoShouldClose(true);
    };

    // Quick action: Fill all underfunded categories
    const fillAllUnderfunded = () => {
        const newDrafts = new Map(draftAssignments);
        categories.forEach(cat => {
            const needed = getDraftUnderfundedAmount(cat);
            if (needed > 0) {
                const currentDraft = newDrafts.get(cat.id) ?? cat.assigned;
                newDrafts.set(cat.id, Math.round((currentDraft + needed) * 100) / 100);
            }
        });
        setDraftAssignments(newDrafts);
    };

    // Quick action: Empty all draft assignments to 0
    const emptyAllDrafts = () => {
        const newDrafts = new Map<string, number>();
        categories.forEach(cat => {
            newDrafts.set(cat.id, 0);
        });
        setDraftAssignments(newDrafts);
    };

    // Handle draft change from individual category card
    const handleDraftChange = (categoryId: string, amount: number) => {
        setDraftAssignments(prev => {
            const next = new Map(prev);
            next.set(categoryId, amount);
            return next;
        });
    };

    const expandOverspent = async () => {
        if (!showOverspentAlert) {
            setShowOverspentAlert(true);
            expandOverspentGroups();
        } else {
            setShowOverspentAlert(false);
        }
    }

    const groups = ['All', ...new Set(categories.map(cat => cat.group))];
    const filteredCategories = activeGroup === 'All'
        ? categories
        : categories.filter(cat => cat.group === activeGroup);

    // Group categories by their group
    const groupedCategories = categories.reduce((acc, category) => {
        const groupName = category.group || 'Uncategorized';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(category);
        return acc;
    }, {} as Record<string, Category[]>);

    // Helper function to format currency or return asterisks
    const formatCurrency = (amount: number) => {
        if (hideBudgetValues) return '****';
        return `£${Math.abs(amount).toFixed(2)}`;
    };

    // Helper function to get group totals
    const getGroupTotals = (groupCategories: Category[]) => {
        const totalAssigned = groupCategories.reduce((sum, cat) => sum + cat.assigned, 0);
        const totalRollover = groupCategories.reduce((sum, cat) => sum + cat.rollover, 0);
        const totalSpent = groupCategories.reduce((sum, cat) => sum + cat.spent, 0);
        const totalAvailable = groupCategories.reduce((sum, cat) => sum + cat.available, 0);
        return { totalAssigned, totalRollover, totalSpent, totalAvailable };
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupName)) {
                newSet.delete(groupName);
            } else {
                newSet.add(groupName);
            }
            return newSet;
        });
    };

    const toggleAllGroups = () => {
        const groups = Array.from(new Set(categories.map(cat => cat.group)));
        const allExpanded = groups.every(group => expandedGroups.has(group));

        if (allExpanded) {
            setExpandedGroups(new Set());
        } else {
            setExpandedGroups(new Set(groups));
        }
    };

    // Helper function to get overspent categories
    const getOverspentCategories = () => {
        return categories.filter(cat => cat.available < 0);
    };

    // Helper function to calculate total overspent amount
    const getTotalOverspent = () => {
        return getOverspentCategories().reduce((sum, cat) => sum + Math.abs(cat.available), 0);
    };

    // Helper function to expand groups containing overspent categories
    const expandOverspentGroups = () => {
        const overspentCategories = getOverspentCategories();
        const groupsToExpand = new Set([...expandedGroups]);
        overspentCategories.forEach(cat => {
            groupsToExpand.add(cat.group);
        });
        setExpandedGroups(groupsToExpand);
    };

    // Fetch reminder data
    const fetchReminderData = useCallback(async () => {
        try {
            const userId = getCachedUserId();
            if (!userId) return;

            const { data, error } = await supabase
                .from('information')
                .select('reminder')
                .eq('user_id', userId)
                .eq('month', monthString)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
                console.error('Error fetching reminder:', error);
                return;
            }

            setReminderText(data?.reminder || '');
        } catch (error) {
            console.error('Error fetching reminder data:', error);
        }
    }, [supabase, monthString]);

    // Save reminder data with debouncing
    const saveReminderData = useCallback(async (text: string) => {
        try {
            setReminderLoading(true);
            const userId = getCachedUserId();
            if (!userId) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('information')
                .upsert({
                    user_id: userId,
                    month: monthString,
                    reminder: text || null
                }, {
                    onConflict: 'user_id,month'
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error saving reminder:', error);
            toast.error('Failed to save reminder');
        } finally {
            setReminderLoading(false);
        }
    }, [supabase, monthString]);

    // Handle reminder text change with debounced save
    const handleReminderChange = (text: string) => {
        setReminderText(text);

        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Set new timeout for auto-save
        const newTimeout = setTimeout(() => {
            saveReminderData(text);
        }, 1000); // Save after 1 second of no typing

        setSaveTimeout(newTimeout);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    }, [saveTimeout]);


    const totalAvailable = categories.reduce((sum, cat) => sum + cat.available, 0);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <div className="hidden md:block"><Navbar /></div>
                <Sidebar />
                <MobileNav />


                {/* Mobile month switcher and manage button */}
                <div className="px-3 flex md:hidden z-50 items-center border-b border-white/[.2] min-w-screen py-2">
                    <div className="w-12 flex justify-start">
                        <div className="w-12 flex justify-start">
                            <button
                                onClick={() => syncAll()}
                                disabled={isSyncing}
                                className={`p-1.5 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100 ${isSyncing ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                                <svg className={`${isSyncing ? 'animate-spin' : ''}`} width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g transform="scale(-1, 1) translate(-48, 0)">
                                        <path d="M24 6a18 18 0 1 1-12.73 5.27" stroke="currentColor" strokeWidth="4" />
                                        <path d="M12 4v8h8" stroke="currentColor" strokeWidth="4" />
                                    </g>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center">
                            <button
                                onClick={goToPreviousMonth}
                                className="p-1.5 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                            >
                                <Image
                                    src="/chevron-left.svg"
                                    alt="Previous month"
                                    width={32}
                                    height={32}
                                    className="opacity-90"
                                />
                            </button>
                            <div className="flex flex-col items-center min-w-[120px]">
                                <h2 className="text-base font-medium text-center">
                                    {formatMonth(currentMonth)}
                                </h2>
                                {(currentMonth.getMonth() !== new Date().getMonth() || currentMonth.getFullYear() !== new Date().getFullYear()) && (
                                    <button
                                        onClick={goToCurrentMonth}
                                        className="text-xs text-green hover:text-green-dark transition-colors mt-0.5"
                                    >
                                        Back to Today
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={goToNextMonth}
                                className="p-1.5 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                            >
                                <Image
                                    src="/chevron-right.svg"
                                    alt="Next month"
                                    width={32}
                                    height={32}
                                    className="opacity-90"
                                />
                            </button>
                        </div>
                    </div>
                    <div className="w-12 flex justify-end">
                        <button
                            onClick={() => setShowManageModal(true)}
                            className="flex gap-2 p-1.5 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                        >
                            <Image
                                src="/settings.svg"
                                alt="Manage budget"
                                width={18}
                                height={18}
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

                <main className="pt-2 md:pt-12 pb-24 md:pb-6 
                        sm:ml-20 lg:ml-[max(16.66%,100px)] px-4 md:px-6 fade-in">
                    <div className="max-w-7xl mx-auto md:mt-5">
                        <div className="md:flex hidden items-center mb-6 md:mt-3">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-bold tracking-[-.01em]">Budget</h1>
                            </div>
                            <div className="flex-shrink-0 flex justify-center mx-4 lg:mx-8">
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <button
                                        onClick={goToPreviousMonth}
                                        className="flex-shrink-0 p-1.5 lg:p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                                    >
                                        <Image
                                            src="/chevron-left.svg"
                                            alt="Previous month"
                                            width={32}
                                            height={32}
                                            className="lg:w-9 lg:h-9 opacity-70"
                                        />
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base lg:text-lg font-medium min-w-[100px] lg:min-w-[140px] text-center whitespace-nowrap">
                                            {formatMonth(currentMonth)}
                                        </h2>
                                        {(currentMonth.getMonth() !== new Date().getMonth() || currentMonth.getFullYear() !== new Date().getFullYear()) && (
                                            <button
                                                onClick={goToCurrentMonth}
                                                className="text-xs text-green hover:text-green-dark transition-colors mt-0.5"
                                            >
                                                Back to Today
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={goToNextMonth}
                                        className="flex-shrink-0 p-1.5 lg:p-2 rounded-lg transition-all hover:bg-white/[.05] opacity-70 hover:opacity-100"
                                    >
                                        <Image
                                            src="/chevron-right.svg"
                                            alt="Next month"
                                            width={32}
                                            height={32}
                                            className="lg:w-9 lg:h-9 opacity-70"
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex justify-end gap-2 min-w-0">
                                <button
                                    onClick={() => syncAll()}
                                    disabled={isSyncing}
                                    className={`bg-white/[.05] hover:bg-white/[.1] px-3 lg:px-4 py-2 rounded-lg flex items-center gap-2 opacity-70 hover:opacity-100 transition-all text-sm whitespace-nowrap ${isSyncing ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <svg className={`${isSyncing ? 'animate-spin' : ''}`} width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="scale(-1, 1) translate(-48, 0)">
                                            <path d="M24 6a18 18 0 1 1-12.73 5.27" stroke="currentColor" strokeWidth="4" />
                                            <path d="M12 4v8h8" stroke="currentColor" strokeWidth="4" />
                                        </g>
                                    </svg>
                                    <span className="hidden xl:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                                </button>
                                <button
                                    onClick={() => setShowManageModal(true)}
                                    className="bg-primary hover:bg-white/[.05] px-3 lg:px-4 py-2 rounded-lg flex items-center gap-2 opacity-70 hover:opacity-100 transition-all whitespace-nowrap"
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

                        {/* Overspent Alert */}
                        {getOverspentCategories().length > 0 && (
                            <div
                                className={`rounded-lg overflow-hidden transition-all duration-200 bg-reddy/10 text-reddy border-b-4 border-b-reddy mb-4 ${showOverspentAlert ? 'h-auto' : 'h-[56px] md:h-[64px]'
                                    }`}
                                onClick={expandOverspent}
                            >
                                <div className="p-3 md:p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">
                                            <span className="text-base md:text-lg inline">{formatCurrency(getTotalOverspent())}</span> overspent
                                        </p>
                                    </div>
                                    <button
                                        onClick={expandOverspent}
                                        className="px-3 md:px-4 py-1 rounded-full bg-reddy text-background text-sm font-medium hover:bg-reddy/90 transition-colors"
                                    >
                                        {showOverspentAlert ? 'Close' : 'Fix Now'}
                                    </button>
                                </div>

                                <div
                                    className={`px-3 md:px-4 pb-3 md:pb-4 transition-all duration-200 ${showOverspentAlert
                                        ? 'opacity-100 transform translate-y-0'
                                        : 'opacity-0 transform -translate-y-2 pointer-events-none'
                                        }`}
                                >
                                    <div className="bg-reddy/20 rounded-lg p-3 md:p-4 mb-3">
                                        <h4 className="font-medium mb-2">Overspent Categories:</h4>
                                        <div className="space-y-1 text-sm">
                                            {getOverspentCategories().map(cat => (
                                                <div key={cat.id} className="flex justify-between">
                                                    <span>{cat.name}</span>
                                                    <span className="font-medium">{formatCurrency(Math.abs(cat.available))} over</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="mt-4 w-full bg-green text-background font-semibold py-2 rounded-lg hover:bg-green-dark transition-colors"
                                            onClick={balanceOverspentCategories}
                                        >
                                            Balance Overspent
                                        </button>
                                    </div>
                                    <div className="text-sm opacity-90">
                                        <p className=""><strong>To balance your budget:</strong> Move money from other categories into the overspent ones, or add more income to cover the overspending. Or, use the button above to automatically balance all overspent categories.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Balance Assignment Info & Mass Assign Panel */}
                        {balanceInfo && !isMassAssigning && (
                            <div
                                className={`rounded-lg overflow-hidden transition-all duration-200 ${Math.round(balanceInfo.budgetPool * 100) / 100 == Math.round(balanceInfo.assigned * 100) / 100 ? ('h-[0px] pb-0') : (balanceInfo.budgetPool > balanceInfo.assigned
                                    ? 'bg-green/10 text-green border-b-4 border-b-green h-[56px] md:h-[64px] md:pb-4 mb-4'
                                    : 'bg-reddy/10 text-reddy border-b-4 border-b-reddy h-[56px] md:h-[64px] md:pb-4 mb-4')
                                    }
                                `}
                                onClick={massAssign}>
                                <div className="p-3 md:p-4 flex justify-between items-center">
                                    <div>
                                        {balanceInfo.budgetPool > balanceInfo.assigned ? (
                                            <p className="font-medium">
                                                <span className="text-base md:text-lg inline">{formatCurrency(balanceInfo.budgetPool - balanceInfo.assigned)}</span> left to assign
                                                {getMonthStatus() === 'past' && (
                                                    <span className="hidden md:inline text-xs text-white/60 ml-2">(Past month: rolls over automatically)</span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="font-medium">
                                                <span className="text-base md:text-lg inline">{formatCurrency(balanceInfo.assigned - balanceInfo.budgetPool)}</span> too much assigned
                                                {getMonthStatus() === 'past' && (
                                                    <span className="hidden md:inline text-xs text-white/60 ml-2">(Past month: rolls over automatically)</span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={massAssign}
                                        className={`px-3 md:px-4 py-1 rounded-full ${balanceInfo.budgetPool > balanceInfo.assigned ? 'bg-green hover:bg-green-dark' : 'bg-reddy hover:bg-old-reddy'} text-background text-sm font-medium transition-colors`}
                                    >
                                        {balanceInfo.budgetPool > balanceInfo.assigned ? 'Assign' : 'Fix Now'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mass Assign Panel - shown when in mass assign mode */}
                        {isMassAssigning && balanceInfo && (
                            <div className="rounded-lg overflow-hidden transition-all duration-200 bg-white/[.05] border border-white/[.15] mb-4">
                                {/* Draft Balance Header */}
                                <div className="p-3 md:p-4 border-b border-white/[.1]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div className="text-xs text-white/50 uppercase tracking-wide mb-0.5">Draft Balance</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-xl md:text-2xl font-bold ${draftLeftToAssign >= 0 ? 'text-green' : 'text-reddy'}`}>
                                                    {hideBudgetValues ? '****' : `£${Math.abs(draftLeftToAssign).toFixed(2)}`}
                                                </span>
                                                <span className={`text-sm ${draftLeftToAssign >= 0 ? 'text-green/70' : 'text-reddy/70'}`}>
                                                    {draftLeftToAssign >= 0 ? 'left to assign' : 'over-assigned'}
                                                </span>
                                            </div>
                                            {draftDifference !== 0 && (
                                                <div className="text-xs text-white/50 mt-0.5">
                                                    {draftDifference > 0 ? '+' : ''}{hideBudgetValues ? '****' : `£${draftDifference.toFixed(2)}`} from current
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={cancelMassAssign}
                                                className="px-3 md:px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={massAssign}
                                                className="px-4 md:px-5 py-1.5 rounded-lg bg-green hover:bg-green-dark text-background text-sm font-medium transition-colors"
                                            >
                                                Apply Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="p-3 md:p-4">
                                    <div className="text-xs text-white/50 uppercase tracking-wide mb-2">Quick Actions</div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={fillAllUnderfunded}
                                            disabled={totalUnderfundedAmount === 0}
                                            className="px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2v20M2 12h20" />
                                            </svg>
                                            Fund All Underfunded
                                            {totalUnderfundedAmount > 0 && (
                                                <span className="text-xs opacity-70">
                                                    ({hideBudgetValues ? '****' : `£${totalUnderfundedAmount.toFixed(2)}`})
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={emptyAllDrafts}
                                            className="px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors bg-reddy/15 text-reddy hover:bg-reddy/25 flex items-center gap-1.5"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            </svg>
                                            Empty All
                                        </button>
                                    </div>
                                    {getMonthStatus() === 'past' && (
                                        <div className="text-xs text-white/50 mt-2">
                                            Past month: Don&apos;t worry, unassigned money rolls over. Focus on the current month!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                <div className="bg-white/[.03] rounded-lg p-6 mb-2 md:mb-8 md:mt-4 backdrop-blur-sm">
                                    <h3 className="text-lg font-medium text-green mb-4">Get Started in 3 Steps:</h3>
                                    <ul className="inline-block text-left list-disc list-inside space-y-3 text-base">
                                        <li className="opacity-90">Enter your bank account balances</li>
                                        <li className="opacity-90">Create your budget</li>
                                        <li className="opacity-90">Log your first transaction</li>
                                    </ul>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => setShowAccountModal(true)}
                                        className="
                                        bg-green text-black px-6 py-3 rounded-lg hover:bg-green-dark transition-colors text-sm font-medium sm:order-none"
                                    >
                                        Create Your Budget!
                                    </button>
                                    <Link
                                        href="/docs/getting-started"
                                        className="cursor-pointer px-6 py-3 rounded-lg border border-white/20 hover:bg-white/[.05] transition-colors text-sm font-medium text-white/90"
                                    >
                                        Learn the Basics First
                                    </Link>


                                </div>
                                <div className="sm:mt-4 mt-8">
                                    <Link
                                        href="https://discord.gg/C9mYnEdAQA"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all text-sm"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                                        </svg>
                                        Join our Discord Community
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 md:space-y-2">
                                {/* Monthly Summary */}
                                <div className="bg-white/[.03] rounded-lg py-1 md:py-3 md:p-4 mb-2">
                                    {(() => {
                                        const monthStatus = getMonthStatus();
                                        const totalAssigned = categories.reduce((sum, cat) => sum + cat.assigned, 0);
                                        const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);

                                        // If both assigned and spent are 0, show month status indicator
                                        if (totalAssigned === 0 && totalSpent === 0) {
                                            return (
                                                <div className="flex items-center justify-center gap-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        {monthStatus === 'past' && (
                                                            <>
                                                                <span className="text-blue-400 font-medium">Past Month</span>
                                                                <span className="text-white/50">No budget activity</span>
                                                            </>
                                                        )}
                                                        {monthStatus === 'future' && (
                                                            <>
                                                                <span className="text-purple-400 font-medium">Future Month</span>
                                                                <span className="text-white/50">No budget set yet</span>
                                                            </>
                                                        )}
                                                        {monthStatus === 'current' && (
                                                            <>
                                                                <span className="text-green font-medium">Current Month</span>
                                                                <span className="text-white/50">No budget activity</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Show normal assigned/spent with status indicator
                                        return (
                                            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm">
                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                                        <div className="text-white/60 text-xs uppercase tracking-wide">Available</div>
                                                        {monthStatus === 'past' && (
                                                            <span className="text-blue-400 text-xs font-medium">past</span>
                                                        )}
                                                        {monthStatus === 'future' && (
                                                            <span className="text-purple-400 text-xs font-medium">future</span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-green">{formatCurrency(totalAvailable)}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                                        <div className="text-white/60 text-xs uppercase tracking-wide">Assigned</div>
                                                        {monthStatus === 'past' && (
                                                            <span className="text-blue-400 text-xs font-medium">past</span>
                                                        )}
                                                        {monthStatus === 'future' && (
                                                            <span className="text-purple-400 text-xs font-medium">future</span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-green">{formatCurrency(totalAssigned)}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                                        <div className="text-white/60 text-xs uppercase tracking-wide">Spent</div>
                                                        {monthStatus === 'past' && (
                                                            <span className="text-blue-400 text-xs font-medium">past</span>
                                                        )}
                                                        {monthStatus === 'future' && (
                                                            <span className="text-purple-400 text-xs font-medium">future</span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-reddy">{formatCurrency(totalSpent)}</div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {Object.entries(groupedCategories).map(([groupName, groupCategories]) => {
                                    const { totalAssigned, totalSpent, totalAvailable } = getGroupTotals(groupCategories);

                                    return (
                                        <div key={groupName} className="space-y-1">
                                            <button
                                                onClick={() => toggleGroup(groupName)}
                                                className={`w-full flex items-center justify-between p-2.5 md:p-3  rounded-lg transition-all
                                                    ${expandedGroups.has(groupName) ? "bg-green/[0.1] hover:bg-white/[.1]" : "bg-white/[.03] hover:bg-white/[.1]"}
                                                    `}
                                            >
                                                <div className="flex text-left flex-col md:flex-row">
                                                    <h3 className="text-base md:text-lg font-medium min-w-40">{groupName}</h3>
                                                    <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm opacity-70 ">
                                                        <span className="text-white/60">{groupCategories.length} categor{groupCategories.length === 1 ? 'y' : 'ies'}</span>
                                                        <span className={getGroupTotals(groupCategories).totalAvailable >= 0 ? 'text-green' : 'text-reddy'}>
                                                            {formatCurrency(getGroupTotals(groupCategories).totalAvailable)} {getGroupTotals(groupCategories).totalAvailable >= 0 ? 'available' : 'over'}
                                                        </span>
                                                        <span className="text-white/60">
                                                            {formatCurrency(getGroupTotals(groupCategories).totalSpent)} spent
                                                        </span>
                                                    </div>
                                                </div>
                                                <Image
                                                    src="/chevron-right.svg"
                                                    alt={expandedGroups.has(groupName) ? 'Collapse' : 'Expand'}
                                                    width={18}
                                                    height={18}
                                                    className={`opacity-70 transition-transform duration-100 ${expandedGroups.has(groupName) ? 'rotate-90' : ''
                                                        }`}
                                                />
                                            </button>

                                            <div className={`transition-all duration-100 overflow-hidden ${expandedGroups.has(groupName)
                                                ? 'opacity-100 max-h-[5000px]'
                                                : 'opacity-0 max-h-0'
                                                }`}>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
                                                    {groupCategories.map((category) => (
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
                                                                showGroup={false}
                                                                forceFlipMassAssign={isMassAssigning}
                                                                wasMassAssigningSoShouldClose={wasMassAssigningSoShouldClose}
                                                                onAssignmentUpdate={(amount) => handleAssignmentUpdate(category.id, amount)}
                                                                available={category.available}
                                                                dailyLeft={category.dailyLeft}
                                                                draftAssigned={isMassAssigning ? draftAssignments.get(category.id) : undefined}
                                                                onDraftChange={isMassAssigning ? (amount) => handleDraftChange(category.id, amount) : undefined}
                                                                underfundedAmount={isMassAssigning ? getDraftUnderfundedAmount(category) : undefined}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Reminders and IOUs Section */}
                        {categories.length > 0 && !loading && (
                            <div className="mt-6 md:mt-8">
                                <div className="bg-white/[.03] rounded-lg p-4 md:p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <h2 className="text-lg md:text-xl font-semibold">Notes & Reminders</h2>
                                        {reminderLoading && (
                                            <div className="flex items-center gap-2 text-sm text-white/60">
                                                <div className="w-3 h-3 border border-white/30 border-t-white/60 rounded-full animate-spin"></div>
                                                <span>Saving...</span>
                                            </div>
                                        )}
                                    </div>
                                    <textarea
                                        value={reminderText}
                                        onChange={(e) => handleReminderChange(e.target.value)}
                                        placeholder="Add reminders, IOUs, and general notes for this budget period..."
                                        className="w-full text-sm min-h-[120px] bg-white/[.05] border border-white/[.1] rounded-lg p-3 text-white placeholder-white/50 resize-vertical focus:outline-none focus:border-green/50 focus:bg-white/[.08] transition-all"
                                        rows={5}
                                    />
                                    <p className="text-xs text-white/50 mt-2">
                                        Changes are automatically saved as you type
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <ManageBudgetModal
                    isOpen={showManageModal}
                    onClose={() => {
                        if (monthString && allTransactionsData) {
                            calculateBudgetData(monthString);
                        }
                        setShowManageModal(false);
                    }}
                />

                <AccountModal
                    isOpen={showAccountModal}
                    onClose={() => setShowAccountModal(false)}
                    onAccountsUpdated={() => {
                        setShowAccountModal(false);
                        setShowManageModal(true);
                    }}
                />
            </div>
        </ProtectedRoute>
    );
}
