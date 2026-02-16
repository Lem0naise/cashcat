import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';
import { useAuthUserId } from './useAuthUserId';

type Account = Database['public']['Tables']['accounts']['Row'];

// Fetch all active accounts for a given user
const fetchAccounts = async (userId: string): Promise<Account[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data || [];
};

// Custom hook for active accounts
export const useAccounts = () => {
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['accounts'],
        queryFn: () => fetchAccounts(userId!),
        enabled: !!userId,
    });
};

// Fetch ALL accounts (including inactive) for account management
const fetchAllAccounts = async (userId: string): Promise<Account[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

// Custom hook for all accounts (including closed)
export const useAllAccounts = () => {
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['accounts', 'all'],
        queryFn: () => fetchAllAccounts(userId!),
        enabled: !!userId,
    });
};
