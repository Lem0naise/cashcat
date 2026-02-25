import { adminClient } from '@/app/utils/supabase/admin';

export type SubscriptionStatus =
    | 'active'
    | 'on_trial'
    | 'past_due'
    | 'unpaid'
    | 'cancelled'
    | 'expired'
    | 'paused'
    | 'inactive';

export interface SubscriptionInfo {
    isActive: boolean;
    status: SubscriptionStatus | null;
    variantId: string | null;
    renewsAt: string | null;
    endsAt: string | null;
}

/** Statuses that grant access to Pro features */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'on_trial'];

/**
 * Emails that always get Pro access, regardless of Supabase subscription rows.
 * Used for founders / internal testers.
 */
const FOREVER_PRO_EMAILS = new Set([
    'indigogonolan@gmail.com',
    'wilcoxjedu@gmail.com',
]);

/**
 * Server-side helper to check if a user has an active CashCat Pro subscription.
 * Uses the admin client to bypass RLS — only call from server-side code.
 *
 * Founders in FOREVER_PRO_EMAILS always receive active status regardless of DB.
 *
 * @example
 * // In a Server Component:
 * const { isActive } = await checkSubscription(userId);
 */
export async function checkSubscription(userId: string): Promise<SubscriptionInfo> {
    if (!userId) {
        return { isActive: false, status: null, variantId: null, renewsAt: null, endsAt: null };
    }

    // Resolve the user's email to check the founder list
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    const email = userData?.user?.email ?? '';

    if (email && FOREVER_PRO_EMAILS.has(email.toLowerCase())) {
        return {
            isActive: true,
            status: 'active',
            variantId: null,
            renewsAt: null,
            endsAt: null,
        };
    }

    // Check the subscriptions table
    const { data, error } = await adminClient
        .from('subscriptions')
        .select('status, variant_id, renews_at, ends_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[checkSubscription] DB error:', error.message);
        return { isActive: false, status: null, variantId: null, renewsAt: null, endsAt: null };
    }

    if (!data) {
        return { isActive: false, status: null, variantId: null, renewsAt: null, endsAt: null };
    }

    const status = data.status as SubscriptionStatus;
    const isActive = ACTIVE_STATUSES.includes(status);

    return {
        isActive,
        status,
        variantId: data.variant_id ?? null,
        renewsAt: data.renews_at ?? null,
        endsAt: data.ends_at ?? null,
    };
}
