'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ParsedTransaction } from '@/lib/import-presets/types';
import { Database } from '@/types/supabase';
import { format } from 'date-fns';
import CategoryDropdown from './CategoryDropdown';

interface TransactionCategorizerProps {
    transactions: ParsedTransaction[];
    onComplete: (transactions: ParsedTransaction[]) => void;
    onBack: () => void;
}

type Category = Database['public']['Tables']['categories']['Row'] & {
    groups?: {
        id: string;
        name: string;
    } | null;
};

type Group = Database['public']['Tables']['groups']['Row'];

export default function TransactionCategorizer({ 
    transactions, 
    onComplete, 
    onBack 
}: TransactionCategorizerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categorizedTransactions, setCategorizedTransactions] = useState<ParsedTransaction[]>(transactions);
    const [skippedTransactions, setSkippedTransactions] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const itemsPerPage = 20;
    const supabase = createClientComponentClient<Database>();

    useEffect(() => {
        fetchCategoriesAndGroups();
    }, []);

    const fetchCategoriesAndGroups = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch categories with groups
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('categories')
                .select(`
                    *,
                    groups (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id)
                .order('name');

            if (categoriesError) throw categoriesError;

            // Fetch groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('groups')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (groupsError) throw groupsError;

            setCategories(categoriesData || []);
            setGroups(groupsData || []);
        } catch (error) {
            console.error('Error fetching categories and groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateTransactionCategory = (index: number, categoryId: string) => {
        setCategorizedTransactions(prev =>
            prev.map((transaction, i) =>
                i === index
                    ? { ...transaction, category_id: categoryId }
                    : transaction
            )
        );
        // Remove from skipped if categorized
        if (categoryId) {
            setSkippedTransactions(prev => {
                const newSet = new Set(prev);
                newSet.delete(index);
                return newSet;
            });
        }
    };

    const toggleSkipTransaction = (index: number) => {
        setSkippedTransactions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
                // Clear categorization if skipped
                setCategorizedTransactions(prevTrans =>
                    prevTrans.map((transaction, i) =>
                        i === index
                            ? { ...transaction, category_id: undefined }
                            : transaction
                    )
                );
            }
            return newSet;
        });
    };

    const bulkAssignCategory = () => {
        if (!selectedCategory) return;
        
        const filteredIndices = getFilteredTransactions().map(item => item.originalIndex);
        setCategorizedTransactions(prev =>
            prev.map((transaction, i) =>
                filteredIndices.includes(i) && transaction.type === 'payment'
                    ? { ...transaction, category_id: selectedCategory }
                    : transaction
            )
        );
        setSelectedCategory('');
    };

    const getFilteredTransactions = () => {
        return categorizedTransactions
            .map((transaction, index) => ({ ...transaction, originalIndex: index }))
            .filter(transaction =>
                transaction.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    };

    const filteredTransactions = getFilteredTransactions();
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

    const getCategoryName = (categoryId: string) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category?.name || '';
    };

    const categorizedCount = categorizedTransactions.filter(t => t.category_id && t.type === 'payment').length;
    const paymentTransactions = categorizedTransactions.filter(t => t.type === 'payment');
    const skippedPaymentCount = [...skippedTransactions].filter(index => 
        categorizedTransactions[index]?.type === 'payment'
    ).length;
    const processedPaymentCount = categorizedCount + skippedPaymentCount;

    const handleComplete = () => {
        onComplete(categorizedTransactions);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading categories...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Categorize Transactions</h2>
                <p className="text-white/70">
                    Review and assign categories to each transaction for precise tracking.
                </p>
            </div>

            {/* Progress */}
            <div className="bg-white/[.03] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-white/70">
                        {processedPaymentCount} of {paymentTransactions.length} payment transactions processed
                    </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                        className="bg-green h-2 rounded-full transition-all duration-500"
                        style={{ width: `${paymentTransactions.length > 0 ? (processedPaymentCount / paymentTransactions.length) * 100 : 0}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-2">
                    <span>{categorizedCount} categorized • {skippedPaymentCount} skipped</span>
                    <span>Income transactions don't require categories</span>
                </div>
            </div>

            {/* Search and Bulk Actions */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full p-3 pl-10 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                    />
                    <svg className="w-5 h-5 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                
                <div className="flex gap-2">
                    <CategoryDropdown
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        placeholder="Select category for bulk assign..."
                        className="min-w-64"
                        categories={categories}
                        groups={groups}
                        onNewCategoryCreated={fetchCategoriesAndGroups}
                    />
                    
                    <button
                        onClick={bulkAssignCategory}
                        disabled={!selectedCategory}
                        className={`px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                            selectedCategory
                                ? 'bg-green text-black hover:bg-green-dark'
                                : 'bg-white/10 text-white/40 cursor-not-allowed'
                        }`}
                    >
                        Bulk Assign
                    </button>
                </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-2">
                {paginatedTransactions.map((transaction) => {
                    const isSkipped = skippedTransactions.has(transaction.originalIndex);
                    return (
                        <div key={transaction.originalIndex} className={`bg-white/[.03] rounded-lg p-4 ${isSkipped ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            transaction.type === 'income' 
                                                ? 'bg-green/20 text-green' 
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {transaction.type === 'income' ? 'Income' : 'Payment'}
                                        </span>
                                        {isSkipped && (
                                            <span className="px-2 py-1 text-xs bg-white/10 text-white/60 rounded">
                                                Skipped
                                            </span>
                                        )}
                                        <span className="text-sm text-white/60">
                                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-medium truncate">{transaction.vendor}</h3>
                                    {transaction.description && (
                                        <p className="text-sm text-white/60 truncate">{transaction.description}</p>
                                    )}
                                </div>
                                
                                <div className="text-right flex-shrink-0">
                                    <p className={`font-medium ${
                                        transaction.amount > 0 ? 'text-green' : 'text-red-400'
                                    }`}>
                                        {transaction.amount > 0 ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                                    </p>
                                </div>

                                {transaction.type === 'payment' && (
                                    <button
                                        onClick={() => toggleSkipTransaction(transaction.originalIndex)}
                                        className={`px-3 py-2 rounded text-sm font-medium transition-colors flex-shrink-0 ${
                                            isSkipped
                                                ? 'bg-white/10 text-white hover:bg-white/20'
                                                : 'border border-white/20 text-white/70 hover:text-white hover:border-white/40'
                                        }`}
                                    >
                                        {isSkipped ? 'Unskip' : 'Skip'}
                                    </button>
                                )}
                                
                                <div className="flex-shrink-0 w-48">
                                    {transaction.type === 'payment' ? (
                                        isSkipped ? (
                                            <div className="w-full p-3 rounded-lg bg-white/[.02] border border-white/[.05] text-white/40 text-center">
                                                Skipped
                                            </div>
                                        ) : (
                                            <CategoryDropdown
                                                value={transaction.category_id || ''}
                                                onChange={(categoryId) => updateTransactionCategory(transaction.originalIndex, categoryId)}
                                                placeholder="Select category..."
                                                className="w-full"
                                                categories={categories}
                                                groups={groups}
                                                onNewCategoryCreated={fetchCategoriesAndGroups}
                                            />
                                        )
                                    ) : (
                                        <div className="text-center text-sm text-white/60 p-2">
                                            No category needed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed hover:border-white/40 transition-colors"
                    >
                        Previous
                    </button>
                    
                    <span className="text-sm text-white/70">
                        Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed hover:border-white/40 transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}

            {filteredTransactions.length === 0 && searchTerm && (
                <div className="text-center py-8 text-white/60">
                    No transactions found matching "{searchTerm}"
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
                >
                    ← Back
                </button>

                <div className="text-center">
                    <p className="text-sm text-white/60 mb-2">
                        {skippedPaymentCount > 0 
                            ? `${skippedPaymentCount} payment transaction${skippedPaymentCount !== 1 ? 's' : ''} skipped - can be categorized later in your budget`
                            : 'Uncategorized payments can be assigned later in your budget'
                        }
                    </p>
                </div>

                <button
                    onClick={handleComplete}
                    className="px-8 py-3 rounded-lg font-medium bg-green text-black hover:bg-green-dark transition-colors"
                >
                    Continue to Summary →
                </button>
            </div>
        </div>
    );
}
