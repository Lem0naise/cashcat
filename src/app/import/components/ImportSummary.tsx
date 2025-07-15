'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ParsedTransaction } from '@/lib/import-presets/types';
import { Database } from '@/types/supabase';
import { format } from 'date-fns';

interface ImportSummaryProps {
    transactions: ParsedTransaction[];
    onImport: (accountId: string) => void;
    onBack: () => void;
    loading: boolean;
}

type Account = Database['public']['Tables']['accounts']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export default function ImportSummary({ 
    transactions, 
    onImport, 
    onBack, 
    loading 
}: ImportSummaryProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
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

            // Auto-select default account if available
            const defaultAccount = accountsResponse.data?.find(acc => acc.is_default);
            if (defaultAccount) {
                setSelectedAccountId(defaultAccount.id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const getCategoryName = (categoryId: string) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category?.name || 'Uncategorized';
    };

    const paymentTransactions = transactions.filter(t => t.type === 'payment');
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const categorizedPayments = paymentTransactions.filter(t => t.category_id);
    const uncategorizedPayments = paymentTransactions.filter(t => !t.category_id);

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = Math.abs(paymentTransactions.reduce((sum, t) => sum + t.amount, 0));

    // Create new categories that will be needed
    const newCategories = Array.from(new Set(
        transactions
            .filter(t => t.category_id && !categories.find(cat => cat.id === t.category_id))
            .map(t => t.category_id!)
    ));

    const handleImport = () => {
        if (selectedAccountId) {
            onImport(selectedAccountId);
        }
    };

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
                <h2 className="text-2xl font-semibold mb-4">Import Summary</h2>
                <p className="text-white/70">
                    Review your import details and select the account to import transactions to.
                </p>
            </div>

            {/* Overview Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/[.03] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green mb-1">{transactions.length}</div>
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
            </div>

            {/* Categorization Breakdown */}
            <div className="bg-white/[.03] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Categorization Breakdown</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-green mb-3">Payment Transactions</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Categorized:</span>
                                <span className="text-green">{categorizedPayments.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Uncategorized:</span>
                                <span className="text-yellow-400">{uncategorizedPayments.length}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t border-white/20 pt-2">
                                <span>Total Payments:</span>
                                <span>{paymentTransactions.length}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-medium text-green mb-3">Income Transactions</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Income (no category needed):</span>
                                <span className="text-green">{incomeTransactions.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {uncategorizedPayments.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg">
                        <p className="text-sm text-yellow-400">
                            ⚠️ {uncategorizedPayments.length} payment transactions will be imported without categories. 
                            You can assign categories to them later in your budget.
                        </p>
                    </div>
                )}
            </div>

            {/* Account Selection */}
            <div className="bg-white/[.03] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Select Account</h3>
                <p className="text-white/70 mb-4">
                    Choose which account these transactions belong to:
                </p>
                
                <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full p-4 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                >
                    <option value="">Select an account...</option>
                    {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                            {account.name} ({account.type})
                        </option>
                    ))}
                </select>
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

            {/* Preview */}
            <div className="bg-white/[.03] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Transaction Preview</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transactions.slice(0, 5).map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-white/10">
                            <div className="flex-1">
                                <div className="font-medium">{transaction.vendor}</div>
                                <div className="text-xs text-white/60">
                                    {format(new Date(transaction.date), 'MMM dd')} • {getCategoryName(transaction.category_id || '')}
                                </div>
                            </div>
                            <div className={`font-medium ${transaction.amount > 0 ? 'text-green' : 'text-red-400'}`}>
                                {transaction.amount > 0 ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                            </div>
                        </div>
                    ))}
                    {transactions.length > 5 && (
                        <div className="text-center text-sm text-white/60 py-2">
                            ... and {transactions.length - 5} more transactions
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
                >
                    ← Back
                </button>

                <button
                    onClick={handleImport}
                    disabled={!selectedAccountId || loading}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                        selectedAccountId && !loading
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
                        `Import ${transactions.length} Transactions`
                    )}
                </button>
            </div>

            {/* Final Warning */}
            <div className="bg-white/[.03] rounded-lg p-4">
                <h3 className="font-semibold text-green mb-2">🚀 Ready to Import</h3>
                <p className="text-sm text-white/70">
                    This will add {transactions.length} transactions to your selected account. 
                    Make sure you've chosen the correct account before proceeding.
                </p>
            </div>
        </div>
    );
}
