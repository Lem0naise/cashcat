'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Dropdown from '../../dropdown';
import type { ExistingAccount } from '../types';

interface AccountLinkStepProps {
    accounts: ExistingAccount[];
    targetAccountId: string | null;
    createNewAccount: { name: string; type: string } | null;
    onSelectAccount: (accountId: string) => void;
    onCreateAccount: (account: { name: string; type: string } | null) => void;
    preselectedAccountId?: string | null;
}

const ACCOUNT_TYPES = [
    { value: 'checking', label: 'Current' },
    { value: 'savings', label: 'Savings' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' },
];

export default function AccountLinkStep({
    accounts,
    targetAccountId,
    createNewAccount,
    onSelectAccount,
    onCreateAccount,
    preselectedAccountId,
}: AccountLinkStepProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState('checking');

    // Pre-select account if provided
    useEffect(() => {
        if (preselectedAccountId && !targetAccountId && !createNewAccount) {
            onSelectAccount(preselectedAccountId);
        }
    }, [preselectedAccountId]);

    const activeAccounts = accounts.filter(a => a.is_active);

    const accountOptions = [
        ...activeAccounts.map(a => ({
            value: a.id,
            label: `${a.name}${a.is_default ? ' (Default)' : ''}`,
            subtitle: a.type.charAt(0).toUpperCase() + a.type.slice(1),
        })),
    ];

    const handleCreateToggle = () => {
        if (showCreateForm) {
            // Cancel creation
            setShowCreateForm(false);
            setNewAccountName('');
            setNewAccountType('checking');
            onCreateAccount(null);
            // Re-select first account if available
            if (activeAccounts.length > 0) {
                onSelectAccount(activeAccounts[0].id);
            }
        } else {
            setShowCreateForm(true);
            onCreateAccount({ name: '', type: 'checking' });
        }
    };

    const handleNameChange = (name: string) => {
        setNewAccountName(name);
        onCreateAccount({ name, type: newAccountType });
    };

    const handleTypeChange = (type: string) => {
        setNewAccountType(type);
        onCreateAccount({ name: newAccountName, type });
    };

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-semibold text-white">Link to Account</h3>
                <p className="text-sm text-white/50 mt-0.5">
                    Which bank account are these transactions for?
                </p>
            </div>

            {/* Existing account selection */}
            {!showCreateForm && activeAccounts.length > 0 && (
                <div className="space-y-3">
                    <Dropdown
                        options={accountOptions}
                        value={targetAccountId || ''}
                        onChange={onSelectAccount}
                        placeholder="Select an account"
                        icon="/bank.svg"
                        searchable={activeAccounts.length > 5}
                    />
                </div>
            )}

            {/* Create new account toggle */}
            <button
                type="button"
                onClick={handleCreateToggle}
                className="w-full py-2.5 px-4 rounded-lg border border-dashed border-white/20 hover:border-green/50 hover:bg-green/5 text-sm text-white/60 hover:text-green transition-all flex items-center justify-center gap-2"
            >
                {showCreateForm ? (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                        </svg>
                        Cancel — use existing account
                    </>
                ) : (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create new account
                    </>
                )}
            </button>

            {/* New account form */}
            {showCreateForm && (
                <div className="space-y-4 p-4 rounded-lg bg-white/[.03] border border-white/10">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Account Name
                        </label>
                        <input
                            type="text"
                            value={newAccountName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 focus:border-green focus:outline-none text-white"
                            placeholder="e.g. Starling Current Account"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Account Type
                        </label>
                        <Dropdown
                            options={ACCOUNT_TYPES}
                            value={newAccountType}
                            onChange={handleTypeChange}
                            icon="/bank.svg"
                        />
                    </div>
                </div>
            )}

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[.03] border border-white/[.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                </svg>
                <p className="text-xs text-white/40">
                    All imported transactions will be linked to this account. If your CSV contains a
                    &quot;Starting Balance&quot; row, it will be imported as the account&apos;s starting balance.
                </p>
            </div>
        </div>
    );
}
