'use client';

import { useSupabase } from '../contexts/supabase-provider';

/**
 * Hook to get user ID from the SupabaseProvider context.
 * Since the provider now loads from localStorage cache, this is available instantly.
 */
export function useAuthUserId(): string | null {
    const { user } = useSupabase();
    return user?.id ?? null;
}

/**
 * Get the cached user ID directly from localStorage.
 * Use this in mutation functions where React hooks aren't available.
 */
export function getCachedUserId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem('cashcat-user');
        if (!cached) return null;
        return JSON.parse(cached)?.id ?? null;
    } catch {
        return null;
    }
}
