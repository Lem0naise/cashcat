import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', auth.userId)
        .order('name');

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    return NextResponse.json({ data });
}
