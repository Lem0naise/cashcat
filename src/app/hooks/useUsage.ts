import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import { useAuthUserId, getCachedUserId } from '@/app/hooks/useAuthUserId';

export const FREE_IMPORT_LIMIT = 2;
export const FREE_EXPORT_LIMIT = 3;

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
 * Atomically increment a usage counter (import_count or export_count).
 * Uses a server-side RPC to avoid the read-modify-write race condition that
 * could allow concurrent imports/exports to bypass the free-tier paywall.
 * Requires the increment_usage_count() Postgres function (migration: 20260226_increment_usage.sql).
 */
export async function incrementUsage(field: 'import_count' | 'export_count') {
    const userId = getCachedUserId();
    if (!userId) return;

    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('increment_usage_count', {
        p_user_id: userId,
        p_field: field,
    });

    if (error) {
        // Non-fatal: log and continue. Offline users will miss the increment,
        // which is acceptable — we don't want a counter failure to break import/export.
        console.warn('[incrementUsage] RPC error (may be offline):', error);
    }
}
