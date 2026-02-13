import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchLunchFlowAccounts } from '@/app/services/lunchflow';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * GET /api/v1/lunchflow/accounts
 * Proxies the Lunch Flow accounts endpoint so the API key stays server-side.
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const supabase = getAdminClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get LF API key (hardcoded for now)
        const apiKey = process.env.LUNCHFLOW_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'No Lunch Flow API key configured' }, { status: 400 });
        }

        const lfAccounts = await fetchLunchFlowAccounts(apiKey);

        return NextResponse.json(lfAccounts);
    } catch (err) {
        console.error('Error fetching LF accounts:', err);
        return NextResponse.json(
            { error: 'Failed to fetch Lunch Flow accounts' },
            { status: 500 }
        );
    }
}
