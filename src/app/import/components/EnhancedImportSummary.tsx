'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';
import { 
    ParsedTransaction, 
    AccountMapping, 
    CategoryMapping 
} from '@/lib/import-presets/types';
import { Database } from '@/types/supabase';

interface EnhancedImportSummaryProps {
    transactions: ParsedTransaction[];
    accountMappings: AccountMapping[];
    categoryMappings: CategoryMapping[];
    onImport: () => void; // No account ID needed - mappings handle distribution
    onBack: () => void;
    loading?: boolean;
}

type Account = Database['public']['Tables']['accounts']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export default function EnhancedImportSummary({ 
    transactions, 
    accountMappings,
    categoryMappings,
    onImport, 
    onBack, 
    loading = false 
}: EnhancedImportSummaryProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const supabase = createClientComponentClient<Database>();

    useEffect(() => {
        fetchAccountsAndCategories();
    }, []);

    const fetchAccountsAndCategories = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const [accountsResponse, categoriesResponse] = await Promise.all([
                supabase
                    .from('accounts')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .order('name'),
                supabase
                    .from('categories')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name')
            ]);

            if (accountsResponse.error) throw accountsResponse.error;
            if (categoriesResponse.error) throw categoriesResponse.error;

            setAccounts(accountsResponse.data || []);
            setCategories(categoriesResponse.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    // Helper function to get account name from mapping
    const getAccountName = (sourceAccount: string) => {
        const mapping = accountMappings.find(m => m.sourceAccount === sourceAccount);
        if (!mapping) return sourceAccount;
        
        if (mapping.shouldCreateNew && mapping.newAccountName) {
            return `${mapping.newAccountName} (New)`;
        }
        
        const account = accounts.find(acc => acc.id === mapping.targetAccountId);
        return account?.name || sourceAccount;
    };

    // Helper function to get category name from mapping
    const getCategoryName = (sourceCategory: string, sourceCategoryGroup: string) => {
        const mapping = categoryMappings.find(m => 
            m.sourceCategory === sourceCategory && m.sourceCategoryGroup === sourceCategoryGroup
        );
        
        if (!mapping) return 'Uncategorized';
        
        if (mapping.shouldCreateNew && mapping.newCategoryName) {
            return `${mapping.newCategoryName} (New)`;
        }
        
        const category = categories.find(cat => cat.id === mapping.targetCategoryId);
        return category?.name || 'Uncategorized';
    };

    // Group transactions by account
    const transactionsByAccount = transactions.reduce((acc, transaction) => {
        const accountKey = transaction.sourceAccount || 'Unknown';
        if (!acc[accountKey]) {
            acc[accountKey] = [];
        }
        acc[accountKey].push(transaction);
        return acc;
    }, {} as Record<string, ParsedTransaction[]>);

    const totalTransactions = transactions.length;
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = Math.abs(transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0));

    // Count new items that will be created
    const newAccounts = accountMappings.filter(m => m.shouldCreateNew).length;
    const newGroups = 0; // Groups are handled automatically by CategoryDropdown
    const newCategories = 0; // Categories are created through CategoryDropdown, not tracked here

    if (loadingData) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading account information...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Enhanced Import Summary</h2>
                <p className="text-white/70">
                    Review your mapped transactions before importing to multiple accounts.
                </p>
            </div>

            {/* Overview Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white/[.03] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green mb-1">{totalTransactions}</div>
                    <div className="text-sm text-white/70">Total Transactions</div>
                </div>
                
                <div className="bg-white/[.03] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green mb-1">£{totalIncome.toFixed(2)}</div>
                    <div className="text-sm text-white/70">Total Income</div>
                </div>
                
                <div className="bg-white/[.03] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400 mb-1">£{totalExpenses.toFixed(2)}</div>
                    <div className="text-sm text-white/70">Total Expenses</div>
                </div>

                <div className="bg-white/[.03] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{Object.keys(transactionsByAccount).length}</div>
                    <div className="text-sm text-white/70">Target Accounts</div>
                </div>
            </div>

            {/* New Items Summary */}
            {(newAccounts > 0 || newGroups > 0 || newCategories > 0) && (
                <div className="bg-blue-500/10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-400 mb-3">New Items to be Created</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        {newAccounts > 0 && (
                            <div className="flex justify-between">
                                <span>New Accounts:</span>
                                <span className="text-blue-400 font-medium">{newAccounts}</span>
                            </div>
                        )}
                        {newGroups > 0 && (
                            <div className="flex justify-between">
                                <span>New Groups:</span>
                                <span className="text-blue-400 font-medium">{newGroups}</span>
                            </div>
                        )}
                        {newCategories > 0 && (
                            <div className="flex justify-between">
                                <span>New Categories:</span>
                                <span className="text-blue-400 font-medium">{newCategories}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Breakdown by Account */}
            <div className="bg-white/[.03] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Distribution by Account</h3>
                <p className="text-white/60 text-sm mb-4">
                    Transactions will be automatically imported into their mapped accounts:
                </p>
                
                <div className="space-y-4">
                    {Object.entries(transactionsByAccount).map(([sourceAccount, accountTransactions]) => {
                        const accountName = getAccountName(sourceAccount);
                        const income = accountTransactions.filter(t => t.type === 'income').length;
                        const expenses = accountTransactions.filter(t => t.type === 'payment').length;
                        const totalAmount = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
                        
                        return (
                            <div key={sourceAccount} className="bg-white/[.02] rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-medium text-green">{accountName}</h4>
                                        <p className="text-xs text-white/60">Source: {sourceAccount}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-medium ${totalAmount >= 0 ? 'text-green' : 'text-red-400'}`}>
                                            {totalAmount >= 0 ? '+' : ''}£{totalAmount.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-white/60">
                                            {accountTransactions.length} transactions
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between">
                                        <span>Income:</span>
                                        <span className="text-green">{income}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Expenses:</span>
                                        <span className="text-red-400">{expenses}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Date Range */}
            <div className="bg-white/[.03] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Date Range</h3>
                <div className="flex justify-between text-sm">
                    <div>
                        <span className="text-white/70">Earliest transaction:</span>
                        <span className="ml-2 font-medium">
                            {format(new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))), 'MMM dd, yyyy')}
                        </span>
                    </div>
                    <div>
                        <span className="text-white/70">Latest transaction:</span>
                        <span className="ml-2 font-medium">
                            {format(new Date(Math.max(...transactions.map(t => new Date(t.date).getTime()))), 'MMM dd, yyyy')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Transaction Preview */}
            <div className="bg-white/[.03] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Transaction Preview</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transactions.slice(0, 8).map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-white/10">
                            <div className="flex-1">
                                <div className="font-medium">{transaction.vendor}</div>
                                <div className="text-xs text-white/60">
                                    {format(new Date(transaction.date), 'MMM dd')} • 
                                    {transaction.sourceAccount && (
                                        <span className="ml-1">
                                            {getAccountName(transaction.sourceAccount)}
                                        </span>
                                    )}
                                    {transaction.sourceCategory && transaction.sourceCategoryGroup && (
                                        <span className="ml-1">
                                            → {getCategoryName(transaction.sourceCategory, transaction.sourceCategoryGroup)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={`font-medium ${transaction.amount > 0 ? 'text-green' : 'text-red-400'}`}>
                                {transaction.amount > 0 ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                            </div>
                        </div>
                    ))}
                    {transactions.length > 8 && (
                        <div className="text-center text-sm text-white/60 py-2">
                            ... and {transactions.length - 8} more transactions
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
                <button
                    onClick={onBack}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors disabled:opacity-50"
                >
                    ← Back
                </button>

                <button
                    onClick={onImport}
                    disabled={loading}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                        !loading
                            ? 'bg-green text-black hover:bg-green-dark'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Importing...
                        </div>
                    ) : (
                        `Import to ${Object.keys(transactionsByAccount).length} Accounts`
                    )}
                </button>
            </div>

            {/* Final Summary */}
            <div className="bg-white/[.03] rounded-lg p-4">
                <h3 className="font-semibold text-green mb-2">🚀 Ready for Multi-Account Import</h3>
                <p className="text-sm text-white/70">
                    This will create {newAccounts} new accounts, {newGroups} new groups, {newCategories} new categories, 
                    and import {totalTransactions} transactions distributed across {Object.keys(transactionsByAccount).length} accounts 
                    based on your mappings. No further account selection needed!
                </p>
            </div>
        </div>
    );
}
