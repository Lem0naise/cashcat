import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchLunchFlowAccounts, fetchLunchFlowTransactions } from '@/app/services/lunchflow';
import { getOrCreateVendorMapping, ExistingVendor } from '@/app/services/vendor-matching';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * Get the Lunch Flow API key for a user.
 * Currently uses env var (hardcoded for testing).
 * TODO: Read from integration_keys table when Phase 4 is implemented.
 */
async function getLunchFlowApiKey(_userId: string): Promise<string | null> {
    return process.env.LUNCHFLOW_API_KEY || null;
}

export async function POST(request: NextRequest) {
    try {
        // Auth: get user from Authorization header (Supabase access token)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const supabase = getAdminClient();

        // Verify the token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        // Get LF API key
        const apiKey = await getLunchFlowApiKey(userId);
        if (!apiKey) {
            return NextResponse.json({ error: 'No Lunch Flow API key configured' }, { status: 400 });
        }

        // Fetch LF accounts
        const lfAccountsResponse = await fetchLunchFlowAccounts(apiKey);
        const lfAccounts = lfAccountsResponse.accounts.filter(a => a.status === 'ACTIVE');

        // Get CashCat accounts linked to LF
        const { data: cashcatAccounts, error: accError } = await supabase
            .from('accounts')
            .select('id, name, lunchflow_account_id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (accError) {
            return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
        }

        // Build a map of LF account ID -> CashCat account ID
        const linkedAccounts = new Map<number, string>();
        for (const ccAcc of (cashcatAccounts || [])) {
            if (ccAcc.lunchflow_account_id) {
                linkedAccounts.set(parseInt(ccAcc.lunchflow_account_id), ccAcc.id);
            }
        }

        // If no linked accounts, return early
        if (linkedAccounts.size === 0) {
            return NextResponse.json({
                synced: 0,
                accounts: 0,
                skipped: 0,
                message: 'No linked Lunch Flow accounts. Link accounts in the Manage Bank Accounts modal.',
                errors: [],
            });
        }

        // Fetch existing vendors for this user (for matching)
        const { data: vendorRows } = await supabase
            .from('vendors')
            .select('id, name')
            .eq('user_id', userId);
        const existingVendors: ExistingVendor[] = (vendorRows || []).map(v => ({ id: v.id, name: v.name }));

        let totalSynced = 0;
        let totalSkipped = 0;
        let accountsSynced = 0;
        const errors: string[] = [];

        // Sync each linked LF account
        for (const lfAccount of lfAccounts) {
            const cashcatAccountId = linkedAccounts.get(lfAccount.id);
            if (!cashcatAccountId) continue; // Not linked, skip

            try {
                const lfTransactions = await fetchLunchFlowTransactions(apiKey, lfAccount.id);

                // Filter out pending transactions
                const confirmedTransactions = lfTransactions.transactions.filter(t => !t.isPending);

                if (confirmedTransactions.length === 0) {
                    accountsSynced++;
                    continue;
                }

                // Get existing LF transaction IDs for this account to deduplicate
                const lfIds = confirmedTransactions.map(t => t.id);
                const { data: existingTxns } = await supabase
                    .from('transactions')
                    .select('lunchflow_id')
                    .eq('user_id', userId)
                    .in('lunchflow_id', lfIds);

                const existingLfIds = new Set((existingTxns || []).map(t => t.lunchflow_id));

                // Filter to only new transactions
                const newTransactions = confirmedTransactions.filter(t => !existingLfIds.has(t.id));
                totalSkipped += confirmedTransactions.length - newTransactions.length;

                if (newTransactions.length === 0) {
                    accountsSynced++;
                    continue;
                }

                // Process each new transaction
                const toInsert = [];
                for (const lfTx of newTransactions) {
                    const merchantName = lfTx.merchant || lfTx.description || 'Unknown';

                    // Vendor matching
                    const { vendorId, vendorName } = await getOrCreateVendorMapping(
                        userId,
                        merchantName,
                        existingVendors,
                        supabase
                    );

                    // If a new vendor was created, add it to our working list
                    if (vendorId && !existingVendors.find(v => v.id === vendorId)) {
                        existingVendors.push({ id: vendorId, name: vendorName });
                    }

                    // Determine type and amount
                    // LF: positive amounts = money spent (debit), negative = money received (credit)
                    // CashCat: positive = income, negative = expense
                    const isExpense = lfTx.amount > 0;
                    const cashcatAmount = isExpense ? -Math.abs(lfTx.amount) : Math.abs(lfTx.amount);

                    toInsert.push({
                        user_id: userId,
                        account_id: cashcatAccountId,
                        amount: cashcatAmount,
                        type: isExpense ? 'expense' : 'income',
                        date: lfTx.date,
                        vendor: vendorName,
                        vendor_id: vendorId || null,
                        description: `[LF] ${lfTx.description || merchantName}`,
                        lunchflow_id: lfTx.id,
                        created_at: new Date().toISOString(),
                    });
                }

                // Batch insert
                if (toInsert.length > 0) {
                    const { error: insertError } = await supabase
                        .from('transactions')
                        .insert(toInsert);

                    if (insertError) {
                        console.error(`Error inserting transactions for LF account ${lfAccount.id}:`, insertError);
                        errors.push(`Failed to sync ${lfAccount.name}: ${insertError.message}`);
                    } else {
                        totalSynced += toInsert.length;
                    }
                }

                accountsSynced++;
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Error syncing LF account ${lfAccount.name}:`, err);
                errors.push(`Failed to sync ${lfAccount.name}: ${msg}`);
            }
        }

        return NextResponse.json({
            synced: totalSynced,
            accounts: accountsSynced,
            skipped: totalSkipped,
            errors,
        });
    } catch (err) {
        console.error('Lunch Flow sync error:', err);
        return NextResponse.json(
            { error: 'Internal server error during sync' },
            { status: 500 }
        );
    }
}
