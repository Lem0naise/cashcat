import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';
import { useAuthUserId } from './useAuthUserId';

type Assignment = Database['public']['Tables']['assignments']['Row'];

// Fetch all assignments for a given user
const fetchAssignments = async (userId: string): Promise<Assignment[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data || [];
};

// Custom hook for assignments
export const useAssignments = () => {
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['assignments'],
        queryFn: () => fetchAssignments(userId!),
        enabled: !!userId,
    });
};
