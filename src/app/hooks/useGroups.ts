import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';
import { useAuthUserId } from './useAuthUserId';

type Group = Database['public']['Tables']['groups']['Row'];

// Fetch all groups for a given user
const fetchGroups = async (userId: string): Promise<Group[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', userId)
        .order('name');

    if (error) throw error;
    return data || [];
};

// Custom hook for groups
export const useGroups = () => {
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['groups'],
        queryFn: () => fetchGroups(userId!),
        enabled: !!userId,
    });
};
