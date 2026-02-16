import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';
import { useAuthUserId } from './useAuthUserId';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryWithGroup = Category & {
    groups: { name: string } | null;
};

// Fetch all categories for a given user
const fetchCategories = async (userId: string): Promise<CategoryWithGroup[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('categories')
        .select(`
            *,
            groups (
                name
            )
        `)
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) throw error;
    return (data as any) || [];
};

// Custom hook for categories
export const useCategories = () => {
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['categories'],
        queryFn: () => fetchCategories(userId!),
        enabled: !!userId,
    });
};
