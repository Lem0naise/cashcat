'use client';

import { createClient } from '@/app/utils/supabase';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Database } from '@/types/supabase';
import TransactionModal from './transaction-modal';
import MoneyInput from './money-input';
import { getCachedUserId } from '../hooks/useAuthUserId';

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

type BankCompareModalProps = {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    onTransactionUpdated: () => void;
    bankAccountId: string | null
};

export default function BankCompareModal({
    isOpen,
    onClose,
    bankAccountId,
    transactions,
    onTransactionUpdated,
}: BankCompareModalProps) {
    const supabase = createClient();
    const [bankBalance, setBankBalance] = useState('');
    const [step, setStep] = useState<'input' | 'results' | 'correction'>('input');
    const [difference, setDifference] = useState(0);
    const [budgetBalance, setBudgetBalance] = useState(0);
    const [potentialIssues, setPotentialIssues] = useState<Transaction[]>([]);
    const [isClosing, setIsClosing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [correctionAmount, setCorrectionAmount] = useState('');
    const [usableTransactions, setUsableTransactions] = useState(transactions);
    const [lastReconciliation, setLastReconciliation] = useState<{
        reconciled_at: string;
        bank_balance: number;
    } | null>(null);

    // Calculate budget balance from transactions
    useEffect(() => {
        // filter transactions by the current bank account
        const filteredTransactions = (transactions.filter(transaction =>
            transaction.account_id === bankAccountId
        ));

        setUsableTransactions(filteredTransactions);

        const balance = filteredTransactions
            .reduce((total, transaction) => total + transaction.amount, 0);
        setBudgetBalance(balance);
    }, [transactions, bankAccountId]);

    // Fetch last reconciliation data
    useEffect(() => {
        const fetchLastReconciliation = async () => {
            if (!isOpen || !bankAccountId) return;

            const userId = getCachedUserId();
            if (!userId) return;

            const { data, error } = await supabase
                .from('bank_reconciliations')
                .select('reconciled_at, bank_balance')
                .eq('user_id', userId)
                .eq('account_id', bankAccountId)
                .order('reconciled_at', { ascending: false })
                .limit(1)
                .maybeSingle();


            if (!error && data) {
                setLastReconciliation(data);
            }
            else {
                setLastReconciliation(null);
            }
        };

        fetchLastReconciliation();
    }, [isOpen, bankAccountId, supabase]);

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const handleCompare = async () => {
        const bankAmount = parseFloat(bankBalance);
        if (isNaN(bankAmount)) {
            toast.error('Please enter a valid bank balance');
            return;
        }

        const diff = bankAmount - budgetBalance;
        setDifference(diff);

        // If balances match, save reconciliation
        if (Math.abs(diff) < 0.01) {
            await saveReconciliation(bankAmount);
        }

        // Find potential problematic transactions
        const recentTransactions = usableTransactions
            .filter(t => t.type !== 'starting')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10); // Last 10 transactions

        // Also include transactions that match the difference amount
        const matchingAmountTransactions = usableTransactions.filter(t =>
            Math.abs(t.amount) === Math.abs(diff) && t.type !== 'starting'
        );

        const combined = [...recentTransactions, ...matchingAmountTransactions];
        const unique = combined.filter((transaction, index, self) =>
            index === self.findIndex(t => t.id === transaction.id)
        );

        setPotentialIssues(unique);
        setStep('results');
    };

    const saveReconciliation = async (bankAmount: number) => {
        try {
            const userId = getCachedUserId();
            if (!userId) return;

            // Simply INSERT a new reconciliation record
            const { error } = await supabase
                .from('bank_reconciliations')
                .insert({
                    user_id: userId,
                    account_id: bankAccountId!,
                    reconciled_at: new Date().toISOString(),
                    bank_balance: bankAmount,
                    cashcat_balance: budgetBalance
                });

            if (error) throw error;

            // Update local state
            setLastReconciliation({
                reconciled_at: new Date().toISOString(),
                bank_balance: bankAmount
            });

            toast.success('Reconciliation saved!');
        } catch (error) {
            console.error('Error saving reconciliation:', error);
            toast.error('Failed to save reconciliation');
        }
    };

    const handleTransactionEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowTransactionModal(true);
    };

    const handleTransactionDelete = async (transactionId: string) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId);

            if (error) throw error;

            toast.success('Transaction deleted successfully');
            onTransactionUpdated();
            handleClose();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            toast.error('Failed to delete transaction');
        }
    };

    const handleTransactionUpdate = async (transaction: {
        account_id: string;
        amount: number;
        date: string;
        vendor: string;
        type: string;
        description?: string;
        category_id?: string | null;
    }) => {
        try {
            if (!selectedTransaction) return;

            const { error } = await supabase
                .from('transactions')
                .update({
                    amount: transaction.amount,
                    type: transaction.type,
                    date: transaction.date,
                    vendor: transaction.vendor,
                    account_id: transaction.account_id,
                    description: transaction.description || undefined,
                    category_id: transaction.category_id || undefined
                })
                .eq('id', selectedTransaction.id);

            if (error) throw error;

            toast.success('Transaction updated successfully');
            setShowTransactionModal(false);
            setSelectedTransaction(null);
            onTransactionUpdated();
            handleClose();
        } catch (error) {
            console.error('Error updating transaction:', error);
            toast.error('Failed to update transaction');
        }
    };

    const handleBalanceCorrection = async () => {
        try {
            const correctionAmountNum = parseFloat(correctionAmount);
            if (isNaN(correctionAmountNum)) {
                toast.error('Please enter a valid correction amount');
                return;
            }

            const userId = getCachedUserId();
            if (!userId) throw new Error('Not authenticated');

            // Insert a Balance Correction 
            {/*const { error } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    amount: correctionAmountNum,
                    type: correctionAmountNum > 0 ? 'income' : 'income',
                    date: new Date().toISOString().split('T')[0],
                    vendor: 'Balance Correction',
                    description: `Bank reconciliation adjustment: ${formatCurrency(correctionAmountNum)}`,
                    created_at: new Date().toISOString(),
                });
            if (error) throw error;
            */}

            // Instead, adjust the starting balance
            const startingTransaction = usableTransactions.find(t => t.type === 'starting' && t.account_id === bankAccountId);

            if (!startingTransaction) {
                toast.error("Could not find starting transaction. Please contact support.");
                return;
            }
            const newAmount = startingTransaction.amount + correctionAmountNum;

            const { error } = await supabase
                .from('transactions')
                .update({
                    amount: newAmount,
                })
                .eq('id', startingTransaction.id);
            if (error) throw error;

            toast.success('Balance correction added successfully');
            onTransactionUpdated();
            handleClose();
        } catch (error) {
            console.error('Error adding balance correction:', error);
            toast.error('Failed to add balance correction');
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setStep('input');
            setBankBalance('');
            setDifference(0);
            setPotentialIssues([]);
            setCorrectionAmount('');
            onClose();
        }, 100);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    if (!bankAccountId) {
        return null; // Return, the modal cannot be shown without a bank account to reconciliate
    }

    return (
        <>
            <div
                className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'
                    }`}
                onClick={handleBackdropClick}
            >
                <div
                    className={`bg-white/[.03] md:rounded-lg border-b-4 w-full md:max-w-lg md:p-6 min-h-[100dvh] md:min-h-0 ${isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                        }`}
                >
                    <div className="flex justify-between items-center p-4 md:p-0 md:mb-6 border-b border-white/[.15] md:border-0">
                        <h2 className="text-xl font-bold">Compare with Bank</h2>
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

                    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-auto">
                        <div className="flex-1 overflow-y-auto p-4 md:p-0">
                            {step === 'input' && (
                                <div className="space-y-6">
                                    <div className="bg-white/[.03] rounded-lg p-4">
                                        <h3 className="font-medium mb-2">Your CashCat Balance</h3>
                                        <p className="text-2xl font-bold text-green">{formatCurrency(budgetBalance)}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-white/50 mb-2">Your Actual Bank Balance</label>
                                        <MoneyInput
                                            value={bankBalance}
                                            onChange={(value) => setBankBalance(value)}
                                            placeholder="0.00"
                                            currencySymbol={true}
                                            className=""
                                        />
                                    </div>

                                    <div className="bg-blue/10 border border-blue/20 rounded-lg p-4">
                                        <h4 className="font-medium text-blue mb-2">How this works:</h4>
                                        <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                                            <li>Enter your current bank account balance</li>
                                            <li>We'll compare it with your CashCat balance</li>
                                            <li>If they don't match, we'll help you find the issue</li>
                                            <li>You can edit transactions or add a correction</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {step === 'results' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        {Math.abs(difference) < 0.01 ? (
                                            <div className="bg-green/10 border border-green/20 rounded-lg p-6">
                                                <div className="text-4xl mb-2">✅</div>
                                                <h3 className="text-xl font-bold text-green mb-2">Perfect Match!</h3>
                                                <p className="text-white/70">Your CashCat balance matches your bank balance exactly.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-reddy/10 border border-reddy/20 rounded-lg p-6">
                                                <div className="text-4xl mb-2">⚠️</div>
                                                <h3 className="text-xl font-bold text-reddy mb-2">Difference Found</h3>
                                                <p className="text-white/70 mb-3">
                                                    Your bank has <span className="font-bold">{formatCurrency(Math.abs(difference))}</span>
                                                    {difference > 0 ? ' more' : ' less'} than CashCat shows.
                                                </p>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-white/50">Bank Balance</p>
                                                        <p className="font-medium">{formatCurrency(parseFloat(bankBalance))}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/50">CashCat Balance</p>
                                                        <p className="font-medium">{formatCurrency(budgetBalance)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {Math.abs(difference) >= 0.01 && (
                                        <>
                                            <div>
                                                <h4 className="font-medium mb-3">Recent Transactions to Review:</h4>
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {potentialIssues.map((transaction) => (
                                                        <div key={transaction.id} className="bg-white/[.05] rounded-lg p-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="font-medium">{transaction.vendor}</p>
                                                                    <p className="text-sm text-white/60">{new Date(transaction.date).toLocaleDateString()}</p>
                                                                </div>
                                                                <p className={`font-medium ${transaction.amount < 0 ? 'text-reddy' : 'text-green'}`}>
                                                                    {formatCurrency(transaction.amount)}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleTransactionEdit(transaction)}
                                                                    className="px-3 py-1 bg-blue/20 text-blue rounded text-xs hover:bg-blue/30 transition-colors"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleTransactionDelete(transaction.id)}
                                                                    className="px-3 py-1 bg-reddy/20 text-reddy rounded text-xs hover:bg-reddy/30 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="border-t border-white/[.15] pt-4">
                                                <h4 className="font-medium mb-2">Or add a balance correction:</h4>
                                                <p className="text-sm text-white/60 mb-3">
                                                    This is less precise but will quickly fix the difference.
                                                    The correction will adjust your account's initial balance.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setCorrectionAmount(difference.toFixed(2));
                                                        setStep('correction');
                                                    }}
                                                    className="w-full py-2 bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors text-sm"
                                                >
                                                    Add Balance Correction ({formatCurrency(difference)})
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {Math.abs(difference) >= 0.01 && lastReconciliation && (
                                        <div className="bg-blue/10 border border-blue/20 rounded-lg p-4 mb-4">
                                            <h4 className="font-medium text-blue mb-2">Search Tip</h4>
                                            <p className="text-sm text-white/70">
                                                Your last successful reconciliation was on{' '}
                                                <span className="font-medium">
                                                    {new Date(lastReconciliation.reconciled_at).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </span>
                                                . Check transactions after this date to find the discrepancy.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setStep('input')}
                                        className="w-full py-2 bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Check Again
                                    </button>
                                </div>
                            )}

                            {step === 'correction' && (
                                <div className="space-y-6">
                                    <div className="bg-yellow/10 border border-yellow/20 rounded-lg p-4">
                                        <h3 className="font-medium text-yellow mb-2">Balance Correction</h3>
                                        <p className="text-sm text-white/70">
                                            This will adjust your account's initial balance to make your current balance your bank balance.
                                            It's better to find and fix the actual incorrect transaction, but this works as a quick fix.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-white/50 mb-2">Correction Amount</label>
                                        <MoneyInput
                                            value={correctionAmount}
                                            onChange={(value) => setCorrectionAmount(value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            {lastReconciliation && (
                                <div className="mt-6 bg-green/10 border border-green/20 rounded-lg p-4">
                                    <h4 className="font-medium text-green mb-2">Last Reconciliation</h4>
                                    <div className="text-sm text-white/70 space-y-1">
                                        <p>
                                            <span className="text-white/50">Date: </span>
                                            {new Date(lastReconciliation.reconciled_at).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <p>
                                            <span className="text-white/50">Balance: </span>
                                            {formatCurrency(lastReconciliation.bank_balance)}
                                        </p>
                                        <p className="text-xs text-white/50 mt-2">
                                            Your balance matched CashCat on this date. Any problems likely occurred since then.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed bottom section for buttons */}
                        <div className="p-4 md:p-0 md:pt-4 border-t border-white/[.15] md:border-0 flex-shrink-0">
                            {step === 'input' && (
                                <button
                                    onClick={handleCompare}
                                    disabled={!bankBalance}
                                    className="w-full py-3 bg-green text-black font-medium rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Compare Balances
                                </button>
                            )}

                            {step === 'correction' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('results')}
                                        className="flex-1 py-2 bg-white/[.05] hover:bg-white/[.1] rounded-lg transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleBalanceCorrection}
                                        disabled={!correctionAmount}
                                        className="flex-1 py-2 bg-green text-black font-medium rounded-lg hover:bg-green/80 transition-colors duration-200 disabled:opacity-50"
                                    >
                                        Add Correction
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showTransactionModal && selectedTransaction && (
                <TransactionModal
                    transaction={selectedTransaction}
                    isOpen={showTransactionModal}
                    onClose={() => {
                        setShowTransactionModal(false);
                        setSelectedTransaction(null);
                    }}
                    onSubmit={handleTransactionUpdate}
                    onDelete={() => handleTransactionDelete(selectedTransaction.id)}
                />
            )}
        </>
    );
}
