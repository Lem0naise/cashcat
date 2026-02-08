import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Account = Database['public']['Tables']['accounts']['Row'];

// Fetch all active accounts for the current user
const fetchAccounts = async (): Promise<Account[]> => {
    const supabase = createClientComponentClient<Database>();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data || [];
};

// Custom hook for accounts
export const useAccounts = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: fetchAccounts,
    });
};
