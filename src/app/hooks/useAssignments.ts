import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';

type Assignment = Database['public']['Tables']['assignments']['Row'];

// Fetch all assignments for the current user
const fetchAssignments = async (): Promise<Assignment[]> => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
};

// Custom hook for assignments
export const useAssignments = () => {
    return useQuery({
        queryKey: ['assignments'],
        queryFn: fetchAssignments,
    });
};
