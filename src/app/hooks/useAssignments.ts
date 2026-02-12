import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Assignment = Database['public']['Tables']['assignments']['Row'];

// Fetch all assignments for the current user
const fetchAssignments = async (): Promise<Assignment[]> => {
    const supabase = createClientComponentClient<Database>();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError || !user) throw new Error('Not authenticated');

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
