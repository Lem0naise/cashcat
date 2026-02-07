'use client';
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import { useSupabaseClient } from '../hooks/useSupabaseClient';
import MoneyInput from "./money-input";
import ConfirmationModal from "./confirmation-modal";
import Dropdown, { DropdownOption } from './dropdown';
import ImportWizard from './import-wizard/ImportWizard';

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

export default function AccountModal({ isOpen, onClose, onAccountsUpdated }: AccountModalProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
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
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [importAccountId, setImportAccountId] = useState<string | null>(null);
    const supabase = useSupabaseClient();

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        }
    }, [isOpen]);

    useEffect(() => {
        // Check if the user has other accounts available (cannot have zero bank accounts open)
        let openAccounts = accounts.filter(account => (account.is_active));
        setOtherAccountsAvailable(openAccounts.length > 1);
    }, [accounts])

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast.error('Failed to fetch accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try { // create the account in the table
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (editingAccount) {
                const { error } = await supabase
                    .from('accounts')
                    .update({
                        name: formData.name,
                        type: formData.type
                    })
                    .eq('id', editingAccount.id);

                if (error) throw error;
                toast.success('Account updated successfully');
            } else {
                // Check if this is the user's first account
                const isFirstAccount = accounts.length === 0;
                
                const { data: newAccount, error } = await supabase
                    .from('accounts')
                    .insert({
                        name: formData.name,
                        type: formData.type,
                        user_id: user.id,
                        is_active: true,
                        is_default: isFirstAccount
                    })
                    .select()
                    .single();
                if (error) throw error;
                // create starting balance transaction
                try {
                    const transactionData = {
                        amount: parseFloat(startingBalance),
                        type: 'starting',
                        date: new Date().toISOString().split('T')[0],
                        vendor: 'Starting Balance',
                        account_id: newAccount.id,
                        created_at: new Date().toISOString(),
                        user_id: user.id,
                    };
                    const { error: transerror }  = await supabase
                        .from('transactions')
                        .insert(transactionData);
    
                    if (transerror) throw transerror
                }
                catch (error) {
                    throw error;
                }
                
                toast.success('Account created successfully');
            }

            setFormData({ name: '', type: 'checking' });
            setStartingBalance('');
            setEditingAccount(null);
            setShowForm(false);
            fetchAccounts();
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
        // Check if account has non-zero balance
        try {
            const { data: transactions, error: transerror} = await supabase
                .from('transactions')
                .select('amount')
                .eq('account_id', account.id);
            if (transerror) throw transerror;

            const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

            setConfirmModal({
                isOpen: true,
                type: 'close',
                account,
                balance
            });
        }
        catch (error) {
            console.log("Error checking account balance:", error);
            toast.error("Failed to check account balance");
        }
    };
    
    const handleBankAccountReopen = async (account: Account) => {
        // Check if account has non-zero balance
        try {
            setConfirmModal({
                isOpen: true,
                type: 'reopen',
                account,
            });
        }
        catch (error) {
            console.log("Error checking account balance:", error);
            toast.error("Failed to check account balance");
        }
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error: updateAllError} = await supabase
                .from('accounts')
                .update({is_default: false})
                .eq('user_id', user.id);

            if (updateAllError) throw updateAllError;

            if (editingAccount) {
                const { error: setDefaultError } = await supabase
                    .from('accounts')
                    .update({ is_default: true })
                    .eq('id', editingAccount.id);

                if (setDefaultError) throw setDefaultError;
                
                // Update local state
                setEditingAccount({ ...editingAccount, is_default: true });
                toast.success('Default account updated successfully');
            }
        }
        catch (error) {
            console.log("Error setting default account:", error);
            toast.error("Failed to set default account");
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.account || !confirmModal.type) return;

        setConfirmLoading(true);
        try {
            if (confirmModal.type === 'close') {
                const {error} = await supabase
                    .from('accounts')
                    .update({is_active: false})
                    .eq('id', confirmModal.account.id);
                if (error) throw error;

                toast.success("Account closed successfully!");
            } else if (confirmModal.type === 'delete') {
                const { error } = await supabase
                    .from('accounts')
                    .delete()
                    .eq('id', confirmModal.account.id);

                if (error) throw error;
                toast.success('Account deleted successfully');
            } else if (confirmModal.type === 'reopen') {
                const { error } = await supabase
                    .from('accounts')
                    .update({is_active: true})
                    .eq('id', confirmModal.account.id);

                if (error) throw error;
                toast.success('Account re-opened successfully');
            }

            fetchAccounts();
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
                title: '⚠️ Delete Account',
                message: `⚠️ This is not a recommended action. We highly recommend 'closing' the account instead. If you delete "${confirmModal.account.name}", this cannot be undone. The account, together with all transactions and balances, will be deleted from your account forever. This will create inconsistencies in past budgeting, and make it overall more difficult to manage your money.`,
                confirmText: 'Delete ⚠️',
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
                                    className={`w-full p-3 rounded-lg border transition-colors ${
                                        editingAccount?.is_default
                                            ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-green'
                                    }`}
                                >
                                      {editingAccount?.is_default ? 'Already Your Default Account' : 'Set as Default Account'}
                                </button>
                            </div>)}

                            {editingAccount !== null && editingAccount.is_active && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImportAccountId(editingAccount.id);
                                            setShowImportWizard(true);
                                        }}
                                        className="w-full p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Import Transactions from CSV
                                    </button>
                                </div>
                            )}

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
                            <button
                                onClick={() => setShowForm(true)}
                                className="w-full py-3 px-4 rounded-lg bg-green hover:bg-green/90 text-black font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Image src="/plus.svg" alt="Add" width={16} height={16} />
                                Add Account
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

            <ImportWizard
                isOpen={showImportWizard}
                onClose={() => {
                    setShowImportWizard(false);
                    setImportAccountId(null);
                    fetchAccounts();
                    onAccountsUpdated();
                }}
                preselectedAccountId={importAccountId}
            />
        </div>
    );
}
