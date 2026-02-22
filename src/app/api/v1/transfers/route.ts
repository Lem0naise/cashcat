import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
    apiData,
    apiError,
    DATE_REGEX,
    listMeta,
    MONTH_REGEX,
    parseBooleanParam,
    parseDateParam,
    parseEnumParam,
    parseFieldsParam,
    parseNumberParam,
    parsePagination,
    parseUuidParam,
} from '../_helpers';

const TRANSFER_FIELDS = [
    'id',
    'user_id',
    'from_account_id',
    'to_account_id',
    'amount',
    'date',
    'description',
    'created_at',
    'from_account',
    'to_account',
] as const;
const TRANSFER_SORT_FIELDS = ['date', 'created_at', 'amount'] as const;
const ORDER_FIELDS = ['asc', 'desc'] as const;

function getMonthDateRange(month: string) {
    const startDate = `${month}-01`;
    const monthDate = new Date(`${month}-01T00:00:00.000Z`);
    monthDate.setUTCMonth(monthDate.getUTCMonth() + 1);
    monthDate.setUTCDate(0);
    const endDate = monthDate.toISOString().slice(0, 10);
    return { startDate, endDate };
}

function idempotencyUuid(userId: string, endpoint: string, key: string): string {
    const hash = createHash('sha256')
        .update(`${userId}:${endpoint}:${key}`)
        .digest('hex');
    const hex = hash.slice(0, 32).split('');
    hex[12] = '4';
    const variantNibble = parseInt(hex[16], 16);
    hex[16] = ((variantNibble & 0x3) | 0x8).toString(16);
    const normalized = hex.join('');
    return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

const createTransferSchema = z.object({
    from_account_id: z.string().uuid(),
    to_account_id: z.string().uuid(),
    amount: z.number().finite().positive(),
    date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
    description: z.string().trim().optional().nullable(),
});

const updateTransferSchema = z.object({
    id: z.string().uuid(),
    from_account_id: z.string().uuid().optional(),
    to_account_id: z.string().uuid().optional(),
    amount: z.number().finite().positive().optional(),
    date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format').optional(),
    description: z.string().trim().optional().nullable(),
});

async function validateAccountsBelongToUser(
    supabase: ReturnType<typeof getAdminClient>,
    userId: string,
    accountIds: string[]
): Promise<
    | { ok: true; count: number; expected: number }
    | { ok: false; error: { message: string } }
> {
    const uniqueIds = Array.from(new Set(accountIds));
    const { data, error } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .in('id', uniqueIds);

    if (error) return { ok: false, error: { message: error.message } };
    return { ok: true, count: (data || []).length, expected: uniqueIds.length };
}

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);
    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    let startDate = searchParams.get('start_date');
    let endDate = searchParams.get('end_date');
    const descriptionContains = searchParams.get('description_contains');

    const accountIdParsed = parseUuidParam(searchParams.get('account_id'), 'account_id');
    if (!accountIdParsed.ok) return accountIdParsed.response;
    const fromAccountParsed = parseUuidParam(searchParams.get('from_account_id'), 'from_account_id');
    if (!fromAccountParsed.ok) return fromAccountParsed.response;
    const toAccountParsed = parseUuidParam(searchParams.get('to_account_id'), 'to_account_id');
    if (!toAccountParsed.ok) return toAccountParsed.response;

    const amountMinParsed = parseNumberParam(searchParams.get('min_amount'), 'min_amount');
    if (!amountMinParsed.ok) return amountMinParsed.response;
    const amountMaxParsed = parseNumberParam(searchParams.get('max_amount'), 'max_amount');
    if (!amountMaxParsed.ok) return amountMaxParsed.response;
    if (amountMinParsed.value !== null && amountMaxParsed.value !== null && amountMinParsed.value > amountMaxParsed.value) {
        return apiError(400, 'invalid_parameter', 'min_amount cannot be greater than max_amount.');
    }

    const includeAccountsParsed = parseBooleanParam(searchParams.get('include_accounts'), 'include_accounts', true);
    if (!includeAccountsParsed.ok) return includeAccountsParsed.response;

    const sortParsed = parseEnumParam(searchParams.get('sort'), 'sort', TRANSFER_SORT_FIELDS);
    if (!sortParsed.ok) return sortParsed.response;
    const orderParsed = parseEnumParam(searchParams.get('order'), 'order', ORDER_FIELDS);
    if (!orderParsed.ok) return orderParsed.response;

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), TRANSFER_FIELDS);
    if (!fieldsParsed.ok) return fieldsParsed.response;

    const paginationParsed = parsePagination({
        limitRaw: searchParams.get('limit'),
        offsetRaw: searchParams.get('offset'),
        cursorRaw: searchParams.get('cursor'),
        defaultLimit: 100,
        maxLimit: 1000,
    });
    if (!paginationParsed.ok) return paginationParsed.response;

    if (month && (startDate || endDate)) {
        return apiError(400, 'invalid_parameter', "Use either month or start_date/end_date, not both.");
    }

    if (month) {
        if (!MONTH_REGEX.test(month)) {
            return apiError(400, 'invalid_parameter', 'Invalid month format. Use YYYY-MM.');
        }
        const monthRange = getMonthDateRange(month);
        startDate = monthRange.startDate;
        endDate = monthRange.endDate;
    }

    const parsedStartDate = parseDateParam(startDate, 'start_date');
    if (!parsedStartDate.ok) return parsedStartDate.response;
    const parsedEndDate = parseDateParam(endDate, 'end_date');
    if (!parsedEndDate.ok) return parsedEndDate.response;
    if (parsedStartDate.value && parsedEndDate.value && parsedStartDate.value > parsedEndDate.value) {
        return apiError(400, 'invalid_parameter', 'start_date cannot be after end_date.');
    }

    const includeAccounts = includeAccountsParsed.value || (fieldsParsed.value || []).includes('from_account') || (fieldsParsed.value || []).includes('to_account');
    const selectedFields = fieldsParsed.value
        ? fieldsParsed.value.filter((field) => field !== 'from_account' && field !== 'to_account')
        : ['id', 'user_id', 'from_account_id', 'to_account_id', 'amount', 'date', 'description', 'created_at'];
    const internalFields = Array.from(new Set(['id', ...selectedFields]));
    const selectClause = includeAccounts
        ? `${internalFields.join(',')},
            from_account:accounts!transfers_from_account_id_fkey(id,name,type),
            to_account:accounts!transfers_to_account_id_fkey(id,name,type)`
        : internalFields.join(',');

    const supabase = getAdminClient();
    const { limit, offset } = paginationParsed.value;
    const sortField = sortParsed.value || 'date';
    const sortAscending = (orderParsed.value || 'desc') === 'asc';

    let query = supabase
        .from('transfers')
        .select(selectClause, { count: 'exact' })
        .eq('user_id', auth.userId);

    if (parsedStartDate.value) query = query.gte('date', parsedStartDate.value);
    if (parsedEndDate.value) query = query.lte('date', parsedEndDate.value);
    if (fromAccountParsed.value) query = query.eq('from_account_id', fromAccountParsed.value);
    if (toAccountParsed.value) query = query.eq('to_account_id', toAccountParsed.value);
    if (accountIdParsed.value) query = query.or(`from_account_id.eq.${accountIdParsed.value},to_account_id.eq.${accountIdParsed.value}`);
    if (descriptionContains) query = query.ilike('description', `%${descriptionContains}%`);
    if (amountMinParsed.value !== null) query = query.gte('amount', amountMinParsed.value);
    if (amountMaxParsed.value !== null) query = query.lte('amount', amountMaxParsed.value);

    const { data, error, count } = await query
        .order(sortField, { ascending: sortAscending, nullsFirst: true })
        .range(offset, offset + limit - 1);

    if (error) {
        return apiError(500, 'query_failed', 'Failed to fetch transfers', error.message);
    }

    let rows = (data || []) as Record<string, any>[];
    if (fieldsParsed.value) {
        rows = rows.map((row) => {
            const output: Record<string, unknown> = {};
            for (const field of fieldsParsed.value || []) output[field] = row[field];
            if ((fieldsParsed.value || []).includes('from_account')) output.from_account = row.from_account;
            if ((fieldsParsed.value || []).includes('to_account')) output.to_account = row.to_account;
            return output;
        });
    }

    return apiData(
        rows,
        listMeta({
            total: count || 0,
            returned: rows.length,
            limit,
            offset,
            extra: {
                sort: sortField,
                order: sortAscending ? 'asc' : 'desc',
                month: month || null,
                start_date: parsedStartDate.value,
                end_date: parsedEndDate.value,
                include_accounts: includeAccounts,
            },
        })
    );
}

