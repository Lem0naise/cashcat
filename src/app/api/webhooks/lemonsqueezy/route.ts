import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { adminClient } from '@/app/utils/supabase/admin';

/**
 * POST /api/webhooks/lemonsqueezy
 *
 * Handles Lemon Squeezy subscription webhooks:
 *  - subscription_created
 *  - subscription_updated
 *  - subscription_cancelled
 *
 * Security:
 *  - Verifies the HMAC-SHA256 signature in the X-Signature header.
 *  - Uses the admin Supabase client (service role) to bypass RLS when upserting.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    // 1. Read raw body as text (needed for signature verification)
    const rawBody = await request.text();

    // 2. Verify signature
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[LS Webhook] Missing LEMONSQUEEZY_WEBHOOK_SECRET');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const incomingSignature = request.headers.get('X-Signature');
    if (!incomingSignature) {
        console.warn('[LS Webhook] Missing X-Signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const expectedHmac = createHmac('sha256', secret).update(rawBody).digest('hex');

    // Constant-time comparison to prevent timing attacks
    let isValid = false;
    try {
        isValid = timingSafeEqual(
            Buffer.from(incomingSignature, 'hex'),
            Buffer.from(expectedHmac, 'hex')
        );
    } catch {
        // Buffers of different length will throw — treat as invalid
        isValid = false;
    }

    if (!isValid) {
        console.warn('[LS Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse payload
    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventName: string = payload?.meta?.event_name ?? '';

    // 4. Only handle subscription events
    const handled = ['subscription_created', 'subscription_updated', 'subscription_cancelled'];
    if (!handled.includes(eventName)) {
        // Acknowledge other events without processing
        return NextResponse.json({ received: true });
    }

    // 5. Extract user_id from custom data
    const userId: string | undefined = payload?.meta?.custom_data?.user_id;
    if (!userId) {
        console.error('[LS Webhook] No user_id in meta.custom_data:', JSON.stringify(payload?.meta));
        return NextResponse.json({ error: 'Missing user_id in custom_data' }, { status: 422 });
    }

    // 6. Extract subscription data
    const attributes = payload?.data?.attributes ?? {};
    const lsSubscriptionId: string = String(payload?.data?.id ?? '');

    const subscriptionRow = {
        user_id: userId,
        lemon_squeezy_subscription_id: lsSubscriptionId,
        lemon_squeezy_customer_id: String(attributes.customer_id ?? ''),
        order_id: String(attributes.order_id ?? ''),
        variant_id: String(attributes.variant_id ?? ''),
        product_id: String(attributes.product_id ?? ''),
        status: (attributes.status as string) ?? 'inactive',
        renews_at: attributes.renews_at ?? null,
        ends_at: attributes.ends_at ?? null,
        trial_ends_at: attributes.trial_ends_at ?? null,
    };

    // 7. Upsert using the admin client (bypasses RLS)
    const { error: upsertError } = await adminClient
        .from('subscriptions')
        .upsert(subscriptionRow, {
            onConflict: 'lemon_squeezy_subscription_id',
        });

    if (upsertError) {
        console.error('[LS Webhook] Upsert error:', upsertError.message);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`[LS Webhook] Processed ${eventName} for user ${userId} — status: ${subscriptionRow.status}`);
    return NextResponse.json({ received: true });
}
