'use client';

import { useState, useEffect } from 'react';
import { SourceAccount, AccountMapping } from '@/lib/import-presets/types';
import { useSupabaseClient } from '@/app/hooks/useSupabaseClient';
import toast from 'react-hot-toast';

interface Account {
    id: string;
    name: string;
    type: string;
    is_active: boolean | null;
    is_default: boolean;
    created_at: string | null;
    user_id: string;
}

interface AccountMappingStepProps {
    sourceAccounts: SourceAccount[];
    onComplete: (mappings: AccountMapping[]) => void;
    onBack: () => void;
}

export default function AccountMappingStep({ sourceAccounts, onComplete, onBack }: AccountMappingStepProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [mappings, setMappings] = useState<AccountMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
    const supabase = useSupabaseClient();

    useEffect(() => {
        fetchAccounts();
        initializeMappings();
    }, [sourceAccounts]);

    const fetchAccounts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            setAccounts(data || []);
            return data || [];
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast.error('Failed to fetch accounts');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const initializeMappings = () => {
        const initialMappings = sourceAccounts.map(sourceAccount => ({
            sourceAccount: sourceAccount.name,
            targetAccountId: '',
            shouldCreateNew: false,
            newAccountName: sourceAccount.name,
            newAccountType: 'checking',
            startingBalance: '0'
        }));
        setMappings(initialMappings);
    };

    const updateMapping = (index: number, field: keyof AccountMapping, value: any) => {
        setMappings(prev => {
            const newMappings = [...prev];
            newMappings[index] = { ...newMappings[index], [field]: value };
            
            // Reset related fields when switching between create new and existing
            if (field === 'shouldCreateNew') {
                if (value) {
                    newMappings[index].targetAccountId = '';
                } else {
                    newMappings[index].newAccountName = '';
                    newMappings[index].newAccountType = 'checking';
                    newMappings[index].startingBalance = '0';
                }
            }
            
            return newMappings;
        });
    };

    const handleComplete = async () => {
        // Validate all mappings are complete
        const isValid = mappings.every(mapping => {
            return mapping.targetAccountId && mapping.targetAccountId.length > 0;
        });

        if (!isValid) {
            toast.error('Please complete all account mappings before continuing. Create accounts or select existing ones.');
            return;
        }

        onComplete(mappings);
    };

    const createAccountImmediately = async (index: number) => {
        const mapping = mappings[index];
        if (!mapping.newAccountName || !mapping.newAccountName.trim()) {
            toast.error('Please enter an account name');
            return;
        }

        setCreatingIndex(index);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Create the account with user-selected type
            const { data: newAccount, error } = await supabase
                .from('accounts')
                .insert({
                    name: mapping.newAccountName,
                    type: mapping.newAccountType || 'checking',
                    user_id: user.id,
                    is_active: true,
                    is_default: false
                })
                .select()
                .single();

            if (error) throw error;

            // Create starting balance transaction with user-specified balance
            try {
                const startingAmount = parseFloat(mapping.startingBalance || '0');
                const transactionData = {
                    amount: startingAmount,
                    type: 'starting',
                    date: new Date().toISOString().split('T')[0],
                    vendor: 'Starting Balance',
                    account_id: newAccount.id,
                    created_at: new Date().toISOString(),
                    user_id: user.id,
                };
                const { error: transError } = await supabase
                    .from('transactions')
                    .insert(transactionData);

                if (transError) throw transError;
            } catch (transactionError) {
                console.error('Error creating starting balance transaction:', transactionError);
                // If transaction creation fails, we should clean up the account
                await supabase.from('accounts').delete().eq('id', newAccount.id);
                throw new Error(`Failed to create starting balance for account: ${mapping.newAccountName}`);
            }

            // Update the mapping to use the new account ID and switch to existing account mode
            setMappings(prev => {
                const newMappings = [...prev];
                newMappings[index] = {
                    ...newMappings[index],
                    targetAccountId: newAccount.id,
                    shouldCreateNew: false
                };
                return newMappings;
            });

            // Immediately add the new account to the accounts state so it's available for other mappings
            setAccounts(prevAccounts => [...prevAccounts, newAccount]);

            const balanceText = mapping.startingBalance && parseFloat(mapping.startingBalance) !== 0 
                ? ` with £${parseFloat(mapping.startingBalance).toFixed(2)} starting balance`
                : ' with £0.00 starting balance';
            toast.success(`Created account: ${mapping.newAccountName}${balanceText}`);
        } catch (error) {
            console.error('Error creating account:', error);
            toast.error('Failed to create account. Please try again.');
        } finally {
            setCreatingIndex(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Loading accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Map Accounts</h2>
                <p className="text-white/70">
                    Link your source accounts to existing CashCat accounts or create new ones.
                </p>
            </div>

            <div className="space-y-4">
                {sourceAccounts.map((sourceAccount, index) => (
                    <div key={sourceAccount.name} className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">{sourceAccount.name}</h3>
                                <p className="text-white/60 text-sm">
                                    {sourceAccount.transactionCount} transactions
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`account-${index}`}
                                        checked={!mappings[index]?.shouldCreateNew}
                                        onChange={() => updateMapping(index, 'shouldCreateNew', false)}
                                        className="text-green focus:ring-green"
                                    />
                                    <span>Use existing account</span>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`account-${index}`}
                                        checked={mappings[index]?.shouldCreateNew || false}
                                        onChange={() => updateMapping(index, 'shouldCreateNew', true)}
                                        className="text-green focus:ring-green"
                                    />
                                    <span>Create new account</span>
                                </label>
                            </div>

                            {mappings[index]?.shouldCreateNew ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">New Account Name</label>
                                        <input
                                            type="text"
                                            value={mappings[index]?.newAccountName || ''}
                                            onChange={(e) => updateMapping(index, 'newAccountName', e.target.value)}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:border-green"
                                            placeholder="Enter account name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Account Type</label>
                                        <select
                                            value={mappings[index]?.newAccountType || 'checking'}
                                            onChange={(e) => updateMapping(index, 'newAccountType', e.target.value)}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white focus:outline-none focus:border-green"
                                        >
                                            <option value="checking">Current</option>
                                            <option value="savings">Savings</option>
                                            <option value="credit">Credit Card</option>
                                            <option value="investment">Investment</option>
                                            <option value="cash">Cash</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Starting Balance</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={mappings[index]?.startingBalance || '0'}
                                            onChange={(e) => updateMapping(index, 'startingBalance', e.target.value)}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:border-green"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => createAccountImmediately(index)}
                                            disabled={creatingIndex === index || !mappings[index]?.newAccountName?.trim()}
                                            className="w-full px-4 py-2 bg-green text-black rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {creatingIndex === index ? 'Creating Account...' : 'Create Account Now'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Select Existing Account</label>
                                    <select
                                        value={mappings[index]?.targetAccountId || ''}
                                        onChange={(e) => updateMapping(index, 'targetAccountId', e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white focus:outline-none focus:border-green"
                                    >
                                        <option value="">Select an account...</option>
                                        {accounts.map(account => (
                                            <option key={account.id} value={account.id}>
                                            {account.name} ({account.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 pt-6">
                <button
                    onClick={onBack}
                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleComplete}
                    className="flex-1 px-4 py-2 bg-green text-black rounded-lg hover:bg-green-dark transition-colors"
                >
                    Continue to Category Groups
                </button>
            </div>
        </div>
    );
}
