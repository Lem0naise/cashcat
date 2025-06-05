'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { debounce } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Database } from '@/types/supabase';
import type { Category } from '@/types/supabase';
import MoneyInput from './money-input';

type Transaction = Database['public']['Tables']['transactions']['Row'];

type Vendor = {
    id: string;
    name: string;
};

type TransactionModalProps = {
    transaction: Transaction|null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (transaction: {
        amount: number;
        date: string;
        vendor: string;
        description?: string;
        type: string;
        account_id: string;
        category_id?: string | null;
    }) => void;
    onDelete : () => void;
};

export default function TransactionModal({transaction, isOpen, onClose, onSubmit, onDelete }: TransactionModalProps) {
    const supabase = createClientComponentClient();
    const [type, setType] = useState<string>('payment');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vendor, setVendor] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<{id: string; name: string; type: string}[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [categoryRemaining, setCategoryRemaining] = useState<number | null>(null);
    const [loadingCategoryRemaining, setLoadingCategoryRemaining] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [vendorSuggestions, setVendorSuggestions] = useState<Vendor[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [vendorInputFocused, setVendorInputFocused] = useState(false);
    const vendorRef = useRef<HTMLDivElement>(null);
    const vendorInputRef = useRef<HTMLInputElement>(null);

    // Fetch categories and accounts
    useEffect(() => {
        const fetchCategoriesAndAccounts = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const [categoriesResponse, accountsResponse, recentTransactionResponse] = await Promise.all([
                    supabase
                        .from('categories')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('name'),
                    supabase
                        .from('accounts')
                        .select('id, name, type')
                        .eq('user_id', user.id)
                        .eq('is_active', true)
                        .order('name'),
                    supabase
                        .from('transactions')
                        .select('account_id')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                ]);
                
                if (categoriesResponse.error) throw categoriesResponse.error;
                if (accountsResponse.error) throw accountsResponse.error;
                
                setCategories(categoriesResponse.data || []);
                setAccounts(accountsResponse.data || []);
                
                // Set default account from most recent transaction if creating new transaction
                if (!transaction && recentTransactionResponse.data && recentTransactionResponse.data.length > 0) {
                    setAccountId(recentTransactionResponse.data[0].account_id || '');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoadingCategories(false);
                setLoadingAccounts(false);
            }
        };

        if (isOpen) {
            fetchCategoriesAndAccounts();
        }
    }, [isOpen, transaction]);

    useEffect(() => {
        if (transaction){
            setType(transaction.type || 'payment');
            setAmount((Math.abs(transaction.amount).toFixed(2)));
            setDate(transaction.date);
            setDescription(transaction.description ? transaction.description : '');
            setVendor(transaction.vendor);
            setCategoryId(transaction.category_id || '');
            setAccountId(transaction.account_id || '');
        } else {
            setType('payment');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setVendor('');
            setCategoryId('');
            setAccountId('');
        }
    }, [isOpen, transaction]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced vendor search
    const searchVendors = useCallback(
        debounce(async (searchTerm: string) => {
            if (!searchTerm.trim()) {
                setVendorSuggestions([]);
                return;
            }

            try {
                const { data: vendors } = await supabase
                    .from('vendors')
                    .select('id, name')
                    .order('name')
                    .limit(5)
                    .filter('name', 'ilike', `${searchTerm}%`);

                setVendorSuggestions(vendors || []);
            } catch (error) {
                console.error('Error searching vendors:', error);
                setVendorSuggestions([]);
            }
        }, 300),
        [supabase]
    );

    const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setVendor(value);
        setShowSuggestions(true);
        searchVendors(value);
    };

    // Fetch category remaining amount
    const fetchCategoryRemaining = useCallback(async (categoryId: string) => {
        if (!categoryId) {
            setCategoryRemaining(null);
            return;
        }

        try {
            setLoadingCategoryRemaining(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            // Get current month
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            // Get first and last day of current month
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            // Format dates for database query - use local timezone instead of UTC
            const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
            const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

            // Fetch current month assignment, current month spending, and ALL historical data for rollover
            const [assignmentResponse, spendingResponse, allTransactionsResponse, allAssignmentsResponse] = await Promise.all([
                supabase
                    .from('assignments')
                    .select('assigned')
                    .eq('category_id', categoryId)
                    .eq('month', currentMonth)
                    .eq('user_id', user.id)
                    .single(),
                supabase
                    .from('transactions')
                    .select('amount')
                    .eq('category_id', categoryId)
                    .eq('user_id', user.id)
                    .eq('type', 'payment')
                    .gte('date', startDate)
                    .lte('date', endDate),
                supabase
                    .from('transactions')
                    .select('amount, category_id, type, date')
                    .eq('user_id', user.id),
                supabase
                    .from('assignments')
                    .select('*')
                    .eq('user_id', user.id)
            ]);

            const assignment = assignmentResponse.data;
            const transactions = spendingResponse.data || [];
            const allTransactions = allTransactionsResponse.data || [];
            const allAssignments = allAssignmentsResponse.data || [];

            // Calculate rollover using the same logic as budget page
            const calculateRolloverForCategory = (
                categoryId: string, 
                targetMonth: string, 
                allAssignments: any[], 
                allTransactions: any[]
            ): number => {
                if (!categoryId) return 0;

                // Get all months from category creation up to target month
                const targetDate = new Date(targetMonth + '-01');
                const months: string[] = [];
                
                // Start from 12 months ago to ensure we capture enough history
                const startDate = new Date(targetDate);
                startDate.setMonth(startDate.getMonth() - 12);
                
                let currentDate = new Date(startDate);
                while (currentDate <= targetDate) {
                    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                    if (monthStr < targetMonth) { // Only include months before target
                        months.push(monthStr);
                    }
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                let rollover = 0;
                
                // Calculate rollover month by month
                for (const month of months) {
                    const assignment = allAssignments.find(a => a.category_id === categoryId && a.month === month);
                    const assigned = assignment?.assigned || 0;
                    
                    // Calculate spending for this month
                    const monthStart = month + '-01';
                    const nextMonth = new Date(monthStart);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    const monthEnd = new Date(nextMonth.getTime() - 1).toISOString().split('T')[0];
                    
                    const monthSpent = allTransactions
                        .filter(t => t.category_id === categoryId && 
                                    t.date >= monthStart && 
                                    t.date <= monthEnd &&
                                    t.type === 'payment')
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                    
                    // Add to rollover: assigned + previous rollover - spent
                    rollover = rollover + assigned - monthSpent;
                }
                
                return rollover;
            };

            // Calculate remaining amount with rollover
            const assigned = assignment?.assigned || 0;
            const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const rollover = calculateRolloverForCategory(categoryId, currentMonth, allAssignments, allTransactions);
            const remaining = assigned + rollover - totalSpent;

            setCategoryRemaining(remaining);
        } catch (error) {
            console.error('Error fetching category remaining:', error);
            setCategoryRemaining(null);
        } finally {
            setLoadingCategoryRemaining(false);
        }
    }, [supabase]);

    // Update remaining amount when category changes
    useEffect(() => {
        if (type === 'payment' && categoryId) {
            fetchCategoryRemaining(categoryId);
        } else {
            setCategoryRemaining(null);
        }
    }, [categoryId, type, fetchCategoryRemaining]);

    const handleVendorSelect = (vendorName: string) => {
        setVendor(vendorName);
        setShowSuggestions(false);
    };

    const selectVendor = async (vendorName: string) => {
        setVendor(vendorName);
        setShowSuggestions(false);

        // Find the most recent transaction for this vendor
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('category_id')
                .eq('vendor', vendorName)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            // If we found a transaction, set its category
            if (transactions && transactions.length > 0) {
                setCategoryId(transactions[0].category_id);
            }
        } catch (error) {
            console.error('Error fetching vendor category:', error);
        }
    };

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (type === 'payment' && !categoryId) return; // Prevent submission if no category selected for payments
        if (!accountId) return; // Prevent submission if no account selected
        
        onSubmit({
            amount: type === 'payment' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
            type: type || 'payment', // Ensure type is never undefined
            date,
            vendor,
            account_id: accountId,
            description: description || undefined,
            category_id: type === 'payment' ? categoryId : null // Only include category for payments
        });
        // Reset form
        setAmount('');
        setVendor('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategoryId('');
        setAccountId('');
        handleClose();
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div 
            className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${
                isClosing ? '' : 'animate-[fadeIn_0.2s_ease-out]'
            }`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white/[.03] md:rounded-lg border-b-4 w-full md:max-w-md md:p-6 min-h-[100dvh] md:min-h-0 ${
                    isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                }`}
            >
                <div className="flex justify-between items-center p-4 md:p-0 md:mb-6 border-b border-white/[.15] md:border-0">
                    <h2 className="text-xl font-bold">{transaction ? "Edit Transaction" : "New Transaction"}</h2>
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white"
                    >
                        <Image
                            src="/plus.svg"
                            alt="Close"
                            width={16}
                            height={16}
                            className="opacity-100 invert rotate-45"
                        />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100dvh-4rem)] md:h-auto">
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-0">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => setType('payment')}
                                className={`p-3 rounded-lg border transition-colors ${
                                    type === 'payment'
                                        ? 'bg-reddy/20 border-reddy text-reddy'
                                        : 'bg-white/[.05] border-white/[.15] hover:bg-white/[.1]'
                                }`}
                            >
                                Payment
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`p-3 rounded-lg border transition-colors ${
                                    type === 'income'
                                        ? 'bg-green/20 border-green text-green'
                                        : 'bg-white/[.05] border-white/[.15] hover:bg-white/[.1]'
                                }`}
                            >
                                Income
                            </button>
                        </div>

                        <div className="mb-6">
                            <MoneyInput
                                value={amount}
                                onChange={(value) => setAmount(value)}
                                placeholder="0.00"
                                autoFocus={(transaction === null)}
                                currencySymbol={true}
                                onBlur={(transaction === null) ? () => {
                                    setTimeout(() => {
                                        vendorInputRef.current?.focus();
                                    }, 100);
                                } :  () => {}}
                            />
                        </div>

                        <div className="space-y-1">
                            <div ref={vendorRef} className="relative">
                                <label className="block text-sm text-white/50 mb-0.5">Vendor</label>
                                <input
                                    ref={vendorInputRef}
                                    type="text"
                                    required
                                    value={vendor}
                                    onChange={handleVendorChange}
                                    onFocus={() => {
                                        setVendorInputFocused(true);
                                        setShowSuggestions(true);
                                        if (vendor) searchVendors(vendor);
                                    }}
                                    placeholder="Shop"
                                    className="w-full p-2.5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                />
                                {showSuggestions && vendorSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white/[0.05] border border-white/[.15] rounded-lg overflow-hidden shadow-lg">
                                        {vendorSuggestions.filter((suggestion) => suggestion.name!= "Starting Balance")
                                            .map((suggestion) => (
                                            <button
                                                key={suggestion.id}
                                                type="button"
                                                onClick={() => selectVendor(suggestion.name)}
                                                className="w-full px-4 py-2 text-left md:bg-black/0.6 bg-black/[0.9] hover:bg-green/[.5] hover:text-black transition-colors"
                                            >
                                                {suggestion.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {type === 'payment' && (
                                <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <label className={`block text-sm ${categoryRemaining && categoryRemaining <0 ? 'text-reddy' : 'text-white/50' }`}>Category</label>
                                        {amount && categoryRemaining !== null && !loadingCategoryRemaining && (
                                            <span className={`text-xs font-medium ${
                                                (categoryRemaining - parseFloat(amount) >= 0 ) || (transaction && categoryRemaining >= 0)
                                                    ? 'text-green px-1 py-1' 
                                                    : 'text-reddy animate-pulse bg-reddy/20 rounded-full px-1 py-1'
                                            }`}>
                                                {categoryRemaining >= 0 
                                                    ? `£${categoryRemaining.toFixed(2)} left` + ((categoryRemaining - parseFloat(amount) >= 0 ) || (transaction && categoryRemaining >= 0) ? '' : ' - not enough!')
                                                    : `⚠️ £${Math.abs(categoryRemaining).toFixed(2)} OVER`
                                                }
                                            </span>
                                        )}
                                        {loadingCategoryRemaining && ( 
                                            <span className="text-xs text-white/50 px-1 py-1">Loading...</span>
                                        )}
                                    </div>
                                    <select
                                        required={type === 'payment'}
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className={`w-full p-2.5 pr-5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors
                                                    ${categoryRemaining && categoryRemaining < 0 
                                                        ? 'text-reddy'
                                                        : ''
                                                    }
                                            `}
                                        disabled={loadingCategories}
                                    >
                                        <option value="" disabled>
                                            {loadingCategories ? 'Loading categories...' : 'Select a category'}
                                        </option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            

                            <div>
                                <label className="block text-sm text-white/50 mb-0.5">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-2.5 pr-5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-white/50 mb-0.5">Account</label>
                                <select
                                    required
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className="w-full p-2.5 pr-5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                    disabled={loadingAccounts}
                                >
                                    <option value="" disabled>
                                        {loadingAccounts ? 'Loading accounts...' : 'Select an account'}
                                    </option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name} ({account.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-ms text-white/50 mb-0.5">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Weekly groceries..."
                                    className="w-full p-2.5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors resize-none h-16"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-0 md:pt-4 border-t border-white/[.15] md:border-0">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => isDeleting ? (setIsDeleting(false), onDelete()) : setIsDeleting(true)}
                                className={`${transaction ? 'block': 'hidden'} flex-1 py-4 ${isDeleting ? "bg-old-reddy" : "bg-reddy"} text-black font-medium rounded-lg hover:bg-old-reddy transition-colors`}
                            >
                                {isDeleting ? "Are you sure?" : "Delete"}
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-4 bg-green text-black font-medium rounded-lg hover:bg-green-dark transition-colors"
                            >
                                {transaction ? "Update" : "Add"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
