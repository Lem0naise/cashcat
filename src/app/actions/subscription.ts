'use server';

import { createClient } from '@/app/utils/supabase/server';
import { createCheckoutUrl } from '@/lib/lemonsqueezy';

export type CheckoutResult =
    | { success: true; checkoutUrl: string }
    | { success: false; error: string };

/**
 * Server Action: creates a Lemon Squeezy checkout URL for the current user.
 * Call from a client component; redirect the browser to the returned URL.
 */
export async function createCheckoutAction(): Promise<CheckoutResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'You must be logged in to upgrade.' };
    }

    try {
        const { checkoutUrl } = await createCheckoutUrl(user.id, user.email);
        return { success: true, checkoutUrl };
    } catch (err) {
        console.error('[createCheckoutAction]', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to create checkout. Please try again.',
        };
    }
}
