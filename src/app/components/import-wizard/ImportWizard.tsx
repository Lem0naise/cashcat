'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Database } from '@/types/supabase';
import type { ExistingAccount, ExistingCategory, ExistingGroup, WizardStep } from './types';
import { useImportWizard } from './hooks/useImportWizard';
import FileUploadStep from './steps/FileUploadStep';
import FormatReviewStep from './steps/FormatReviewStep';
import AccountLinkStep from './steps/AccountLinkStep';
import CategoryMappingStep from './steps/CategoryMappingStep';
import ReviewCommitStep from './steps/ReviewCommitStep';

interface ImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedAccountId?: string | null;
    isOnboarding?: boolean;
}

const STEPS: WizardStep[] = ['upload', 'format', 'account', 'categories', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
    upload: 'Upload',
    format: 'Mapping',
    account: 'Account',
    categories: 'Categories',
    review: 'Review',
};

export default function ImportWizard({
    isOpen,
    onClose,
    preselectedAccountId = null,
    isOnboarding = false,
}: ImportWizardProps) {
    const supabase = createClientComponentClient<Database>();
    const queryClient = useQueryClient();
    const { state, dispatch, processFile, parseTransactions, checkDuplicates, commitImport } = useImportWizard();

    const [existingAccounts, setExistingAccounts] = useState<ExistingAccount[]>([]);
    const [existingCategories, setExistingCategories] = useState<ExistingCategory[]>([]);
    const [existingGroups, setExistingGroups] = useState<ExistingGroup[]>([]);
    const [isClosing, setIsClosing] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Fetch existing data when wizard opens
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [accountsRes, categoriesRes, groupsRes] = await Promise.all([
                    supabase
                        .from('accounts')
                        .select('id, name, type, is_active, is_default')
                        .eq('user_id', user.id)
                        .order('name'),
                    supabase
                        .from('categories')
                        .select('id, name, group, groups(name)')
                        .eq('user_id', user.id)
                        .order('name'),
                    supabase
                        .from('groups')
                        .select('id, name')
                        .eq('user_id', user.id)
                        .order('name'),
                ]);

                setExistingAccounts((accountsRes.data as any) || []);
                setExistingCategories(
                    ((categoriesRes.data as any) || []).map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        group: c.group,
                        groupName: c.groups?.name || 'Ungrouped',
                    }))
                );
                setExistingGroups((groupsRes.data as any) || []);
                setDataLoaded(true);
            } catch (err) {
                console.error('Failed to load data:', err);
                toast.error('Failed to load account data');
            }
        };

        fetchData();
    }, [isOpen, supabase]);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            dispatch({ type: 'RESET' });
            setDataLoaded(false);
        }
    }, [isOpen, dispatch]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (state.isCommitting) return; // Can't close during commit
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    }, [state.isCommitting, onClose]);

    const currentStepIndex = STEPS.indexOf(state.step);

    // Can we advance from the current step?
    const canAdvance = useMemo(() => {
        switch (state.step) {
            case 'upload':
                return state.rawRows.length > 0;
            case 'format':
                return state.columnMapping.date >= 0 &&
                    state.columnMapping.vendor >= 0 &&
                    (state.columnMapping.amount >= 0 ||
                        (state.columnMapping.inflow !== undefined && state.columnMapping.outflow !== undefined));
            case 'account':
                return !!state.targetAccountId || (!!state.createNewAccount && state.createNewAccount.name.trim().length > 0);
            case 'categories':
                return true; // Always allowed to skip categorization
            case 'review':
                return false; // Commit button handles this
            default:
                return false;
        }
    }, [state]);

    const handleNext = useCallback(async () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= STEPS.length) return;

        const nextStep = STEPS[nextIndex];

        // Transition logic
        if (state.step === 'format') {
            // Parse transactions when leaving format step
            parseTransactions();
        }

        if (nextStep === 'review') {
            // Check for duplicates when entering review step
            const accountId = state.targetAccountId;
            if (accountId) {
                await checkDuplicates(accountId);
            }
        }

        dispatch({ type: 'GO_TO_STEP', step: nextStep });
    }, [currentStepIndex, state.step, state.targetAccountId, parseTransactions, checkDuplicates, dispatch]);

    const handleBack = useCallback(() => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex < 0) return;
        dispatch({ type: 'GO_TO_STEP', step: STEPS[prevIndex] });
    }, [currentStepIndex, dispatch]);

    const handleCommit = useCallback(async () => {
        await commitImport(
            existingCategories,
            [...existingGroups], // Copy so we can mutate in the commit function
            () => {
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                queryClient.invalidateQueries({ queryKey: ['assignments'] });
            },
        );
        toast.success('Transactions imported successfully!');
    }, [commitImport, existingCategories, existingGroups, queryClient]);

    // Resolve target account name for display
    const targetAccountName = useMemo(() => {
        if (state.createNewAccount) return state.createNewAccount.name || 'New Account';
        const acc = existingAccounts.find(a => a.id === state.targetAccountId);
        return acc?.name || 'Unknown';
    }, [state.targetAccountId, state.createNewAccount, existingAccounts]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
                isClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleClose}
        >
            <div
                className={`bg-[#1a1a1a] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/10 flex flex-col transition-transform duration-200 ${
                    isClosing ? 'scale-95' : 'scale-100'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Import Transactions</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={state.isCommitting}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Image src="/plus.svg" alt="Close" width={16} height={16} className="invert rotate-45" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1 px-5 py-3 border-b border-white/[.06] shrink-0 overflow-x-auto">
                    {STEPS.map((step, i) => {
                        const isActive = state.step === step;
                        const isPast = i < currentStepIndex;
                        const isFuture = i > currentStepIndex;

                        return (
                            <div key={step} className="flex items-center gap-1">
                                {i > 0 && (
                                    <div className={`w-6 h-px ${isPast ? 'bg-green/50' : 'bg-white/10'}`} />
                                )}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                                    isActive ? 'bg-green/15 text-green' :
                                    isPast ? 'bg-white/5 text-green/60' :
                                    'bg-transparent text-white/30'
                                }`}>
                                    {isPast ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green/60">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                            isActive ? 'bg-green text-black' : 'bg-white/10 text-white/30'
                                        }`}>
                                            {i + 1}
                                        </span>
                                    )}
                                    {STEP_LABELS[step]}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {state.step === 'upload' && (
                        <FileUploadStep
                            onFileSelected={async (file) => {
                                await processFile(file);
                                dispatch({ type: 'GO_TO_STEP', step: 'format' });
                            }}
                        />
                    )}

                    {state.step === 'format' && (
                        <FormatReviewStep
                            headers={state.headers}
                            rows={state.rawRows}
                            detectedFormat={state.detectedFormat}
                            columnMapping={state.columnMapping}
                            dateFormat={state.dateFormat}
                            onUpdateMapping={(mapping) => dispatch({ type: 'UPDATE_MAPPING', mapping })}
                            onDateFormatChange={(format) => dispatch({ type: 'SET_DATE_FORMAT', dateFormat: format })}
                        />
                    )}

                    {state.step === 'account' && (
                        <AccountLinkStep
                            accounts={existingAccounts}
                            targetAccountId={state.targetAccountId}
                            createNewAccount={state.createNewAccount}
                            onSelectAccount={(id) => dispatch({ type: 'SET_ACCOUNT', accountId: id })}
                            onCreateAccount={(account) => dispatch({ type: 'SET_CREATE_ACCOUNT', account })}
                            preselectedAccountId={preselectedAccountId}
                        />
                    )}

                    {state.step === 'categories' && (
                        <CategoryMappingStep
                            parsedTransactions={state.parsedTransactions}
                            existingCategories={existingCategories}
                            existingGroups={existingGroups}
                            categoryActions={state.categoryActions}
                            vendorCategoryRules={state.vendorCategoryRules}
                            onCategoryAction={(csvCat, action) =>
                                dispatch({ type: 'SET_CATEGORY_ACTION', csvCategory: csvCat, action })
                            }
                            onVendorRule={(vendor, catId) =>
                                dispatch({ type: 'SET_VENDOR_RULE', vendor, categoryId: catId })
                            }
                            isOnboarding={isOnboarding}
                        />
                    )}

                    {state.step === 'review' && (
                        <ReviewCommitStep
                            parsedTransactions={state.parsedTransactions}
                            existingCategories={existingCategories}
                            categoryActions={state.categoryActions}
                            targetAccountName={targetAccountName}
                            isCommitting={state.isCommitting}
                            commitProgress={state.commitProgress}
                            commitTotal={state.commitTotal}
                            commitDone={state.commitDone}
                            commitError={state.commitError}
                            onToggleDuplicate={(index) => dispatch({ type: 'TOGGLE_DUPLICATE_INCLUDE', index })}
                            onCommit={handleCommit}
                        />
                    )}
                </div>

                {/* Footer navigation */}
                {state.step !== 'upload' && !state.commitDone && (
                    <div className="flex items-center justify-between p-5 border-t border-white/10 shrink-0">
                        <button
                            onClick={handleBack}
                            disabled={state.isCommitting}
                            className="py-2 px-4 rounded-lg border border-white/20 hover:bg-white/5 transition-colors text-sm text-white/70 disabled:opacity-50"
                        >
                            Back
                        </button>

                        {state.step !== 'review' && (
                            <button
                                onClick={handleNext}
                                disabled={!canAdvance}
                                className="py-2 px-4 rounded-lg bg-green hover:bg-green/90 text-black font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        )}
                    </div>
                )}

                {/* Done footer */}
                {state.commitDone && (
                    <div className="flex items-center justify-center p-5 border-t border-white/10 shrink-0">
                        <button
                            onClick={handleClose}
                            className="py-2 px-6 rounded-lg bg-green hover:bg-green/90 text-black font-medium transition-colors text-sm"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
