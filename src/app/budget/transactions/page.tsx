'use client';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { Database } from '../../../types/supabase';
import MobileNav from "../../components/mobileNav";
import Navbar from "../../components/navbar";
import ProtectedRoute from "../../components/protected-route";
import Sidebar from "../../components/sidebar";
import TransactionModal from "../../components/transaction-modal";
import { useSupabaseClient } from '../../hooks/useSupabaseClient';
import { deleteTransaction, submitTransaction, updateTransaction } from '../../utils/transactions';
import TransactionModalWrapper from "@/app/components/transactionSus";
import BankCompareModal from "../../components/bank-compare-modal";

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
    vendors?: {
        id: string;
        name: string;
    } | null;
    categories?: {
        id: string;
        name: string;
        group: string;
    } | null;
};

export default function Transactions() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTransaction, setModalTransaction] = useState<Transaction | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [showBankCompareModal, setShowBankCompareModal] = useState(false);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const supabase = useSupabaseClient();

    const closeModalFunc = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('showModal')) {
            router.replace('/budget/transactions', {scroll: false});
        }
        setShowModal(false);
        setModalTransaction(null);
    }

    // Filter transactions based on search query
    const filteredTransactions = transactions.filter(transaction => {
        if (!searchQuery.trim()) return true;
        
        const query = searchQuery.toLowerCase();
        const amount = Math.abs(transaction.amount).toString();
        const date = new Date(transaction.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return (
            transaction.vendor.toLowerCase().includes(query) ||
            transaction.description?.toLowerCase().includes(query) ||
            transaction.categories?.name.toLowerCase().includes(query) ||
            amount.includes(query) ||
            date.toLowerCase().includes(query)
        );
    });

    // Focus mobile search input when shown
    useEffect(() => {
        if (showMobileSearch && mobileSearchRef.current) {
            mobileSearchRef.current.focus();
        }
    }, [showMobileSearch]);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            let response: {
                data: Transaction[] | null;
                error: any;
            };

            // In production mode, use real Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            
            response = await supabase
                .from('transactions')
                .select(`
                    *,
                    categories (
                        id,
                        name,
                        group
                    ),
                    vendors (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id);
            
            if (response.error) throw response.error;
            setTransactions(response.data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async (transaction: {
        amount: number;
        date: string;
        vendor: string;
        type: string;
        description?: string;
        category_id?: string | null;
    }) => {
        try {
            if (!modalTransaction) throw new Error('No transaction to update');
            const promise = updateTransaction(modalTransaction.id, transaction);
            
            await toast.promise(promise, {
                loading: 'Updating transaction...',
                success: 'Transaction updated successfully',
                error: 'Failed to update transaction'
            });
            
            await fetchTransactions();
            setShowModal(false);
            setModalTransaction(null);
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    };

    const handleSubmit = async (transaction: {
        amount: number;
        type: string;
        date: string;
        vendor: string;
        description?: string;
        category_id?: string | null;
    }) => {
        try {
            const promise = submitTransaction(transaction);
            
            await toast.promise(promise, {
                loading: 'Creating transaction...',
                success: 'Transaction created successfully',
                error: 'Failed to create transaction'
            });
            
            await fetchTransactions();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving transaction:', error);
        }
    };

    const handleDelete = async () => {
        try {
            if (!modalTransaction) throw new Error('No transaction to delete');
            const promise = deleteTransaction(modalTransaction.id);
            
            await toast.promise(promise, {
                loading: 'Deleting transaction...',
                success: 'Transaction deleted successfully',
                error: 'Failed to delete transaction'
            });
            
            await fetchTransactions();
            setShowModal(false);
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    // Calculate total balance including starting balance
    const calculateTotalBalance = (transactions: Transaction[]) => {
        return transactions.reduce((total, transaction) => total + transaction.amount, 0);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const groupTransactionsByDate = (transactions: Transaction[]) => {
        // Filter out starting balance transactions
        const regularTransactions = transactions.filter(t => t.type !== 'starting');
        const startingBalanceTransaction = transactions.find(t => t.type === 'starting');
        
        const groups: { [key: string]: { date: string; transactions: Transaction[] } } = {};
        
        regularTransactions.forEach(transaction => {
            const date = transaction.date;
            if (!groups[date]) {
                groups[date] = {
                    date,
                    transactions: []
                };
            }
            groups[date].transactions.push(transaction);
        });
        Object.values(groups).forEach(group => { // sort by time descending
            group.transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });

        // Convert to array and sort by date
        const sortedGroups = Object.values(groups).sort((a, b) =>  
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // If there is a starting balance, add it as a special group at the bottom
        if (startingBalanceTransaction) {
            sortedGroups.push({
                date: 'starting-balance',
                transactions: [startingBalanceTransaction]
            });
        }

        return sortedGroups;
    };

    const groupTransactionsByMonth = (transactions: Transaction[]) => {
        // Filter out starting balance transactions
        const regularTransactions = transactions.filter(t => t.type !== 'starting');
        const startingBalanceTransaction = transactions.find(t => t.type === 'starting');
        
        // Group by month
        const monthGroups: { [key: string]: Transaction[] } = {};
        
        regularTransactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthGroups[monthKey]) {
                monthGroups[monthKey] = [];
            }
            monthGroups[monthKey].push(transaction);
        });

        // Convert to array of month groups with day subgroups
        const sortedMonthGroups = Object.entries(monthGroups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([monthKey, monthTransactions]) => {
                // Group transactions within this month by day
                const dayGroups: { [key: string]: { date: string; transactions: Transaction[] } } = {};
                
                monthTransactions.forEach(transaction => {
                    const date = transaction.date;
                    if (!dayGroups[date]) {
                        dayGroups[date] = {
                            date,
                            transactions: []
                        };
                    }
                    dayGroups[date].transactions.push(transaction);
                });

                // Sort transactions within each day by creation time
                Object.values(dayGroups).forEach(group => {
                    group.transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                });

                // Sort days within the month
                const sortedDayGroups = Object.values(dayGroups).sort((a, b) =>  
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                return {
                    monthKey,
                    monthName: new Date(monthKey + '-01').toLocaleDateString('en-GB', {
                        month: 'long',
                        year: 'numeric'
                    }),
                    dayGroups: sortedDayGroups,
                    totalAmount: monthTransactions.reduce((sum, t) => sum + t.amount, 0)
                };
            });

        // Add starting balance as a special group at the end
        if (startingBalanceTransaction) {
            sortedMonthGroups.push({
                monthKey: 'starting-balance',
                monthName: 'Starting Balance',
                dayGroups: [{
                    date: 'starting-balance',
                    transactions: [startingBalanceTransaction]
                }],
                totalAmount: startingBalanceTransaction.amount
            });
        }

        return sortedMonthGroups;
    };

    return (
        <ProtectedRoute>
            <TransactionModalWrapper setShowModal={setShowModal} />
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
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <div className="hidden md:block"><Navbar /></div>
            <Sidebar />
            <MobileNav />

            {/*Mobile add transactions*/}
            <div className="md:hidden flex items-center justify-between mb-0 sticky pt-3 pb-2 top-0 bg-background z-30 px-8 border-b border-white/[.2] min-w-screen">
                <div className="flex items-center gap-3">
                    {showMobileSearch ? (
                        <div className="absolute inset-x-0 top-0 bg-background pt-3 pb-2 px-8 border-b border-white/[.2] z-40 animate-[slideIn_0.2s_ease-out]">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {setSearchQuery(''), setShowMobileSearch(false)}}
                                    className="p-2 hover:bg-white/[.05] rounded-lg"
                                >
                                    <Image
                                        src="/chevron-left.svg"
                                        alt="Back"
                                        width={24}
                                        height={24}
                                        className="opacity-60"
                                    />
                                </button>
                                <input
                                    ref={mobileSearchRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search transactions..."
                                    className="w-full bg-transparent border-none outline-none text-lg placeholder:text-white/30"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-2 hover:bg-white/[.05] rounded-lg"
                                    >
                                        <Image
                                            src="/minus.svg"
                                            alt="Clear"
                                            width={16}
                                            height={16}
                                            className="opacity-60 invert"
                                        />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold tracking-[-.01em]">Transactions</h1>
                    )}
                </div>
                <div className="flex gap-5">
                    {!showMobileSearch && (
                        <button
                            onClick={() => setShowMobileSearch(true)}
                            className="p-2 hover:bg-white/[.05] rounded-lg transition-all opacity-70 hover:opacity-100"
                        >
                            <Image
                                src="/magnify.svg"
                                alt="Search"
                                width={24}
                                height={24}
                                className="opacity-100 invert"
                            />
                        </button>
                    )}
                    <button
                        onClick={() => {setLoading(true); fetchTransactions()}}
                        className={`flex gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] ${loading ? 'opacity-50 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}`}
                        disabled={loading}
                        title="Refresh transactions"
                    >
                        <svg className={`${loading ? 'animate-spin' : ''}`}width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g transform="scale(-1, 1) translate(-48, 0)">
                            <path d="M24 6a18 18 0 1 1-12.73 5.27" stroke="currentColor" strokeWidth="4"/>
                            <path d="M12 4v8h8" stroke="currentColor" strokeWidth="4"/>
                        </g></svg>
                        Sync
                    </button>
                </div>
            </div>

            {/*Main*/}
            <main className="pt-4 md:pt-16 pb-24 md:pb-6 md:pl-64 fade-in">
                <div className="max-w-7xl mx-auto p-4 md:p-6">
                  

                    <div className="hidden md:flex items-center justify-between mb-0 md:mb-5 md:sticky md:top-16 bg-background md:z-30 py-4 -mt-4 -mx-4 px-4 md:-mx-6 md:px-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Transactions</h1>
                        </div>
                        
                        <div className="flex-1 max-w-md mx-8">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search transactions..."
                                    className="w-full p-2 pl-9 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                />
                                <Image
                                    src="/magnify.svg"
                                    alt="Search"
                                    width={16}
                                    height={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 invert"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/[.1] rounded-full transition-colors"
                                    >
                                        <Image
                                            src="/minus.svg"
                                            alt="Clear"
                                            width={12}
                                            height={12}
                                            className="opacity-60 invert"
                                        />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-5">
                            <button
                                onClick={() => {setLoading(true); fetchTransactions()}}
                                className={` flex gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] ${loading ? 'opacity-50 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}`}
                                disabled={loading}
                                title="Refresh transactions"
                            >
                            <svg className={`${loading ? 'animate-spin' : ''}`}width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g transform="scale(-1, 1) translate(-48, 0)">
                                <path
                                    d="M24 6a18 18 0 1 1-12.73 5.27"
                                    stroke="currentColor"
                                    strokeWidth="4"
                
                                />
                                <path
                                    d="M12 4v8h8"
                                    stroke="currentColor"
                                    strokeWidth="4"
                       
                                />
                                </g>
                                </svg>
                                <p className="hidden lg:inline">Sync now</p>
                             
                            </button>
                             
                            <button 
                                title="Add Transaction" onClick={() => {setModalTransaction(null); setShowModal(true)}}
                                className={` gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] md:flex hidden ${loading ? 'opacity-50 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}`}
                            >
                            <svg width="24" height="24" viewBox= "-2 -2 50 50 " fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <g>
                            <path d="M41.267,18.557H26.832V4.134C26.832,1.851,24.99,0,22.707,0c-2.283,0-4.124,1.851-4.124,4.135v14.432H4.141
                                c-2.283,0-4.139,1.851-4.138,4.135c-0.001,1.141,0.46,2.187,1.207,2.934c0.748,0.749,1.78,1.222,2.92,1.222h14.453V41.27
                                c0,1.142,0.453,2.176,1.201,2.922c0.748,0.748,1.777,1.211,2.919,1.211c2.282,0,4.129-1.851,4.129-4.133V26.857h14.435
                                c2.283,0,4.134-1.867,4.133-4.15C45.399,20.425,43.548,18.557,41.267,18.557z" stroke="currentColor" strokeWidth="4"/>
                            </g>
                            </svg>
                            <p className="hidden lg:inline">Add Transaction</p>
                            </button>
                        </div>
                    </div>

                      {/* Balance Section */}
                    <div className="border-b-3 border-white/70 flex justify-between items-center bg-white/[.03] md:p-4 p-3 rounded-lg md:mb-6 mb-3 mt-0">
                        <div>
                            <h2 className="text-lg font-medium text-white/90">Balance</h2>
                            <button
                                onClick={() => setShowBankCompareModal(true)}
                                className="text-xs text-white/50 hover:text-white/70 transition-colors "
                            >
                                Compare with bank →
                            </button>
                        </div>
                        <span className={`text-2xl font-bold tabular-nums ${calculateTotalBalance(transactions) < 0 ? 'text-reddy' : 'text-green'}`}>
                            {formatAmount(calculateTotalBalance(transactions))}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredTransactions.length === 0 && searchQuery ? (
                        <div className="text-center text-white/60 mt-20">
                            <Image
                                src="/magnify.svg"
                                alt="No results"
                                width={48}
                                height={48}
                                className="opacity-40 invert mx-auto mb-4"
                            />
                            <h2 className="text-xl font-semibold mb-2">No matching transactions</h2>
                            <p className="text-sm">Try adjusting your search terms</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center text-white/60 mt-20">
                            <Image
                                src="/transactions.svg"
                                alt="No transactions"
                                width={48}
                                height={48}
                                className="image-black opacity-40 mx-auto mb-4"
                            />
                            <h2 className="text-xl font-semibold mb-2">No transactions yet</h2>
                            <p className="text-sm">Start adding your transactions to track your spending</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {groupTransactionsByMonth(filteredTransactions).map(monthGroup => (
                                <div key={monthGroup.monthKey} className={`space-y-4 ${monthGroup.monthKey === 'starting-balance' ? 'mt-8 pt-8 border-t border-white/[.15]' : ''}`}>
                                    {/* Month Header */}
                                    <div className="flex justify-between items-center sticky top-15 md:top-[8.5rem] bg-background z-30 py-1">
                                        <h2 className="text-lg font-semibold text-white/80">
                                            {monthGroup.monthName}
                                        </h2>
                                        {monthGroup.monthKey !== 'starting-balance' && (
                                            <span className={`text-lg font-semibold tabular-nums ${monthGroup.totalAmount < 0 ? 'text-reddy' : 'text-green'}`}>
                                                {formatAmount(monthGroup.totalAmount)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Day Groups within Month */}
                                    <div className="space-y-6">
                                        {monthGroup.dayGroups.map(group => (
                                            <div key={group.date} className="space-y-2">
                                                <div className="flex justify-between items-center sticky top-20 pt-0 px-3 md:top-[10.5rem] bg-background z-20">
                                                    <h3 className="text-sm font-medium text-white/40">
                                                        {group.date === 'starting-balance' ? 'Starting Balance' : formatDate(group.date)}
                                                    </h3>
                                                    {group.date !== 'starting-balance' && (
                                                        <span className="text-sm font-medium text-white/40 tabular-nums">
                                                            {formatAmount(group.transactions.reduce((total, t) => total + (t.amount), 0))}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    {group.transactions.map((transaction) => (
                                                        <div key={transaction.id} 
                                                            onClick={() => transaction.type !== 'starting' ? (setModalTransaction(transaction), setShowModal(true)) : null}
                                                            className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                                                                transaction.type === 'starting' 
                                                                ? 'bg-white/[.02] cursor-default' 
                                                                : 'bg-white/[.05] hover:bg-white/[.1] cursor-pointer'
                                                            } transition-colors`}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3">
                                                                    <h4 className="font-medium truncate text-white/90">
                                                                        {transaction.type === 'starting' ? 'Initial Net Worth' : transaction.vendors?.name || transaction.vendor}
                                                                    </h4>
                                                                </div>
                                                                {transaction.type !== 'starting' && (
                                                                    <div className="text-sm text-white/40 truncate mt-0.5">
                                                                        {transaction.categories ? transaction.categories.name : "Income"}
                                                                        {transaction.description && (
                                                                            <span className="inline truncate text-white/30 text-sm">
                                                                                &nbsp; - {transaction.description}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className={`font-medium whitespace-nowrap tabular-nums ${
                                                                transaction.type === 'starting' ? 'text-white' : transaction.amount < 0 ? 'text-reddy' : 'text-green'
                                                            }`}>
                                                                {formatAmount(transaction.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <TransactionModal
                transaction={modalTransaction}
                isOpen={showModal}
                onClose={closeModalFunc}
                onSubmit={modalTransaction ? handleUpdateSubmit : handleSubmit}
                onDelete={handleDelete}
            />

            <BankCompareModal
                isOpen={showBankCompareModal}
                onClose={() => setShowBankCompareModal(false)}
                transactions={transactions}
                onTransactionUpdated={fetchTransactions}
            />
        </div>
        </ProtectedRoute>
    );
}
