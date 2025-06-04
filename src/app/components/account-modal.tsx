'use client';
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import { useSupabaseClient } from '../hooks/useSupabaseClient';
import MoneyInput from "./money-input";

type Account = {
    id: string;
    name: string;
    type: string;
    is_active: boolean | null;
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
    const [showForm, setShowForm] = useState(false);
    const [startingBalance, setStartingBalance] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        type: 'checking',
    });
    const supabase = useSupabaseClient();

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        }
    }, [isOpen]);

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
                const { data: newAccount, error } = await supabase
                    .from('accounts')
                    .insert({
                        name: formData.name,
                        type: formData.type,
                        user_id: user.id,
                        is_active: true
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

    const handleDelete = async (account: Account) => {
        if (!confirm(`Are you sure you want to delete "${account.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', account.id);

            if (error) throw error;
            toast.success('Account deleted successfully');
            fetchAccounts();
            onAccountsUpdated();
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Failed to delete account');
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
                    <h2 className="text-xl font-semibold">Manage Accounts</h2>
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
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 focus:border-green focus:outline-none"
                                >
                                    <option value="checking">Checking</option>
                                    <option value="savings">Savings</option>
                                    <option value="credit">Credit Card</option>
                                    <option value="investment">Investment</option>
                                    <option value="cash">Cash</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

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
                                        <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                            <div>
                                                <h3 className="font-medium">{account.name}</h3>
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
                                                <button
                                                    onClick={() => handleDelete(account)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                                    title="Delete account"
                                                >
                                                    <Image src="/trash-can.svg" alt="Delete" width={16} height={16} className="invert" />
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
        </div>
    );
}
