'use client';
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../../../types/supabase';
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import MobileNav from "../../components/mobileNav";
import TransactionModal from "../../components/transaction-modal";
import { isDevelopment, mockSupabase } from "../../utils/mocks";
import ProtectedRoute from "../../components/protected-route";

type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function Transactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTransaction, setModalTransaction] = useState<Transaction | null>(null);
    const router = useRouter();
    const supabase = isDevelopment ? mockSupabase : createClientComponentClient<Database>();

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });
            
            if (error) throw error;
            setTransactions(data || []);
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
    }) => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');
            if (!modalTransaction) throw new Error('No transaction to update');

            const { error } = await supabase
                .from('transactions')
                .update({
                    amount: transaction.amount,
                    date: transaction.date,
                    vendor: transaction.vendor,
                    description: transaction.description || null
                })
                .eq('id', modalTransaction.id);
            
            if (error) throw error;
            
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
    }) => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const { error } = await supabase.from('transactions').insert({
                user_id: user.id,
                amount: transaction.amount,
                date: transaction.date,
                vendor: transaction.vendor,
                description: transaction.description || null
            });

            if (error) throw error;
            
            fetchTransactions();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving transaction:', error);
            // TODO: Show error toast
        }
    };

    const handleDelete = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');
            if (!modalTransaction) throw new Error('No transaction to delete');

            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', modalTransaction.id);

            if (error) throw error;
            
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
            <div className="md:hidden flex items-center justify-between mb-0 sticky pt-3 pb-2 top-0 bg-background z-30 px-8  border-b border-white/[.2] min-w-screen">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-[-.01em]">Transactions</h1>
                    
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
                            strokeWidth="4"/><path
                            d="M12 4v8h8"
                            stroke="currentColor"
                            strokeWidth="4"
                        /></g></svg>
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
                    ) : transactions.length === 0 ? (
                        <div className="text-center text-black/60 dark:text-white/60 mt-20">
                            <Image
                                src="/file.svg"
                                alt="No transactions"
                                width={48}
                                height={48}
                                className="opacity-40 mx-auto mb-4"
                            />
                            <h2 className="text-xl font-semibold mb-2">No transactions yet</h2>
                            <p className="text-sm">Start adding your transactions to track your spending</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupTransactionsByDate(transactions).map(group => (
                                <div key={group.date} className="space-y-2 mb-2 md:mb-5">
                                    <h3 className="text-sm font-medium text-white/40 sticky top-16 md:top-[8.5rem] bg-background py-0 z-20">
                                        {formatDate(group.date)}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.transactions.map((transaction) => (
                                            <div onClick={() => {setModalTransaction(transaction); setShowModal(true)}}
                                                key={transaction.id}
                                                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[.05] hover:bg-white/[.1] transition-colors"
                                            >
                                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                                    <h4 className="font-medium truncate">{transaction.vendor}</h4>
                                                    {transaction.description && (
                                                        <span className="hidden md:block truncate text-white/30 text-sm">
                                                            {transaction.description}
                                                        </span>
                                                    )}
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
