'use client';

import { createClient } from '@/app/utils/supabase';
import { getCachedUserId } from '@/app/hooks/useAuthUserId';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

type DeleteScope = 'transactions' | 'budget' | 'all';

type DeleteDataModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

const SCOPE_LABELS: Record<DeleteScope, string> = {
    transactions: 'Transactions Only',
    budget: 'Budget Only',
    all: 'All Data',
};

const SCOPE_DESCRIPTIONS: Record<DeleteScope, string> = {
    transactions: 'Deletes all transactions, transfers, bank reconciliations, accounts, vendors, and import mappings. Your budget categories and groups are kept.',
    budget: 'Deletes all budget categories, groups, and assignments. Your transactions are kept.',
    all: 'Deletes everything — transactions, budget, accounts, vendors, and more. Resets your account to a fresh state and triggers the onboarding flow.',
};

async function deleteTransactionData(userId: string) {
    const supabase = createClient();
    const tables = [
        'transactions',
        'transfers',
        'bank_reconciliations',
        'information',
        'import_mappings',
        'accounts',
        'vendors',
    ] as const;

    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', userId);
        if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
    }

    // assignments are shared with budget scope — also clear them for transactions scope
    const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .eq('user_id', userId);
    if (assignmentsError) throw new Error(`Failed to delete assignments: ${assignmentsError.message}`);
}

async function deleteBudgetData(userId: string) {
    const supabase = createClient();

    // assignments must go before categories/groups (FK)
    const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .eq('user_id', userId);
    if (assignmentsError) throw new Error(`Failed to delete assignments: ${assignmentsError.message}`);

    const { error: categoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId);
    if (categoriesError) throw new Error(`Failed to delete categories: ${categoriesError.message}`);

    const { error: groupsError } = await supabase
        .from('groups')
        .delete()
        .eq('user_id', userId);
    if (groupsError) throw new Error(`Failed to delete groups: ${groupsError.message}`);
}

async function deleteAllData(userId: string) {
    // Delete transaction-side data (includes assignments)
    await deleteTransactionData(userId);

    // Delete budget data (assignments already cleared above, categories/groups still need clearing)
    const supabase = createClient();

    const { error: categoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId);
    if (categoriesError) throw new Error(`Failed to delete categories: ${categoriesError.message}`);

    const { error: groupsError } = await supabase
        .from('groups')
        .delete()
        .eq('user_id', userId);
    if (groupsError) throw new Error(`Failed to delete groups: ${groupsError.message}`);

    // Reset settings
    const { error: settingsError } = await supabase
        .from('settings')
        .update({ is_onboarded: false, import_count: 0, export_count: 0 })
        .eq('id', userId);
    if (settingsError) throw new Error(`Failed to reset settings: ${settingsError.message}`);
}

export default function DeleteDataModal({ isOpen, onClose }: DeleteDataModalProps) {
    const queryClient = useQueryClient();
    const [selectedScope, setSelectedScope] = useState<DeleteScope | null>(null);
    const [confirmStep, setConfirmStep] = useState(0); // 0: pick scope, 1: confirm
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSelectedScope(null);
            setConfirmStep(0);
            setIsDeleting(false);
        }
    }, [isOpen]);

    // Prevent body scroll while open
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
        if (isDeleting) return;
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const handlePrimaryAction = async () => {
        if (!selectedScope) return;

        if (confirmStep === 0) {
            setConfirmStep(1);
            return;
        }

        // Execute deletion
        const userId = getCachedUserId();
        if (!userId) {
            toast.error('Not authenticated');
            return;
        }

        setIsDeleting(true);

        const scopeLabel = SCOPE_LABELS[selectedScope];

        const doDelete = async () => {
            if (selectedScope === 'transactions') {
                await deleteTransactionData(userId);
            } else if (selectedScope === 'budget') {
                await deleteBudgetData(userId);
            } else {
                await deleteAllData(userId);
                // Bust TanStack Query cache after full reset
                queryClient.invalidateQueries({ queryKey: ['onboarding'] });
                queryClient.clear();
            }
        };

        try {
            await toast.promise(doDelete(), {
                loading: `Deleting ${scopeLabel.toLowerCase()}…`,
                success: `${scopeLabel} deleted successfully`,
                error: (err) => `Failed to delete data: ${err?.message ?? 'Unknown error'}`,
            });
            handleClose();
        } catch {
            setConfirmStep(0);
        } finally {
            setIsDeleting(false);
        }
    };

    const primaryLabel = () => {
        if (isDeleting) return 'Deleting…';
        if (confirmStep === 1) return `Yes, Delete ${selectedScope === 'all' ? 'Everything' : SCOPE_LABELS[selectedScope!]}`;
        return 'Delete Data';
    };

    return (
        <div
            className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-white/[.03] md:rounded-lg border-b-4 border-b-reddy w-full md:max-w-md md:p-6 min-h-[100dvh] md:min-h-0 ${isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'}`}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 md:p-0 md:mb-6 border-b border-white/[.15] md:border-0">
                    <h2 className="text-xl font-bold text-reddy">Clear Data</h2>
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
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-0">
                        {/* Warning notice */}
                        <div className="p-4 bg-reddy/10 border border-reddy/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="text-reddy">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-reddy mb-1">This action cannot be undone</p>
                                    <p className="text-white/70">
                                        Select what you want to permanently delete. This cannot be reversed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scope selector */}
                        <div className="space-y-2">
                            {(['transactions', 'budget', 'all'] as DeleteScope[]).map((scope) => (
                                <button
                                    key={scope}
                                    type="button"
                                    onClick={() => {
                                        setSelectedScope(scope);
                                        setConfirmStep(0);
                                    }}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedScope === scope
                                        ? 'bg-reddy/20 border-reddy/50 text-white'
                                        : 'bg-white/[.03] border-white/[.10] text-white/70 hover:bg-white/[.06] hover:border-white/[.20]'
                                        }`}
                                >
                                    <p className={`text-sm font-semibold mb-0.5 ${selectedScope === scope ? 'text-reddy' : 'text-white/90'}`}>
                                        {SCOPE_LABELS[scope]}
                                    </p>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        {SCOPE_DESCRIPTIONS[scope]}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {/* Second-step confirmation notice */}
                        {confirmStep === 1 && selectedScope && (
                            <div className="p-3 bg-reddy/20 border border-reddy/30 rounded-lg">
                                <p className="text-sm text-reddy font-medium">
                                    Are you absolutely sure? Deleting <strong>{SCOPE_LABELS[selectedScope].toLowerCase()}</strong> is permanent and cannot be recovered.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="p-4 md:p-0 md:pt-4 border-t border-white/[.15] md:border-0">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isDeleting}
                                className="flex-1 py-4 bg-white/[.05] text-white/70 font-medium rounded-lg hover:bg-white/[.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePrimaryAction}
                                disabled={!selectedScope || isDeleting}
                                className="flex-1 py-4 bg-reddy text-white font-medium rounded-lg hover:bg-old-reddy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {primaryLabel()}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
