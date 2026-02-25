import { useState, useEffect } from 'react';
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
 */
export function useSubscription() {
    const { user, loading: userLoading } = useSupabase();
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If user context is still loading, wait.
        if (userLoading) return;

        // If no user is logged in, they can't have a subscription.
        if (!user) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        // 1. Check FOREVER_PRO_EMAILS override
        const email = user.email ?? '';
        if (email && FOREVER_PRO_EMAILS.has(email.toLowerCase())) {
            setSubscription({
                isActive: true,
                status: 'active',
                variantId: null,
                renewsAt: null,
                endsAt: null,
            });
            setLoading(false);
            return;
        }

        // 2. Query Supabase directly (respects RLS)
        // Need to import createClient dynamically or pass from context? 
        // We can just use standard Supabase client creation since we only need the public DB queries.
        // Actually, we should import `createClient` from `@/app/utils/supabase` to respect native/web split.
        const checkDb = async () => {
            try {
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
                    setSubscription(null);
                } else if (!rawData) {
                    setSubscription(null);
                } else {
                    const data = rawData as any;
                    const status = data.status as SubscriptionStatus;
                    setSubscription({
                        isActive: ACTIVE_STATUSES.includes(status),
                        status: status,
                        variantId: data.variant_id ?? null,
                        renewsAt: data.renews_at ?? null,
                        endsAt: data.ends_at ?? null,
                    });
                }
            } catch (err) {
                console.error('[useSubscription] execution err:', err);
                setSubscription(null);
            } finally {
                setLoading(false);
            }
        };

        checkDb();
    }, [user, userLoading]);

    return { subscription, loading };
}
