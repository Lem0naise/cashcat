import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/app/contexts/supabase-provider';
import { SubscriptionInfo, SubscriptionStatus } from '@/lib/subscription';

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'on_trial'];

const FOREVER_PRO_EMAILS = new Set([
    'indigogonolan@gmail.com',
    'wilcoxjedu@gmail.com',
]);

/**
 * Client-side hook to check if the current user has CashCat Pro.
 * Queries the `subscriptions` table directly, which works cross-platform
 * (including Capacitor native apps where API routes fail).
 * 
 * Uses React Query to cache the result for offline access.
 */
export function useSubscription() {
    const { user, loading: userLoading } = useSupabase();

    const { data: subscription, isLoading } = useQuery({
        queryKey: ['subscription', user?.id],
        queryFn: async (): Promise<SubscriptionInfo | null> => {
            if (!user) return null;

            // 1. Check FOREVER_PRO_EMAILS override
            const email = user.email ?? '';
            if (email && FOREVER_PRO_EMAILS.has(email.toLowerCase())) {
                return {
                    isActive: true,
                    status: 'active',
                    variantId: null,
                    renewsAt: null,
                    endsAt: null,
                };
            }

            // 2. Query Supabase directly (respects RLS)
            // Dynamically import client so it's fresh
            const { createClient } = await import('@/app/utils/supabase');
            const supabase = createClient();

            const { data: rawData, error } = await supabase
                .from('subscriptions' as any)
                .select('status, variant_id, renews_at, ends_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('[useSubscription] DB err:', error);
                return null;
            }

            if (!rawData) {
                return null;
            }

            const data = rawData as any;
            const status = data.status as SubscriptionStatus;

            return {
                isActive: ACTIVE_STATUSES.includes(status),
                status: status,
                variantId: data.variant_id ?? null,
                renewsAt: data.renews_at ?? null,
                endsAt: data.ends_at ?? null,
            };
        },
        enabled: !userLoading && !!user, // wait for user session to resolve, and only run if logged in
        staleTime: 1000 * 60 * 60 * 24, // 24 hours - we rely on webhooks to update the DB, client can cache it heavily
        gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days (keep it around for a month offline)
        retry: 1, // only retry once to avoid spamming if offline
    });

    // Provide a default null structure when not yet loaded or no user
    const defaultSub: SubscriptionInfo = {
        isActive: false,
        status: null,
        variantId: null,
        renewsAt: null,
        endsAt: null,
    };

    return {
        subscription: subscription ?? defaultSub,
        loading: userLoading || isLoading
    };
}
