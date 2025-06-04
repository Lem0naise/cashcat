'use client';
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSupabaseClient } from '../hooks/useSupabaseClient';

type Account = {
    id: string;
    name: string;
    type: string;
    is_active: boolean | null;
    created_at: string | null;
    user_id: string;
};

interface AccountSelectorProps {
    selectedAccountId: string | null;
    onAccountChange: (accountId: string | null) => void;
    onManageAccounts: () => void;
}

export default function AccountSelector({ selectedAccountId, onAccountChange, onManageAccounts }: AccountSelectorProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = useSupabaseClient();

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

    const handleAccountSelect = (accountId: string | null) => {
        onAccountChange(accountId);
        setIsOpen(false);
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors min-w-[180px] justify-between"
                disabled={loading}
            >
                <div className="flex items-center gap-2">
                    <Image
                        src="/bank.svg"
                        alt="Account"
                        width={16}
                        height={16}
                        className="invert opacity-60"
                    />
                    <span className="text-sm font-medium">
                        {loading ? 'Loading...' : selectedAccount ? selectedAccount.name : 'All Accounts'}
                    </span>
                </div>
                <Image
                    src="/chevron-right.svg"
                    alt="Expand"
                    width={16}
                    height={16}
                    className={` opacity-60 transition-transform ${isOpen ? 'rotate-270' : 'rotate-90'}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="py-2">
                        <button
                            onClick={() => handleAccountSelect(null)}
                            className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-sm ${
                                !selectedAccountId ? 'bg-white/5 text-green' : ''
                            }`}
                        >
                            All Accounts
                        </button>
                        
                        {accounts.length > 0 && (
                            <div className="border-t border-white/10 mt-2 pt-2">
                                {accounts.map((account) => (
                                    <button
                                        key={account.id}
                                        onClick={() => handleAccountSelect(account.id)}
                                        className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${
                                            selectedAccountId === account.id ? 'bg-white/5 text-green' : ''
                                        }`}
                                    >
                                        <div>
                                            <div className="text-sm font-medium">{account.name}</div>
                                            <div className="text-xs text-white/60 capitalize">{account.type}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <div className="border-t border-white/10 mt-2 pt-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onManageAccounts();
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-sm text-white/80 flex items-center gap-2"
                            >
                                <Image
                                    src="/settings.svg"
                                    alt="Manage"
                                    width={14}
                                    height={14}
                                    className="opacity-60"
                                />
                                Manage Accounts
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
