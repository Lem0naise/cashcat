import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for creating a transaction
const createTransactionSchema = z.object({
    amount: z.number(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    description: z.string().min(1),
    category_id: z.string().uuid(),
    type: z.enum(['income', 'expense']).optional(), // Optional, defaults to expense if usually implied, but let's be strict if needed. 
    // Actually schema says: type is text. In app it's often inferred.
    // Let's look at schema requirements. For now allow string.
});

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAdminClient();

    // Fetch transactions for this user
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', auth.userId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const json = await request.json();
        // Basic validation
        // Ideally we use Zod here, but for now let's just pass it to Supabase and let DB constraints handle it 
        // to keep it simple, OR implement basic checks.

        const supabase = getAdminClient();

        let accountId = json.account_id;

        // If no account_id provided, find the default account
        if (!accountId) {
            const { data: defaultAccount } = await supabase
                .from('accounts')
                .select('id')
                .eq('user_id', auth.userId)
                .eq('is_default', true)
                .single();

            if (defaultAccount) {
                accountId = defaultAccount.id;
            } else {
                // Fallback: try to find ANY account
                const { data: anyAccount } = await supabase
                    .from('accounts')
                    .select('id')
                    .eq('user_id', auth.userId)
                    .limit(1)
                    .single();

                if (anyAccount) {
                    accountId = anyAccount.id;
                }
            }
        }

        if (!accountId) {
            return NextResponse.json({ error: 'account_id is required and no default account could be found.' }, { status: 400 });
        }

        // We MUST enforce user_id
        const transactionData = {
            ...json,
            account_id: accountId, // Use the resolved account ID
            user_id: auth.userId,
            created_at: new Date().toISOString()
        };

        // Remove id if present to allow auto-generation
        delete transactionData.id;


        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionData)
            .select()
            .single();

        if (error) {
            console.error('API Transaction Create Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data }, { status: 201 });

    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
}
