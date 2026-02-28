'use client';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import toast, { Toaster } from 'react-hot-toast';
import MobileNav from "../../components/mobileNav";
import Navbar from "../../components/navbar";
import ProtectedRoute from "../../components/protected-route";
import Sidebar from "../../components/sidebar";
import TransactionModal from "../../components/transaction-modal";
import TransactionModalWrapper from "@/app/components/transactionSus";
import BankCompareModal from "../../components/bank-compare-modal";
import AccountSelector from "../../components/account-selector";
import AccountModal from "../../components/account-modal";
import ExportModal from "../../components/export-modal";
import ImportModal from "../../components/import-modal";
import VendorManagerModal from "../../components/vendor-manager-modal";
import BulkEditModal from "../../components/bulk-edit-modal";
import { useTransactions, TransactionWithDetails } from '../../hooks/useTransactions';
import { useTransfers } from '../../hooks/useTransfers';
import { useCreateTransfer, useUpdateTransfer, useDeleteTransfer } from '../../hooks/useTransfers';
import type { TransferWithAccounts } from '@/types/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsage, FREE_IMPORT_LIMIT, FREE_EXPORT_LIMIT } from '../../hooks/useUsage';
import { ProGateOverlay } from '../../components/pro-gate-overlay';

import { useCreateTransaction } from '../../hooks/useCreateTransaction';
import { useUpdateTransaction } from '../../hooks/useUpdateTransaction';
import { formatCurrency } from '../../components/charts/utils';
import { useDeleteTransaction } from '../../hooks/useDeleteTransaction';
import { useSyncAll } from '../../hooks/useSyncAll';
import QuickAddRow from '../../components/quick-add-row';

// Combined type for displaying both transactions and transfers
type CombinedItem =
    | { type: 'transaction'; data: TransactionWithDetails }
    | { type: 'transfer'; data: TransferWithAccounts };

