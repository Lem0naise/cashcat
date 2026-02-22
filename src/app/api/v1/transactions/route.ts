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

const TRANSACTION_FIELDS = [
    'id',
    'account_id',
    'amount',
    'category_id',
    'created_at',
    'date',
    'description',
    'type',
    'user_id',
    'vendor',
    'vendor_id',
] as const;
const TRANSACTION_SORT_FIELDS = ['date', 'created_at', 'amount', 'vendor', 'type'] as const;
const ORDER_FIELDS = ['asc', 'desc'] as const;
const INCLUDE_FIELDS = ['account', 'category', 'vendor'] as const;
const TRANSACTION_TYPES = ['income', 'payment', 'starting'] as const;

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

function parseInclude(includeRaw: string | null): { value?: string[]; error?: string } {
    if (!includeRaw) return { value: [] };
    const parsed = includeRaw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    const invalid = parsed.find((part) => !INCLUDE_FIELDS.includes(part as typeof INCLUDE_FIELDS[number]));
    if (invalid) return { error: `Invalid include value '${invalid}'. Allowed: ${INCLUDE_FIELDS.join(', ')}` };
    return { value: Array.from(new Set(parsed)) };
}

function buildSelectClause(baseFields: string[], includes: string[]) {
    const fields = [...baseFields];
    if (includes.includes('account')) {
        fields.push('account:accounts(id,name,type)');
    }
    if (includes.includes('category')) {
        fields.push('category:categories(id,name,group)');
    }
    if (includes.includes('vendor')) {
        fields.push('vendor_details:vendors(id,name)');
    }
    return fields.join(',');
}

