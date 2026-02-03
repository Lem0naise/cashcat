import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryWithGroup = Category & {
    groups: { name: string } | null;
};

// Fetch all categories for the current user
const fetchCategories = async (): Promise<CategoryWithGroup[]> => {
    const supabase = createClientComponentClient<Database>();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('categories')
        .select(`
            *,
            groups (
                name
            )
        `)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return (data as any) || [];
};

// Custom hook for categories
export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
    });
};