export async function POST(request: NextRequest) {
    const auth = await verifyApiKey(request);
    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const dryRunParsed = parseBooleanParam(new URL(request.url).searchParams.get('dry_run'), 'dry_run', false);
    if (!dryRunParsed.ok) return dryRunParsed.response;
    const dryRun = dryRunParsed.value;

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return apiError(400, 'invalid_body', 'Invalid JSON body.');
    }

    const parsed = createTransferSchema.safeParse(payload);
    if (!parsed.success) {
        return apiError(400, 'validation_failed', 'Transfer payload is invalid.', parsed.error.flatten());
    }

    const transfer = parsed.data;
    if (transfer.from_account_id === transfer.to_account_id) {
        return apiError(400, 'validation_failed', 'from_account_id and to_account_id must be different.');
    }

    const supabase = getAdminClient();
    const accountValidation = await validateAccountsBelongToUser(supabase, auth.userId, [transfer.from_account_id, transfer.to_account_id]);
    if (!accountValidation.ok) {
        return apiError(500, 'query_failed', 'Failed to validate transfer accounts', accountValidation.error.message);
    }
    if (accountValidation.count !== accountValidation.expected) {
        return apiError(400, 'validation_failed', 'One or both accounts do not belong to this user.');
    }

    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey && idempotencyKey.length > 200) {
        return apiError(400, 'invalid_parameter', 'Idempotency-Key must be 200 characters or fewer.');
    }

    const insertId = idempotencyKey
        ? idempotencyUuid(auth.userId, 'transfers:post', idempotencyKey)
        : undefined;

    if (insertId) {
        const { data: existing } = await supabase
            .from('transfers')
            .select('*')
            .eq('id', insertId)
            .eq('user_id', auth.userId)
            .single();
        if (existing) {
            return apiData(existing, { idempotent_replay: true });
        }
    }

    const insertPayload = {
        ...(insertId ? { id: insertId } : {}),
        user_id: auth.userId,
        from_account_id: transfer.from_account_id,
        to_account_id: transfer.to_account_id,
        amount: transfer.amount,
        date: transfer.date,
        description: transfer.description || null,
        created_at: new Date().toISOString(),
    };

    if (dryRun) {
        return apiData({ valid: true, transfer: insertPayload }, { dry_run: true });
    }

    const { data, error } = await supabase
        .from('transfers')
        .insert(insertPayload)
        .select('*')
        .single();

    if (error) {
        return apiError(400, 'insert_failed', 'Failed to create transfer.', error.message);
    }

    return apiData(data, { created: true });
}

