'use client';
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from 'react-hot-toast';
import MoneyInput from "./money-input";
import ConfirmationModal from "./confirmation-modal";
import Dropdown, { DropdownOption } from './dropdown';
import { useAllAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useCreateAccount, useUpdateAccount, useDeleteAccount, useSetDefaultAccount } from '../hooks/useAccountMutations';
import { useSubscription } from '@/hooks/useSubscription';
import { ProGateOverlay } from './pro-gate-overlay';

type Account = {
    id: string;
    name: string;
    type: string;
    is_active: boolean | null;
    is_default: boolean;
    created_at: string | null;
    user_id: string;
};

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccountsUpdated: () => void;
}

const FREE_ACCOUNT_LIMIT = 4;

export default function AccountModal({ isOpen, onClose, onAccountsUpdated }: AccountModalProps) {
    const { data: allAccountsData = [], isLoading: loading } = useAllAccounts();
    const { data: allTransactions = [] } = useTransactions();
    const { subscription } = useSubscription();

    const createAccountMutation = useCreateAccount();
    const updateAccountMutation = useUpdateAccount();
    const deleteAccountMutation = useDeleteAccount();
    const setDefaultMutation = useSetDefaultAccount();

    const accounts = useMemo(() => allAccountsData as Account[], [allAccountsData]);

    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [otherAccountsAvailable, setOtherAccountsAvailable] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [startingBalance, setStartingBalance] = useState('0.00');
    const [formData, setFormData] = useState({
        name: '',
        type: 'checking',
    });
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'close' | 'reopen' | null;
        account: Account | null;
        balance?: number;
    }>({
        isOpen: false,
        type: null,
        account: null,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [showAccountProGate, setShowAccountProGate] = useState(false);

    useEffect(() => {
        // Check if the user has other accounts available (cannot have zero bank accounts open)
        let openAccounts = accounts.filter(account => (account.is_active));
        setOtherAccountsAvailable(openAccounts.length > 1);
    }, [accounts])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await updateAccountMutation.mutateAsync({
                    id: editingAccount.id,
                    updates: { name: formData.name, type: formData.type },
                });
                toast.success('Account updated successfully');
            } else {
                const isFirstAccount = accounts.length === 0;
                await createAccountMutation.mutateAsync({
                    name: formData.name,
                    type: formData.type,
                    startingBalance: parseFloat(startingBalance),
                    isFirstAccount,
                });
                toast.success('Account created successfully');
            }

            setFormData({ name: '', type: 'checking' });
            setStartingBalance('');
            setEditingAccount(null);
            setShowForm(false);
            onAccountsUpdated();
        } catch (error) {
            console.error('Error saving account:', error);
            toast.error('Failed to save account');
        }
    };

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        setStartingBalance('');
        setFormData({
            name: account.name,
            type: account.type
        });
        setShowForm(true);
    };

    const handleBankAccountClose = async (account: Account) => {
        // Calculate balance from cached transactions
        const accountTransactions = allTransactions.filter(t => t.account_id === account.id);
        const balance = accountTransactions.reduce((sum, t) => sum + t.amount, 0);

        setConfirmModal({
            isOpen: true,
            type: 'close',
            account,
            balance
        });
    };

    const handleBankAccountReopen = async (account: Account) => {
        setConfirmModal({
            isOpen: true,
            type: 'reopen',
            account,
        });
    };

    const handleDelete = (account: Account) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete',
            account
        });
    };

    const handleSetDefault = async (account: Account) => {
        try {
            if (editingAccount) {
                await setDefaultMutation.mutateAsync(editingAccount.id);
                setEditingAccount({ ...editingAccount, is_default: true });
                toast.success('Default account updated successfully');
            }
        } catch (error) {
            console.log("Error setting default account:", error);
            toast.error("Failed to set default account");
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.account || !confirmModal.type) return;

        setConfirmLoading(true);
        try {
            if (confirmModal.type === 'close') {
                await updateAccountMutation.mutateAsync({
                    id: confirmModal.account.id,
                    updates: { is_active: false },
                });
                toast.success("Account closed successfully!");
            } else if (confirmModal.type === 'delete') {
                await deleteAccountMutation.mutateAsync(confirmModal.account.id);
                toast.success('Account deleted successfully');
            } else if (confirmModal.type === 'reopen') {
                await updateAccountMutation.mutateAsync({
                    id: confirmModal.account.id,
                    updates: { is_active: true },
                });
                toast.success('Account re-opened successfully');
            }

            onAccountsUpdated();
            setConfirmModal({ isOpen: false, type: null, account: null });
            setShowForm(false);
            setEditingAccount(null);
        } catch (error) {
            console.error(`Error ${confirmModal.type}ing account:`, error);
            toast.error(`Failed to ${confirmModal.type} account`);
        } finally {
            setConfirmLoading(false);
        }
    };

    const getConfirmationContent = () => {
        if (!confirmModal.account || !confirmModal.type) return { title: '', message: '', confirmText: '' };

        if (confirmModal.type === 'delete') {
            return {
                title: 'Delete Account',
                message: `This is not a recommended action. We highly recommend 'closing' the account instead. If you delete "${confirmModal.account.name}", this cannot be undone. The account, together with all transactions and balances, will be deleted from your account forever. This will create inconsistencies in past budgeting, and make it overall more difficult to manage your money.`,
                confirmText: 'Delete Account',
            };
        } else if (confirmModal.type === 'reopen') {
            return {
                title: 'Re-open Account',
                message: `Are you sure you want to re-open "${confirmModal.account.name}"?`,
                confirmText: 'Reopen',
            };
        }
        else {
            const hasBalance = confirmModal.balance !== undefined && confirmModal.balance !== 0;
            let message = `Are you sure you want to close ${confirmModal.account.name}?`;

            if (hasBalance) {
                message += `\n\nWarning: This account has a balance of £${confirmModal.balance?.toFixed(2)}. Closing the account will not hide this balance from your total, and the transaction history will be preserved.`;
            }

            message += '\n\nYou can reopen the account later if needed.';

            return {
                title: 'Close Account',
                message,
                confirmText: 'Close Account',
            };
        }
    };

    const handleCancel = () => {
        setFormData({ name: '', type: 'checking' });
        setEditingAccount(null);
        setShowForm(false);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a1a] rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold">Manage Bank Accounts</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Image src="/plus.svg" alt="Close" width={16} height={16} className="invert rotate-45" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {showForm ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Account Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 focus:border-green focus:outline-none"
                                    placeholder="Enter account name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Account Type
                                </label>
                                <Dropdown
                                    value={formData.type}
                                    onChange={(value) => setFormData({ ...formData, type: value })}
                                    options={[
                                        { value: "checking", label: "Current" },
                                        { value: "savings", label: "Savings" },
                                        { value: "credit", label: "Credit Card" },
                                        { value: "investment", label: "Investment" },
                                        { value: "cash", label: "Cash" },
                                        { value: "other", label: "Other" }
                                    ]}
                                    icon="/bank.svg"
                                />
                            </div>

                            {editingAccount !== null && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefault(editingAccount)}
                                        disabled={editingAccount.is_default}
                                        className={`w-full p-3 rounded-lg border transition-colors ${editingAccount?.is_default
                                            ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-green'
                                            }`}
                                    >
                                        {editingAccount?.is_default ? 'Already Your Default Account' : 'Set as Default Account'}
                                    </button>
                                </div>)}

                            {!editingAccount && (<div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Balance Right Now
                                </label>
                                <MoneyInput
                                    value={startingBalance}
                                    onChange={(value) => setStartingBalance(value)}
                                    placeholder="0.00"
                                    autoFocus={false}
                                    currencySymbol={true}
                                />
                            </div>)}

                            {editingAccount && (
                                <div className="flex gap-3 pt-2">

                                    {(editingAccount.is_active && otherAccountsAvailable) && !editingAccount.is_default && (
                                        <button
                                            type="button"
                                            onClick={() => handleBankAccountClose(editingAccount)}
                                            className="flex-1 py-2 px-4 rounded-lg bg-reddy hover:bg-old-reddy text-white font-medium transition-colors"
                                        >
                                            Close Account
                                        </button>)}
                                    {!editingAccount.is_active && (
                                        <button
                                            type="button"
                                            onClick={() => handleBankAccountReopen(editingAccount)}
                                            className="flex-1 py-2 px-4 rounded-lg bg-reddy hover:bg-old-reddy text-white font-medium transition-colors"
                                        >
                                            Re-open Account
                                        </button>
                                    )}

                                    {(!editingAccount.is_active || otherAccountsAvailable) && !editingAccount.is_default && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(editingAccount)}
                                            className="flex-1 py-2 px-4 rounded-lg bg-reddy hover:bg-old-reddy text-white font-medium transition-colors"
                                        >
                                            Delete Account
                                        </button>)}

                                </div>
                            )}

                            {editingAccount?.is_active && !otherAccountsAvailable && !editingAccount.is_default && (
                                <p className="text-xs text-white/60 mt-2">You cannot close or delete the only account you have left open.</p>
                            )}
                            {editingAccount?.is_default && (
                                <p className="text-xs text-white/60 mt-2">You cannot close or delete your default account.</p>
                            )}


                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 py-2 px-4 rounded-lg border border-white/20 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 px-4 rounded-lg bg-green hover:bg-green/90 text-black font-medium transition-colors"
                                >
                                    {editingAccount ? 'Update' : 'Create'}
                                </button>
                            </div>


                        </form>
                    ) : (
                        <div className="space-y-4">
                            {/* Usage banner for free users */}
                            {!subscription?.isActive && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                                    accounts.length >= FREE_ACCOUNT_LIMIT
                                        ? 'bg-orange-500/10 border border-orange-500/25 text-orange-300'
                                        : 'bg-white/[.04] border border-white/10 text-white/45'
                                }`}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    {accounts.length >= FREE_ACCOUNT_LIMIT
                                        ? `Free plan limit reached (${FREE_ACCOUNT_LIMIT}/${FREE_ACCOUNT_LIMIT} accounts). Upgrade to Pro for unlimited.`
                                        : `${FREE_ACCOUNT_LIMIT - accounts.length} of ${FREE_ACCOUNT_LIMIT} free accounts remaining`
                                    }
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (accounts.length >= FREE_ACCOUNT_LIMIT && !subscription?.isActive) {
                                        setShowAccountProGate(true);
                                    } else {
                                        setShowForm(true);
                                    }
                                }}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                    accounts.length >= FREE_ACCOUNT_LIMIT && !subscription?.isActive
                                        ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                                        : 'bg-green hover:bg-green/90 text-black'
                                }`}
                            >
                                {accounts.length >= FREE_ACCOUNT_LIMIT && !subscription?.isActive ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                        Add Account — Pro Required
                                    </>
                                ) : (
                                    <>
                                        <Image src="/plus.svg" alt="Add" width={16} height={16} />
                                        Add Account
                                    </>
                                )}
                            </button>

                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : accounts.length === 0 ? (
                                <div className="text-center py-8 text-white/60">
                                    <p>No accounts found</p>
                                    <p className="text-sm mt-1">Create your first account to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {accounts.map((account) => (
                                        <div key={account.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors
                                            ${account.is_active} 
                                                ? 'bg-white/5 hover:bg-white/10'
                                                : 'bg-white/2 hover:bg-white/5 opacity-60'`}>
                                            <div>
                                                <h3 className={`font-medium ${account.is_active ? '' : 'text-white/50'}`}>{account.name} {!account.is_active && (<span className="ml-2 text-xs px-2 py-1 rounded bg-red-500/20 text-red-300">
                                                    CLOSED
                                                </span>)}
                                                    {account.is_default && (<span className="ml-2 text-xs px-2 py-1 rounded text-green">
                                                        DEFAULT
                                                    </span>)}</h3>

                                                <p className="text-sm text-white/60 capitalize">{account.type}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(account)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Edit account"
                                                >
                                                    <Image src="/pencil.svg" alt="Edit" width={16} height={16} className="invert" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: null, account: null })}
                onConfirm={handleConfirmAction}
                isLoading={confirmLoading}
                {...getConfirmationContent()}
            />

            {showAccountProGate && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 font-[family-name:var(--font-suse)]"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowAccountProGate(false); }}
                >
                    <ProGateOverlay
                        featureName="Unlimited Accounts"
                        featureDescription={`Free accounts are limited to ${FREE_ACCOUNT_LIMIT} bank accounts. Upgrade to Pro for unlimited accounts.`}
                        dismissible
                        onClose={() => setShowAccountProGate(false)}
                    />
                </div>
            )}
        </div>
    );
}
