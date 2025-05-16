'use client';
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../../../types/supabase';
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import MobileNav from "../../components/mobileNav";
import TransactionModal from "../../components/transaction-modal";
import { isDevelopment, mockSupabase } from "../../utils/mocks";
import ProtectedRoute from "../../components/protected-route";
import { submitTransaction, updateTransaction, deleteTransaction } from '../../utils/transactions';

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
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTransaction, setModalTransaction] = useState<Transaction | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const supabase = createClientComponentClient<Database>();

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
            setTimeout(()=>{setLoading(false)}, 500);
        }
    };

    const handleUpdateSubmit = async (transaction: {
        amount: number;
        date: string;
        vendor: string;
        description?: string;
        category_id: string;
    }) => {
        try {
            if (!modalTransaction) throw new Error('No transaction to update');
            await updateTransaction(modalTransaction.id, transaction);
            fetchTransactions();
            setShowModal(false);
            setModalTransaction(null);
        } catch (error) {
            console.error('Error updating transaction:', error);
            // TODO: Show error toast
        }
    };

    const handleSubmit = async (transaction: {
        amount: number;
        date: string;
        vendor: string;
        description?: string;
        category_id: string;
    }) => {
        try {
            if (isDevelopment) {
                // In development mode, use mock data
                const { data: { user } } = await mockSupabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                await mockSupabase
                    .from('transactions')
                    .insert({
                        ...transaction,
                        user_id: user.id
                    });
            } else {
                await submitTransaction(transaction);
            }
            fetchTransactions();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving transaction:', error);
            // TODO: Show error toast
        }
    };

    const handleDelete = async () => {
        try {
            if (!modalTransaction) throw new Error('No transaction to delete');
            if (isDevelopment) {
                // In development mode, use mock data
                await mockSupabase
                    .from('transactions')
                    .delete()
                    .eq('id', modalTransaction.id);
            } else {
                await deleteTransaction(modalTransaction.id);
            }
            fetchTransactions();
            setShowModal(false);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            // TODO: Show error toast
        }
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
        const groups: { [key: string]: { date: string; transactions: Transaction[] } } = {};
        
        transactions.forEach(transaction => {
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
        return Object.values(groups).sort((a, b) =>  // sort by date descending
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    };

    return (
        <ProtectedRoute>
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
                                Sync now
                             
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
                            Add Transaction
                            </button>
                        </div>
                        
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
                        <div className="space-y-6">
                            {groupTransactionsByDate(filteredTransactions).map(group => (
                                <div key={group.date} className="space-y-2 mb-2 md:mb-5">
                                    <div className="flex justify-between items-center sticky top-15 pt-0 px-3 md:top-[8.5rem] bg-background z-20">
                                        <h3 className="text-sm font-medium text-white/40">
                                            {formatDate(group.date)}
                                        </h3>
                                        <span className="text-sm font-medium text-white/40 tabular-nums">
                                            {formatAmount(group.transactions.reduce((total, t) => 
                                                total + (t.amount < 0 ? t.amount : 0), 0
                                            ))}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {group.transactions.map((transaction) => (
                                            <div onClick={() => {setModalTransaction(transaction); setShowModal(true)}}
                                                key={transaction.id}
                                                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[.05] hover:bg-white/[.1] transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-medium truncate">{transaction.vendors?.name || transaction.vendor}</h4>
                                                        
                                                    </div>
                                                    {transaction.categories && (<div className="text-sm text-white/40 truncate mt-0.5">
                                                        {transaction.categories.name}
                                                        {transaction.description && (
                                                            <span className="inline truncate text-white/30 text-sm">
                                                              &nbsp; - {transaction.description}
                                                            </span>
                                                        )}
                                                    </div>)}
                                                   
                                                </div>
                                                <span className={`font-medium whitespace-nowrap tabular-nums ${
                                                    transaction.amount < 0 ? 'text-reddy' : 'text-green'
                                                }`}>
                                                    {formatAmount(transaction.amount)}
                                                </span>
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
                onClose={() => setShowModal(false)}
                onSubmit={modalTransaction ? handleUpdateSubmit : handleSubmit}
                onDelete={handleDelete}
            />
        </div>
        </ProtectedRoute>
    );
}