export default function Transactions() {
    const router = useRouter();

    // TanStack Query Hooks
    const { data: allTransactions = [], isLoading: loadingTransactions, refetch: refetchTransactions } = useTransactions();
    const { data: allTransfers = [], isLoading: loadingTransfers, refetch: refetchTransfers } = useTransfers();

    // Client-side pagination state
    const [visibleCount, setVisibleCount] = useState(50);
    const transactions = allTransactions;
    const transfers = allTransfers;

    const createMutation = useCreateTransaction();
    const updateMutation = useUpdateTransaction();
    const deleteMutation = useDeleteTransaction();

    const createTransferMutation = useCreateTransfer();
    const updateTransferMutation = useUpdateTransfer();
    const deleteTransferMutation = useDeleteTransfer();

    const [showModal, setShowModal] = useState(false);
    const [modalTransaction, setModalTransaction] = useState<TransactionWithDetails | null>(null);
    const [modalTransfer, setModalTransfer] = useState<TransferWithAccounts | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [showBankCompareModal, setShowBankCompareModal] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [postImportAccountId, setPostImportAccountId] = useState<string | null>(null);
    const [showPostImportReconcile, setShowPostImportReconcile] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showDesktopMenu, setShowDesktopMenu] = useState(false);
    const [showVendorManager, setShowVendorManager] = useState(false);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const quickAddAmountRef = useRef<HTMLInputElement>(null);
    const desktopMenuRef = useRef<HTMLDivElement>(null);

    const { subscription } = useSubscription();
    const { importCount, exportCount } = useUsage();
    const [showProGate, setShowProGate] = useState<'import' | 'export' | null>(null);

    const handleOpenImport = () => {
        if (!subscription?.isActive && importCount >= FREE_IMPORT_LIMIT) {
            setShowProGate('import');
        } else {
            setShowImportModal(true);
        }
    };

    const handleOpenExport = () => {
        if (!subscription?.isActive && exportCount >= FREE_EXPORT_LIMIT) {
            setShowProGate('export');
        } else {
            setShowExportModal(true);
        }
    };

    const loading = loadingTransactions || loadingTransfers;
    const { syncAll, isSyncing } = useSyncAll();

    // Global 'N' hotkey — focus the quick-add amount field on desktop
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
            if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable) {
                e.preventDefault();
                quickAddAmountRef.current?.focus();
                quickAddAmountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Close desktop menu when clicking outside
    useEffect(() => {
        if (!showDesktopMenu) return;
        const handler = (e: MouseEvent) => {
            if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) {
                setShowDesktopMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDesktopMenu]);

    const refetch = () => {
        refetchTransactions();
        refetchTransfers();
    };

    const closeModalFunc = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('showModal')) {
            router.replace('/budget/transactions', { scroll: false });
        }
        setShowModal(false);
        setModalTransaction(null);
        setModalTransfer(null);
    }

    // Filter transfers based on search query and selected account
    const filteredTransfers = transfers.filter(transfer => {
        // Account filter
        if (selectedAccountId && transfer.from_account_id !== selectedAccountId && transfer.to_account_id !== selectedAccountId) {
            return false;
        }

        // Search filter
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase().trim();
        const amount = transfer.amount.toString();
        const date = new Date(transfer.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const fromAccountName = transfer.from_account?.name || '';
        const toAccountName = transfer.to_account?.name || '';
        const desc = transfer.description || '';

        return (
            fromAccountName.toLowerCase().includes(query) ||
            toAccountName.toLowerCase().includes(query) ||
            desc.toLowerCase().includes(query) ||
            amount.includes(query) ||
            date.toLowerCase().includes(query) ||
            'transfer'.includes(query)
        );
    });

    // Filter transactions based on search query and selected account
    const filteredTransactions = transactions.filter(transaction => {
        // Account filter
        if (selectedAccountId && transaction.account_id !== selectedAccountId) {
            return false;
        }

        // Search filter
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase().trim();
        const amount = Math.abs(transaction.amount).toString();
        const date = new Date(transaction.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Safe checks for potentially null joined fields
        const vendorName = transaction.vendors?.name || transaction.vendor || '';
        const categoryName = transaction.categories?.name || '';
        const type = transaction.type || '';
        const desc = transaction.description || '';

        return (
            vendorName.toLowerCase().includes(query) ||
            desc.toLowerCase().includes(query) ||
            categoryName.toLowerCase().includes(query) ||
            type.toLowerCase().includes(query) ||
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

    const handleUpdateSubmit = async (transactionData: {
        amount: number;
        date: string;
        vendor: string;
        type: string;
        account_id: string;
        description?: string;
        category_id?: string | null;
    }) => {
        try {
            if (!modalTransaction) throw new Error('No transaction to update');

            // We use 'mutateAsync' to await the result for the toast
            // Note: The hook takes { id, updates }
            const promise = updateMutation.mutateAsync({
                id: modalTransaction.id,
                updates: {
                    ...transactionData,
                    category_id: transactionData.category_id || undefined
                }
            });

            await toast.promise(promise, {
                loading: 'Updating transaction...',
                success: 'Transaction updated successfully',
                error: 'Failed to update transaction'
            });

            setShowModal(false);
            setModalTransaction(null);
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    };

    const handleSubmit = async (transactionData: {
        amount: number;
        type: string;
        date: string;
        vendor: string;
        account_id: string;
        description?: string;
        category_id?: string | null;
    }) => {
        try {
            const promise = createMutation.mutateAsync({
                ...transactionData,
                category_id: transactionData.category_id || undefined
            });

            await toast.promise(promise, {
                loading: 'Creating transaction...',
                success: 'Transaction created successfully',
                error: 'Failed to create transaction'
            });

            setShowModal(false);
        } catch (error) {
            console.error('Error saving transaction:', error);
        }
    };

    const handleDelete = async () => {
        try {
            if (!modalTransaction) throw new Error('No transaction to delete');

            const promise = deleteMutation.mutateAsync(modalTransaction.id);

            await toast.promise(promise, {
                loading: 'Deleting transaction...',
                success: 'Transaction deleted successfully',
                error: 'Failed to delete transaction'
            });

            setShowModal(false);
            setModalTransaction(null);
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    // Transfer handlers
    const handleTransferSubmit = async (transferData: {
        from_account_id: string;
        to_account_id: string;
        amount: number;
        date: string;
        description?: string;
    }) => {
        try {
            const promise = createTransferMutation.mutateAsync(transferData);

            await toast.promise(promise, {
                loading: 'Creating transfer...',
                success: 'Transfer created successfully',
                error: 'Failed to create transfer'
            });

            setShowModal(false);
        } catch (error) {
            console.error('Error creating transfer:', error);
        }
    };

    const handleTransferUpdate = async (transferData: {
        from_account_id: string;
        to_account_id: string;
        amount: number;
        date: string;
        description?: string;
    }) => {
        try {
            if (!modalTransfer) throw new Error('No transfer to update');

            const promise = updateTransferMutation.mutateAsync({
                id: modalTransfer.id,
                updates: transferData
            });

            await toast.promise(promise, {
                loading: 'Updating transfer...',
                success: 'Transfer updated successfully',
                error: 'Failed to update transfer'
            });

            setShowModal(false);
            setModalTransfer(null);
        } catch (error) {
            console.error('Error updating transfer:', error);
        }
    };

    const handleTransferDelete = async () => {
        try {
            if (!modalTransfer) throw new Error('No transfer to delete');

            const promise = deleteTransferMutation.mutateAsync(modalTransfer.id);

            await toast.promise(promise, {
                loading: 'Deleting transfer...',
                success: 'Transfer deleted successfully',
                error: 'Failed to delete transfer'
            });

            setShowModal(false);
            setModalTransfer(null);
        } catch (error) {
            console.error('Error deleting transfer:', error);
        }
    };

    // Calculate total balance including transfers (when viewing specific account)
    const calculateTotalBalance = (txs: TransactionWithDetails[], tfrs: TransferWithAccounts[], accountId: string | null) => {
        console.log('DEBUG: Number of transactions in transactions page:', txs.length);
        const transactionTotal = txs.reduce((total, transaction) => total + transaction.amount, 0);

        // If viewing all accounts, transfers cancel out (don't include them)
        if (!accountId) {
            return transactionTotal;
        }

        // If viewing a specific account, include transfers
        const transferTotal = tfrs.reduce((total, transfer) => {
            // Money leaving this account (negative)
            if (transfer.from_account_id === accountId) {
                return total - transfer.amount;
            }
            // Money entering this account (positive)
            if (transfer.to_account_id === accountId) {
                return total + transfer.amount;
            }
            return total;
        }, 0);

        return transactionTotal + transferTotal;
    };

    // Helper function to get the transfer amount for a specific account
    // Returns negative if money is leaving, positive if entering, 0 if not related
    const getTransferAmountForAccount = (transfer: TransferWithAccounts, accountId: string | null): number => {
        if (!accountId) return 0; // When viewing all accounts, transfers are neutral
        if (transfer.from_account_id === accountId) return -transfer.amount;
        if (transfer.to_account_id === accountId) return transfer.amount;
        return 0;
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

    const formatAmount = (amount: number) => formatCurrency(amount);

    const groupTransactionsByMonth = (txs: TransactionWithDetails[], tfrs: TransferWithAccounts[], accountId: string | null) => {
        // Filter out starting balance transactions
        const regularTransactions = txs.filter(t => t.type !== 'starting');
        const startingBalanceTransactions = txs.filter(t => t.type === 'starting');

        // Combine transactions and transfers into a unified array
        const combinedItems: CombinedItem[] = [
            ...regularTransactions.map(t => ({ type: 'transaction' as const, data: t })),
            ...tfrs.map(t => ({ type: 'transfer' as const, data: t }))
        ];

        // Group by month
        const monthGroups: { [key: string]: CombinedItem[] } = {};

        combinedItems.forEach(item => {
            const date = new Date(item.data.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthGroups[monthKey]) {
                monthGroups[monthKey] = [];
            }
            monthGroups[monthKey].push(item);
        });

        // Convert to array of month groups with day subgroups
        const sortedMonthGroups = Object.entries(monthGroups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([monthKey, monthItems]) => {
                // Group items within this month by day
                const dayGroups: { [key: string]: { date: string; items: CombinedItem[] } } = {};

                monthItems.forEach(item => {
                    const date = item.data.date;
                    if (!dayGroups[date]) {
                        dayGroups[date] = {
                            date,
                            items: []
                        };
                    }
                    dayGroups[date].items.push(item);
                });

                // Sort items within each day by creation time
                Object.values(dayGroups).forEach(group => {
                    group.items.sort((a, b) => {
                        const aCreated = new Date(a.data.created_at).getTime();
                        const bCreated = new Date(b.data.created_at).getTime();
                        return bCreated - aCreated;
                    });
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
                    totalAmount: monthItems.reduce((sum, item) => {
                        if (item.type === 'transfer') {
                            // Include transfer amount based on account context
                            return sum + getTransferAmountForAccount(item.data, accountId);
                        }
                        return sum + item.data.amount;
                    }, 0)
                };
            });

        // Add starting balance as a special group at the end
        if (startingBalanceTransactions.length != 0) {
            sortedMonthGroups.push({
                monthKey: 'starting-balance',
                monthName: 'Starting Balance',
                dayGroups: [{
                    date: 'starting-balance',
                    items: startingBalanceTransactions.map(t => ({ type: 'transaction' as const, data: t }))
                }],
                totalAmount: startingBalanceTransactions.reduce((sum, t) => sum + t.amount, 0)
            });
        }

        return sortedMonthGroups;
    };

    return (
        <ProtectedRoute>
            <TransactionModalWrapper setShowModal={setShowModal} />
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                transactions={transactions}
            />
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={(importedAccountIds) => {
                    refetch();
                    if (importedAccountIds && importedAccountIds.length > 0) {
                        setPostImportAccountId(importedAccountIds[0]);
                        setShowPostImportReconcile(true);
                    }
                }}
            />
            {/* Pro Gate Overlay for import/export limits */}
            {showProGate && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 font-[family-name:var(--font-suse)]"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowProGate(null); }}
                >
                    <ProGateOverlay
                        featureName={showProGate === 'import' ? 'Unlimited Imports' : 'Unlimited Exports'}
                        featureDescription={
                            showProGate === 'import'
                                ? `You've used your ${FREE_IMPORT_LIMIT} free imports. Upgrade to CashCat Pro for unlimited CSV imports.`
                                : `You've used your ${FREE_EXPORT_LIMIT} free exports. Upgrade to CashCat Pro for unlimited data exports.`
                        }
                        dismissible={true}
                        onClose={() => setShowProGate(null)}
                    />
                </div>
            )}
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
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
                <div className="hidden md:block"><Navbar /></div>
                <Sidebar />
                <MobileNav />

                {/* Mobile top bar */}
                <div className="md:hidden flex items-center justify-between mb-0 sticky pt-8 pb-2 top-0 bg-background z-31 px-4 border-b border-white/[.2] min-w-screen">
                    <div className="flex items-center gap-3">
                        {showMobileSearch ? (
                            <div className="absolute inset-x-0 top-0 bg-background pt-8 pb-2 px-8 border-b border-white/[.2] z-40 animate-[slideIn_0.2s_ease-out]">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setSearchQuery(''), setShowMobileSearch(false) }}
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
                                                src="/plus.svg"
                                                alt="Clear"
                                                width={16}
                                                height={16}
                                                className="opacity-60 invert rotate-45"
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <AccountSelector
                                selectedAccountId={selectedAccountId}
                                onAccountChange={setSelectedAccountId}
                                onManageAccounts={() => setShowAccountModal(true)}
                                onImport={handleOpenImport}
                            />
                        )}
                    </div>
                    <div className="flex gap-2">
                        {!showMobileSearch && (
                            <>
                                <button
                                    onClick={() => setShowMobileSearch(true)}
                                    className="p-2 hover:bg-white/[.05] rounded-lg transition-all opacity-70 hover:opacity-100 flex-shrink-0"
                                >
                                    <Image
                                        src="/magnify.svg"
                                        alt="Search"
                                        width={24}
                                        height={24}
                                        className="opacity-100 invert"
                                    />
                                </button>
                            </>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className={`p-2 hover:bg-white/[.05] rounded-lg transition-all ${showMobileMenu ? 'bg-white/[.1]' : ''}`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {showMobileMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40 bg-transparent"
                                        onClick={() => setShowMobileMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                                        <button
                                            onClick={async () => {
                                                await syncAll();
                                                setShowMobileMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${isSyncing ? 'opacity-50' : ''}`}
                                            disabled={isSyncing}
                                        >
                                            <svg className={`${isSyncing ? 'animate-spin' : ''}`} width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <g transform="scale(-1, 1) translate(-48, 0)">
                                                    <path d="M24 6a18 18 0 1 1-12.73 5.27" stroke="currentColor" strokeWidth="4" />
                                                    <path d="M12 4v8h8" stroke="currentColor" strokeWidth="4" />
                                                </g>
                                            </svg>
                                            <span className="text-sm">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleOpenExport();
                                                setShowMobileMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M9 11L12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="text-sm">Export</span>
                                        </button>
                                         <button
                                             onClick={() => {
                                                 handleOpenImport();
                                                 setShowMobileMenu(false);
                                             }}
                                             className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                         >
                                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                 <path d="M12 8L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                 <path d="M9 13L12 16L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                 <path d="M20 16.7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V16.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                             </svg>
                                             <span className="text-sm">Import</span>
                                         </button>
                                         <button
                                              onClick={() => {
                                                  setShowVendorManager(true);
                                                  setShowMobileMenu(false);
                                              }}
                                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-t border-white/[.08]"
                                          >
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                  <circle cx="9" cy="7" r="4" />
                                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                              </svg>
                                              <span className="text-sm">Manage Vendors</span>
                                          </button>
                                          <button
                                              onClick={() => {
                                                  setShowBulkEdit(true);
                                                  setShowMobileMenu(false);
                                              }}
                                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                          >
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <rect x="3" y="5" width="4" height="4" rx="0.5" />
                                                  <path d="M10 7h11" />
                                                  <rect x="3" y="12" width="4" height="4" rx="0.5" />
                                                  <path d="M10 14h11" />
                                                  <rect x="3" y="19" width="4" height="4" rx="0.5" />
                                                  <path d="M10 21h11" />
                                              </svg>
                                              <span className="text-sm">Bulk Edit</span>
                                          </button>
                                     </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/*Main*/}
                <main className="pt-0 md:pt-12 pb-24 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] fade-in">
                    <div className="max-w-7xl mx-auto p-4 md:p-6">
                        <div className="hidden md:flex items-center justify-between mb-0 md:mb-5 md:sticky md:top-16 bg-background md:z-30 py-4 -mt-4 -mx-4 px-4 md:-mx-6 md:px-6">
                            <div className="flex items-center gap-3">
                                <AccountSelector
                                    selectedAccountId={selectedAccountId}
                                    onAccountChange={setSelectedAccountId}
                                    onManageAccounts={() => setShowAccountModal(true)}
                                    onImport={handleOpenImport}
                                />
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
                                                src="/plus.svg"
                                                alt="Clear"
                                                width={12}
                                                height={12}
                                                className="opacity-60 invert rotate-45"
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => { syncAll() }}
                                    className={`flex gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}`}
                                    disabled={isSyncing}
                                    title="Refresh transactions"
                                >
                                    <svg className={`${isSyncing ? 'animate-spin' : ''}`} width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="scale(-1, 1) translate(-48, 0)">
                                            <path d="M24 6a18 18 0 1 1-12.73 5.27" stroke="currentColor" strokeWidth="4" />
                                            <path d="M12 4v8h8" stroke="currentColor" strokeWidth="4" />
                                        </g>
                                    </svg>
                                    <p className="hidden lg:inline">{isSyncing ? 'Syncing...' : 'Sync'}</p>
                                </button>

                                <button
                                    title="Add Transaction"
                                    onClick={() => { setModalTransaction(null); setModalTransfer(null); setShowModal(true) }}
                                    className={`flex gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] ${loading ? 'opacity-50 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}`}
                                >
                                    <svg width="24" height="24" viewBox="-2 -2 50 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <path d="M41.267,18.557H26.832V4.134C26.832,1.851,24.99,0,22.707,0c-2.283,0-4.124,1.851-4.124,4.135v14.432H4.141
                                c-2.283,0-4.139,1.851-4.138,4.135c-0.001,1.141,0.46,2.187,1.207,2.934c0.748,0.749,1.78,1.222,2.92,1.222h14.453V41.27
                                c0,1.142,0.453,2.176,1.201,2.922c0.748,0.748,1.777,1.211,2.919,1.211c2.282,0,4.129-1.851,4.129-4.133V26.857h14.435
                                c2.283,0,4.134-1.867,4.133-4.15C45.399,20.425,43.548,18.557,41.267,18.557z" stroke="currentColor" strokeWidth="4" />
                                        </g>
                                    </svg>
                                    <p className="hidden lg:inline">Add</p>
                                </button>

                                {/* Desktop overflow menu */}
                                <div ref={desktopMenuRef} className="relative">
                                    <button
                                        onClick={() => setShowDesktopMenu(o => !o)}
                                        className={`p-2 rounded-lg transition-all hover:bg-white/[.05] ${showDesktopMenu ? 'bg-white/[.1] opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                        title="More options"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showDesktopMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                                            <button
                                                onClick={() => { handleOpenImport(); setShowDesktopMenu(false); }}
                                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 8L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M9 13L12 16L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M20 16.7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V16.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <span className="text-sm">Import</span>
                                            </button>
                                            <button
                                                onClick={() => { handleOpenExport(); setShowDesktopMenu(false); }}
                                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M9 11L12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <span className="text-sm">Export</span>
                                            </button>
                                            <button
                                                onClick={() => { setShowVendorManager(true); setShowDesktopMenu(false); }}
                                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-t border-white/[.08]"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                    <circle cx="9" cy="7" r="4" />
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>
                                                <span className="text-sm">Manage Vendors</span>
                                            </button>
                                            <button
                                                onClick={() => { setShowBulkEdit(true); setShowDesktopMenu(false); }}
                                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="5" width="4" height="4" rx="0.5" />
                                                    <path d="M10 7h11" />
                                                    <rect x="3" y="12" width="4" height="4" rx="0.5" />
                                                    <path d="M10 14h11" />
                                                    <rect x="3" y="19" width="4" height="4" rx="0.5" />
                                                    <path d="M10 21h11" />
                                                </svg>
                                                <span className="text-sm">Bulk Edit</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Balance Section */}
                        <div className="border-b-3 border-white/70 flex justify-between items-center bg-white/[.03] md:p-4 p-3 rounded-lg md:mb-4 mb-3 mt-0">
                            <div>
                                <h2 className="text-lg font-medium text-white/90">{!selectedAccountId && ("Total ")}Balance</h2>
                                <button
                                    onClick={() => setShowBankCompareModal(true)}
                                    className={`text-xs text-white/50 hover:text-white/70 transition-colors ${selectedAccountId ? 'inline' : 'hidden'}`}
                                >
                                    Compare with bank →
                                </button>
                            </div>
                            <span className={`text-2xl font-bold tabular-nums ${calculateTotalBalance(filteredTransactions, filteredTransfers, selectedAccountId) < 0 ? 'text-reddy' : 'text-green'}`}>
                                {formatAmount(calculateTotalBalance(filteredTransactions, filteredTransfers, selectedAccountId))}
                            </span>
                        </div>

                        {/* Quick-add row — desktop only */}
                        <div className="hidden md:block mb-4">
                            <QuickAddRow
                                amountInputRef={quickAddAmountRef}
                                onSubmit={handleSubmit}
                            />
                            <p className="text-xs text-white/20 mt-1.5 px-1">
                                Tab between fields · Enter to add · <kbd className="font-mono bg-white/[.06] px-1 rounded">N</kbd> to focus from anywhere
                            </p>
                        </div>

                        {loading && transactions.length === 0 && transfers.length === 0 ? (
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
                                {groupTransactionsByMonth(filteredTransactions.slice(0, visibleCount), filteredTransfers, selectedAccountId).map(monthGroup => (
                                    <div key={monthGroup.monthKey} className={`space-y-4 ${monthGroup.monthKey === 'starting-balance' ? 'mt-8 pt-8 border-t border-white/[.15]' : ''}`}>
                                        {/* Month Header */}
                                        <div className="flex justify-between items-center sticky top-20 md:top-[8.5rem] bg-background z-28 md:pb-1">
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
                                                    <div className="flex justify-between items-center sticky top-26 pt-0 px-3 md:top-[10.5rem] bg-background z-20">
                                                        <h3 className="text-sm font-medium text-white/40">
                                                            {group.date === 'starting-balance' ? 'Starting Balance' : formatDate(group.date)}
                                                        </h3>
                                                        {group.date !== 'starting-balance' && (
                                                            <span className="text-sm font-medium text-white/40 tabular-nums">
                                                                {formatAmount(group.items.reduce((total, item) => {
                                                                    if (item.type === 'transfer') {
                                                                        // Include transfer amount based on account context
                                                                        return total + getTransferAmountForAccount(item.data, selectedAccountId);
                                                                    }
                                                                    return total + item.data.amount;
                                                                }, 0))}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {group.items.map((item) => {
                                                            if (item.type === 'transfer') {
                                                                const transfer = item.data;
                                                                const transferAmount = getTransferAmountForAccount(transfer, selectedAccountId);
                                                                const isOutgoing = selectedAccountId ? transfer.from_account_id === selectedAccountId : false;
                                                                const isIncoming = selectedAccountId ? transfer.to_account_id === selectedAccountId : false;

                                                                return (
                                                                    <div key={transfer.id}
                                                                        onClick={() => { setModalTransfer(transfer); setModalTransaction(null); setShowModal(true); }}
                                                                        className="flex items-center gap-3 py-2 px-3 rounded-lg touch-manipulation relative group bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer border border-blue-500/30 transition-colors"
                                                                    >
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 font-medium">
                                                                                    TRANSFER
                                                                                </span>
                                                                                <h4 className="font-medium truncate text-white/90">
                                                                                    {transfer.from_account?.name} → {transfer.to_account?.name}
                                                                                </h4>
                                                                            </div>
                                                                            {transfer.description && (
                                                                                <div className="text-sm text-white/40 truncate mt-0.5">
                                                                                    {transfer.description}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <span className={`font-medium whitespace-nowrap tabular-nums ${!selectedAccountId ? 'text-blue-300' :
                                                                            isOutgoing ? 'text-reddy' :
                                                                                isIncoming ? 'text-green' :
                                                                                    'text-blue-300'
                                                                            }`}>
                                                                            {formatAmount(transferAmount || transfer.amount)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            } else {
                                                                const transaction = item.data;
                                                                return (
                                                                    <div key={transaction.id}
                                                                        onClick={() => transaction.type !== 'starting' ? (setModalTransaction(transaction), setModalTransfer(null), setShowModal(true)) : null}
                                                                        className={`flex items-center gap-3 py-2 px-3 rounded-lg touch-manipulation relative group ${transaction.type === 'starting'
                                                                            ? 'bg-white/[.02] cursor-default'
                                                                            : 'bg-white/[.05] hover:bg-white/[.1] cursor-pointer'
                                                                            } transition-colors`}
                                                                    >
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-3">
                                                                                <h4 className="font-medium truncate text-white/90">
                                                                                    {transaction.type === 'starting' ? `Initial Balance${selectedAccountId === null ? ` (${transaction.accounts?.name})` : ''}` : transaction.vendors?.name || transaction.vendor}
                                                                                </h4>
                                                                                {transaction.accounts && (selectedAccountId === null) && (
                                                                                    <span className="hidden group-hover:inline text-xs px-2 py-1 rounded bg-white/10 text-white/60">
                                                                                        {transaction.accounts.name}
                                                                                    </span>
                                                                                )}
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
                                                                        <span className={`font-medium whitespace-nowrap tabular-nums ${transaction.type === 'starting' ? 'text-white' : transaction.amount < 0 ? 'text-reddy' : 'text-green'
                                                                            }`}>
                                                                            {formatAmount(transaction.amount)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}



                        {/* Load More Button - Client Side */}
                        {visibleCount < filteredTransactions.length && (
                            <div className="flex justify-center mt-8 pb-8">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 50)}
                                    className="px-6 py-2 bg-white/[.05] hover:bg-white/[.1] rounded-full text-sm font-medium transition-colors"
                                >
                                    Load More Transactions
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                <TransactionModal
                    transaction={modalTransaction}
                    transfer={modalTransfer}
                    isOpen={showModal}
                    onClose={closeModalFunc}
                    onSubmit={modalTransaction ? handleUpdateSubmit : handleSubmit}
                    onDelete={handleDelete}
                    onSubmitTransfer={handleTransferSubmit}
                    onUpdateTransfer={handleTransferUpdate}
                    onDeleteTransfer={handleTransferDelete}
                />

                <BankCompareModal
                    bankAccountId={selectedAccountId}
                    isOpen={showBankCompareModal}
                    onClose={() => setShowBankCompareModal(false)}
                    transactions={transactions}
                    onTransactionUpdated={() => refetch()}
                />

                <BankCompareModal
                    bankAccountId={postImportAccountId}
                    isOpen={showPostImportReconcile}
                    onClose={() => {
                        setShowPostImportReconcile(false);
                        setPostImportAccountId(null);
                    }}
                    transactions={transactions}
                    onTransactionUpdated={() => refetch()}
                    postImport={true}
                />

                <AccountModal
                    isOpen={showAccountModal}
                    onClose={() => { setShowAccountModal(false); refetch() }}
                    onAccountsUpdated={() => {
                        refetch()
                    }}
                />

                <VendorManagerModal
                    isOpen={showVendorManager}
                    onClose={() => setShowVendorManager(false)}
                />

                <BulkEditModal
                    isOpen={showBulkEdit}
                    onClose={() => setShowBulkEdit(false)}
                />
            </div >
        </ProtectedRoute >
    );
}
