import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import { useAuthUserId, getCachedUserId } from '@/app/hooks/useAuthUserId';

type UsageCounts = {
    import_count: number;
    export_count: number;
};

const fetchUsage = async (userId: string): Promise<UsageCounts> => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('settings')
        .select('import_count, export_count')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[useUsage] fetch error:', error);
        return { import_count: 0, export_count: 0 };
    }

    return {
        import_count: data?.import_count ?? 0,
        export_count: data?.export_count ?? 0,
    };
};

/**
 * Hook to read the user's import/export usage counts from the settings table.
 * Used for gating free users on import (2 free) and export (2 free).
 */
export function useUsage() {
    const userId = useAuthUserId();

    const query = useQuery({
        queryKey: ['usage', userId],
        queryFn: () => fetchUsage(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        importCount: query.data?.import_count ?? 0,
        exportCount: query.data?.export_count ?? 0,
        isLoading: query.isLoading,
        refetch: query.refetch,
    };
}

/**
 * Increment a usage counter (import_count or export_count) in the settings table.
 * Call this after a successful import or export completes.
 */
export async function incrementUsage(field: 'import_count' | 'export_count') {
    const userId = getCachedUserId();
    if (!userId) return;

    const supabase = createClient();

    // Read current value
    const { data: current } = await supabase
        .from('settings')
        .select(field)
        .eq('id', userId)
        .maybeSingle();

    const currentValue = (current as any)?.[field] ?? 0;

    // Upsert with incremented value
    await supabase
        .from('settings')
        .upsert(
            { id: userId, [field]: currentValue + 1 },
            { onConflict: 'id' }
        );
}
