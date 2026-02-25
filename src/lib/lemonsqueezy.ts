/**
 * Lemon Squeezy API helpers.
 * All functions are server-side only (use in Server Actions / API Routes).
 */

const LS_API_URL = 'https://api.lemonsqueezy.com/v1';

function getHeaders() {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) throw new Error('Missing LEMONSQUEEZY_API_KEY environment variable.');
    return {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
    };
}

export interface CreateCheckoutResult {
    checkoutUrl: string;
    checkoutId: string;
}

/**
 * Creates a Lemon Squeezy checkout URL for the Pro subscription.
 * The authenticated user's ID is embedded in `checkout_data.custom` so
 * the webhook can map the payment back to the correct Supabase user.
 */
export async function createCheckoutUrl(
    userId: string,
    userEmail?: string
): Promise<CreateCheckoutResult> {
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

    if (!storeId) throw new Error('Missing LEMONSQUEEZY_STORE_ID environment variable.');
    if (!variantId) throw new Error('Missing LEMONSQUEEZY_VARIANT_ID environment variable.');

    const body = {
        data: {
            type: 'checkouts',
            attributes: {
                checkout_options: {
                    embed: false,
                    media: true,
                    logo: true,
                },
                checkout_data: {
                    email: userEmail,
                    custom: {
                        // CRITICAL: this is how the webhook maps the payment to a user
                        user_id: userId,
                    },
                },
                product_options: {
                    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/account?upgraded=true`,
                    receipt_link_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/account`,
                },
            },
            relationships: {
                store: {
                    data: { type: 'stores', id: String(storeId) },
                },
                variant: {
                    data: { type: 'variants', id: String(variantId) },
                },
            },
        },
    };

    const response = await fetch(`${LS_API_URL}/checkouts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('[LemonSqueezy] Checkout creation failed:', error);
        throw new Error(`Lemon Squeezy API error: ${response.status}`);
    }

    const json = await response.json();
    const checkoutUrl: string = json?.data?.attributes?.url;
    const checkoutId: string = json?.data?.id;

    if (!checkoutUrl) {
        throw new Error('No checkout URL returned from Lemon Squeezy.');
    }

    return { checkoutUrl, checkoutId };
}
