import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { checkSubscription } from '@/lib/subscription';

/**
 * GET /api/subscription/status
 *
 * Returns the current authenticated user's subscription status.
 * Used by the Account page client component to display Pro status.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await checkSubscription(user.id);
    return NextResponse.json(subscription);
}
