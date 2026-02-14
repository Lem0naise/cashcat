import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { useAuthUserId } from './useAuthUserId';

type Vendor = Database['public']['Tables']['vendors']['Row'];

// Fetch all vendors for a given user
const fetchVendors = async (userId: string): Promise<Vendor[]> => {
    const supabase = createClientComponentClient<Database>();

    const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .order('name');

    if (error) throw error;
    return data || [];
};

// Custom hook for vendors
export const useVendors = () => {
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['vendors'],
        queryFn: () => fetchVendors(userId!),
        enabled: !!userId,
    });
};