export async function PUT(request: NextRequest) {
    const auth = await verifyApiKey(request);
    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const dryRunParsed = parseBooleanParam(new URL(request.url).searchParams.get('dry_run'), 'dry_run', false);
    if (!dryRunParsed.ok) return dryRunParsed.response;
    const dryRun = dryRunParsed.value;

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return apiError(400, 'invalid_body', 'Invalid JSON body.');
    }

    const parsed = updateTransferSchema.safeParse(payload);
    if (!parsed.success) {
        return apiError(400, 'validation_failed', 'Transfer update payload is invalid.', parsed.error.flatten());
    }

    const { id, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
        return apiError(400, 'validation_failed', 'No update fields provided.');
    }

    const supabase = getAdminClient();
    const { data: existingTransfer, error: existingError } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .eq('user_id', auth.userId)
        .single();

    if (existingError || !existingTransfer) {
        return apiError(404, 'not_found', 'Transfer not found.');
    }

    const effectiveFrom = updates.from_account_id || existingTransfer.from_account_id;
    const effectiveTo = updates.to_account_id || existingTransfer.to_account_id;
    if (effectiveFrom === effectiveTo) {
        return apiError(400, 'validation_failed', 'from_account_id and to_account_id must be different.');
    }

    const accountValidation = await validateAccountsBelongToUser(supabase, auth.userId, [effectiveFrom, effectiveTo]);
    if (!accountValidation.ok) {
        return apiError(500, 'query_failed', 'Failed to validate transfer accounts', accountValidation.error.message);
    }
    if (accountValidation.count !== accountValidation.expected) {
        return apiError(400, 'validation_failed', 'One or both accounts do not belong to this user.');
    }

    const updatePayload = {
        ...updates,
        description: Object.prototype.hasOwnProperty.call(updates, 'description') ? updates.description || null : existingTransfer.description,
    };

    if (dryRun) {
        return apiData({ valid: true, id, updates: updatePayload }, { dry_run: true });
    }

    const { data, error } = await supabase
        .from('transfers')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', auth.userId)
        .select('*')
        .single();

    if (error) {
        return apiError(400, 'update_failed', 'Failed to update transfer.', error.message);
    }

    return apiData(data, { updated: true });
}

export async function DELETE(request: NextRequest) {
    const auth = await verifyApiKey(request);
    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const idParsed = parseUuidParam(searchParams.get('id'), 'id');
    if (!idParsed.ok) return idParsed.response;
    if (!idParsed.value) return apiError(400, 'missing_parameter', 'Missing required id parameter.');

    const dryRunParsed = parseBooleanParam(searchParams.get('dry_run'), 'dry_run', false);
    if (!dryRunParsed.ok) return dryRunParsed.response;
    const dryRun = dryRunParsed.value;

    const supabase = getAdminClient();
    const { data: existingTransfer, error: fetchError } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', idParsed.value)
        .eq('user_id', auth.userId)
        .single();

    if (fetchError || !existingTransfer) {
        return apiError(404, 'not_found', 'Transfer not found.');
    }

    if (dryRun) {
        return apiData({ valid: true, transfer: existingTransfer }, { dry_run: true });
    }

    const { error } = await supabase
        .from('transfers')
        .delete()
        .eq('id', idParsed.value)
        .eq('user_id', auth.userId);

    if (error) {
        return apiError(400, 'delete_failed', 'Failed to delete transfer.', error.message);
    }

    return apiData({ success: true, id: idParsed.value });
}