const createTransactionSchema = z
    .object({
        amount: z.number().finite(),
        date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
        description: z.string().trim().min(1).optional().nullable(),
        vendor: z.string().trim().min(1).optional().nullable(),
        vendor_id: z.string().uuid().optional().nullable(),
        category_id: z.string().uuid().optional().nullable(),
        account_id: z.string().uuid().optional(),
        type: z.enum(TRANSACTION_TYPES).optional().default('payment'),
    })
    .superRefine((value, ctx) => {
        if (value.type === 'payment' && !value.category_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['category_id'],
                message: 'category_id is required when type=payment',
            });
        }
    });

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
    const vendorSearch = searchParams.get('vendor');

    const categoryIdParsed = parseUuidParam(searchParams.get('category_id'), 'category_id');
    if (!categoryIdParsed.ok) return categoryIdParsed.response;
    const accountIdParsed = parseUuidParam(searchParams.get('account_id'), 'account_id');
    if (!accountIdParsed.ok) return accountIdParsed.response;
    const vendorIdParsed = parseUuidParam(searchParams.get('vendor_id'), 'vendor_id');
    if (!vendorIdParsed.ok) return vendorIdParsed.response;

    const typeParsed = parseEnumParam(searchParams.get('type'), 'type', TRANSACTION_TYPES);
    if (!typeParsed.ok) return typeParsed.response;

    const amountMinParsed = parseNumberParam(searchParams.get('amount_min'), 'amount_min');
    if (!amountMinParsed.ok) return amountMinParsed.response;
    const amountMaxParsed = parseNumberParam(searchParams.get('amount_max'), 'amount_max');
    if (!amountMaxParsed.ok) return amountMaxParsed.response;

    if (amountMinParsed.value !== null && amountMaxParsed.value !== null && amountMinParsed.value > amountMaxParsed.value) {
        return apiError(400, 'invalid_parameter', 'amount_min cannot be greater than amount_max.');
    }

    const sortParsed = parseEnumParam(searchParams.get('sort'), 'sort', TRANSACTION_SORT_FIELDS);
    if (!sortParsed.ok) return sortParsed.response;
    const orderParsed = parseEnumParam(searchParams.get('order'), 'order', ORDER_FIELDS);
    if (!orderParsed.ok) return orderParsed.response;

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), TRANSACTION_FIELDS);
    if (!fieldsParsed.ok) return fieldsParsed.response;

    const includeParsed = parseInclude(searchParams.get('include'));
    if (includeParsed.error) {
        return apiError(400, 'invalid_parameter', includeParsed.error);
    }
    const includes = includeParsed.value || [];

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

    const selectedFields = fieldsParsed.value || [...TRANSACTION_FIELDS];
    const internalFields = Array.from(new Set(['id', ...selectedFields]));
    const selectClause = buildSelectClause(internalFields, includes);

    const supabase = getAdminClient();
    const { limit, offset } = paginationParsed.value;
    const sortField = sortParsed.value || 'date';
    const sortAscending = (orderParsed.value || 'desc') === 'asc';

    let query = supabase
        .from('transactions')
        .select(selectClause, { count: 'exact' })
        .eq('user_id', auth.userId);

    if (parsedStartDate.value) query = query.gte('date', parsedStartDate.value);
    if (parsedEndDate.value) query = query.lte('date', parsedEndDate.value);
    if (categoryIdParsed.value) query = query.eq('category_id', categoryIdParsed.value);
    if (accountIdParsed.value) query = query.eq('account_id', accountIdParsed.value);
    if (vendorIdParsed.value) query = query.eq('vendor_id', vendorIdParsed.value);
    if (typeParsed.value) query = query.eq('type', typeParsed.value);
    if (descriptionContains) query = query.ilike('description', `%${descriptionContains}%`);
    if (vendorSearch) query = query.ilike('vendor', `%${vendorSearch}%`);
    if (amountMinParsed.value !== null) query = query.gte('amount', amountMinParsed.value);
    if (amountMaxParsed.value !== null) query = query.lte('amount', amountMaxParsed.value);

    const { data, error, count } = await query
        .order(sortField, { ascending: sortAscending, nullsFirst: true })
        .range(offset, offset + limit - 1);

    if (error) {
        return apiError(500, 'query_failed', 'Failed to fetch transactions', error.message);
    }

    let rows = (data || []) as Record<string, any>[];
    if (fieldsParsed.value) {
        rows = rows.map((row) => {
            const output: Record<string, unknown> = {};
            for (const field of fieldsParsed.value || []) output[field] = row[field];
            if (includes.includes('account')) output.account = row.account;
            if (includes.includes('category')) output.category = row.category;
            if (includes.includes('vendor')) output.vendor_details = row.vendor_details;
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
                includes,
                month: month || null,
                start_date: parsedStartDate.value,
                end_date: parsedEndDate.value,
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

    const parsed = createTransactionSchema.safeParse(payload);
    if (!parsed.success) {
        return apiError(400, 'validation_failed', 'Transaction payload is invalid.', parsed.error.flatten());
    }

    const transaction = parsed.data;
    const supabase = getAdminClient();

    let accountId = transaction.account_id || null;
    if (!accountId) {
        const { data: defaultAccount, error: defaultAccountError } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', auth.userId)
            .eq('is_default', true)
            .single();

        if (defaultAccountError || !defaultAccount) {
            const { data: fallbackAccount } = await supabase
                .from('accounts')
                .select('id')
                .eq('user_id', auth.userId)
                .limit(1)
                .single();
            accountId = fallbackAccount?.id || null;
        } else {
            accountId = defaultAccount.id;
        }
    }

    if (!accountId) {
        return apiError(400, 'validation_failed', 'account_id is required and no default account was found.');
    }

    const { data: accountExists, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', accountId)
        .eq('user_id', auth.userId)
        .single();
    if (accountError || !accountExists) {
        return apiError(400, 'validation_failed', 'account_id does not belong to this user.');
    }

    if (transaction.category_id) {
        const { data: categoryExists, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', transaction.category_id)
            .eq('user_id', auth.userId)
            .single();
        if (categoryError || !categoryExists) {
            return apiError(400, 'validation_failed', 'category_id does not belong to this user.');
        }
    }

    if (transaction.vendor_id) {
        const { data: vendorExists, error: vendorError } = await supabase
            .from('vendors')
            .select('id')
            .eq('id', transaction.vendor_id)
            .eq('user_id', auth.userId)
            .single();
        if (vendorError || !vendorExists) {
            return apiError(400, 'validation_failed', 'vendor_id does not belong to this user.');
        }
    }

    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey && idempotencyKey.length > 200) {
        return apiError(400, 'invalid_parameter', 'Idempotency-Key must be 200 characters or fewer.');
    }

    const insertId = idempotencyKey
        ? idempotencyUuid(auth.userId, 'transactions:post', idempotencyKey)
        : undefined;

    if (insertId) {
        const { data: existing } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', insertId)
            .eq('user_id', auth.userId)
            .single();
        if (existing) {
            return apiData(existing, { idempotent_replay: true });
        }
    }

    const vendor = (transaction.vendor || transaction.description || 'API Transaction').trim();
    const insertPayload: Record<string, unknown> = {
        ...(insertId ? { id: insertId } : {}),
        user_id: auth.userId,
        account_id: accountId,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description || null,
        vendor,
        vendor_id: transaction.vendor_id || null,
        type: transaction.type,
        category_id: transaction.type === 'payment' ? transaction.category_id : transaction.category_id || null,
        created_at: new Date().toISOString(),
    };

    if (dryRun) {
        return apiData(
            {
                valid: true,
                transaction: insertPayload,
            },
            { dry_run: true }
        );
    }

    const { data, error } = await supabase
        .from('transactions')
        .insert(insertPayload)
        .select('*')
        .single();

    if (error) {
        return apiError(400, 'insert_failed', 'Failed to create transaction.', error.message);
    }

    return apiData(data, { created: true });
}
