import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Expecting 'YYYY-MM-DD'

    const supabase = getAdminClient();

    let query = supabase
        .from('assignments')
        .select('*')
        .eq('user_id', auth.userId);

    if (month) {
        // Validate month format (YYYY-MM)
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
        }
        query = query.eq('month', month);
    } else {
        // Default behavior? Maybe limiting or requiring month is better to avoid dumping ALL history?
        // Let's just limit by default if no month specified to avoid massive payloads, 
        // or just trust the user knows what they are doing.
        // Let's implicit limit to recent 1000 or so if pagination was implemented, 
        // but simpler to just return all for now as user requested "all possible features".
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    return NextResponse.json({ data });
}
