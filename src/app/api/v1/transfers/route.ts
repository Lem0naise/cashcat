import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAdminClient();

    // Fetch transfers for this user
    const { data, error } = await supabase
        .from('transfers')
        .select(`
            *,
            from_account:accounts!transfers_from_account_id_fkey (
                id,
                name,
                type
            ),
            to_account:accounts!transfers_to_account_id_fkey (
                id,
                name,
                type
            )
        `)
        .eq('user_id', auth.userId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
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

        // Validate required fields
        if (!json.from_account_id || !json.to_account_id || !json.amount || !json.date) {
            return NextResponse.json({ 
                error: 'Missing required fields: from_account_id, to_account_id, amount, date' 
            }, { status: 400 });
        }

        // Ensure from and to accounts are different
        if (json.from_account_id === json.to_account_id) {
            return NextResponse.json({ 
                error: 'from_account_id and to_account_id must be different' 
            }, { status: 400 });
        }

        const supabase = getAdminClient();

        // Verify both accounts belong to the user
        const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', auth.userId)
            .in('id', [json.from_account_id, json.to_account_id]);

        if (accountsError || !accounts || accounts.length !== 2) {
            return NextResponse.json({ 
                error: 'One or both accounts not found or do not belong to user' 
            }, { status: 400 });
        }

        const transferData = {
            from_account_id: json.from_account_id,
            to_account_id: json.to_account_id,
            amount: json.amount,
            date: json.date,
            description: json.description || null,
            user_id: auth.userId,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('transfers')
            .insert(transferData)
            .select()
            .single();

        if (error) {
            console.error('API Transfer Create Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data }, { status: 201 });

    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
}

export async function PUT(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const json = await request.json();
        const { id, ...updates } = json;

        if (!id) {
            return NextResponse.json({ error: 'Missing transfer id' }, { status: 400 });
        }

        // If updating accounts, ensure they're different
        if (updates.from_account_id && updates.to_account_id && 
            updates.from_account_id === updates.to_account_id) {
            return NextResponse.json({ 
                error: 'from_account_id and to_account_id must be different' 
            }, { status: 400 });
        }

        const supabase = getAdminClient();

        const { data, error } = await supabase
            .from('transfers')
            .update(updates)
            .eq('id', id)
            .eq('user_id', auth.userId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data });

    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing transfer id' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error } = await supabase
        .from('transfers')
        .delete()
        .eq('id', id)
        .eq('user_id', auth.userId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
