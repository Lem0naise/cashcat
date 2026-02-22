import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest, NextResponse } from 'next/server';
import {
    apiData,
    apiError,
    DATE_REGEX,
    listMeta,
    parseBooleanParam,
    parseEnumParam,
    parseFieldsParam,
    parsePagination,
    parseUuidListParam,
} from '../_helpers';

const ACCOUNT_FIELDS = ['id', 'name', 'type', 'is_default', 'is_active', 'created_at'] as const;
const ACCOUNT_SORT_FIELDS = ['name', 'created_at', 'type'] as const;
const ACCOUNT_ORDER_FIELDS = ['asc', 'desc'] as const;

function formatTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const q = searchParams.get('q');
    const asOfDateRaw = searchParams.get('as_of_date');

    const isActiveParsed = parseBooleanParam(searchParams.get('is_active'), 'is_active', true);
    if (!isActiveParsed.ok) return isActiveParsed.response;

    const isDefaultParsed = parseBooleanParam(searchParams.get('is_default'), 'is_default', false);
    if (!isDefaultParsed.ok) return isDefaultParsed.response;

    const includeBalanceParsed = parseBooleanParam(searchParams.get('include_balance'), 'include_balance', false);
    if (!includeBalanceParsed.ok) return includeBalanceParsed.response;

    const idsParsed = parseUuidListParam(searchParams.get('ids'), 'ids');
    if (!idsParsed.ok) return idsParsed.response;

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), ACCOUNT_FIELDS);
    if (!fieldsParsed.ok) return fieldsParsed.response;

    const sortParsed = parseEnumParam(searchParams.get('sort'), 'sort', ACCOUNT_SORT_FIELDS);
    if (!sortParsed.ok) return sortParsed.response;
    const orderParsed = parseEnumParam(searchParams.get('order'), 'order', ACCOUNT_ORDER_FIELDS);
    if (!orderParsed.ok) return orderParsed.response;

    const paginationParsed = parsePagination({
        limitRaw: searchParams.get('limit'),
        offsetRaw: searchParams.get('offset'),
        cursorRaw: searchParams.get('cursor'),
        defaultLimit: 100,
        maxLimit: 1000,
    });
    if (!paginationParsed.ok) return paginationParsed.response;

    const includeBalance = includeBalanceParsed.value;
    const asOfDate = includeBalance ? (asOfDateRaw || formatTodayDate()) : null;
    if (asOfDate && !DATE_REGEX.test(asOfDate)) {
        return apiError(400, 'invalid_parameter', 'Invalid as_of_date format. Use YYYY-MM-DD.');
    }

    const supabase = getAdminClient();
    const selectedFields = fieldsParsed.value || [...ACCOUNT_FIELDS];
    const internalSelect = Array.from(new Set(['id', ...selectedFields])).join(',');

    let query = supabase
        .from('accounts')
        .select(internalSelect, { count: 'exact' })
        .eq('user_id', auth.userId);

    if (type) query = query.eq('type', type);
    if (q) query = query.ilike('name', `%${q}%`);
    if (idsParsed.value) query = query.in('id', idsParsed.value);
    if (searchParams.has('is_active')) query = query.eq('is_active', isActiveParsed.value);
    if (searchParams.has('is_default')) query = query.eq('is_default', isDefaultParsed.value);

    const sortField = sortParsed.value || 'name';
    const sortAscending = (orderParsed.value || 'asc') === 'asc';

    const { limit, offset } = paginationParsed.value;

    const { data, error, count } = await query
        .order(sortField, { ascending: sortAscending, nullsFirst: true })
        .range(offset, offset + limit - 1);

    if (error) {
        return apiError(500, 'query_failed', 'Failed to fetch accounts', error.message);
    }

    let rows = (data || []) as Record<string, any>[];

    if (includeBalance && rows.length > 0 && asOfDate) {
        const accountIds = rows.map((row) => row.id);

        const [txResult, transferResult] = await Promise.all([
            supabase
                .from('transactions')
                .select('account_id, amount')
                .eq('user_id', auth.userId)
                .in('account_id', accountIds)
                .lte('date', asOfDate),
            supabase
                .from('transfers')
                .select('from_account_id, to_account_id, amount')
                .eq('user_id', auth.userId)
                .lte('date', asOfDate),
        ]);

        if (txResult.error) {
            return apiError(500, 'query_failed', 'Failed to calculate account balances from transactions', txResult.error.message);
        }

        if (transferResult.error) {
            return apiError(500, 'query_failed', 'Failed to calculate account balances from transfers', transferResult.error.message);
        }

        const balances = new Map<string, number>();
        for (const accountId of accountIds) balances.set(accountId, 0);

        for (const tx of txResult.data || []) {
            if (!tx.account_id) continue;
            if (!balances.has(tx.account_id)) continue;
            balances.set(tx.account_id, (balances.get(tx.account_id) || 0) + Number(tx.amount || 0));
        }

        for (const transfer of transferResult.data || []) {
            const amount = Number(transfer.amount || 0);
            if (balances.has(transfer.from_account_id)) {
                balances.set(transfer.from_account_id, (balances.get(transfer.from_account_id) || 0) - amount);
            }
            if (balances.has(transfer.to_account_id)) {
                balances.set(transfer.to_account_id, (balances.get(transfer.to_account_id) || 0) + amount);
            }
        }

        rows = rows.map((row) => ({
            ...row,
            balance: Math.round((balances.get(row.id) || 0) * 100) / 100,
        }));
    }

    // Respect fields projection while still allowing computed balance when requested.
    if (fieldsParsed.value) {
        const requested = new Set(fieldsParsed.value);
        rows = rows.map((row) => {
            const output: Record<string, unknown> = {};
            for (const field of requested) output[field] = row[field];
            if (includeBalance) output.balance = row.balance ?? 0;
            return output;
        });
    }

    const total = count || 0;
    return apiData(
        rows,
        listMeta({
            total,
            returned: rows.length,
            limit,
            offset,
            extra: {
                sort: sortField,
                order: sortAscending ? 'asc' : 'desc',
                include_balance: includeBalance,
                as_of_date: asOfDate,
            },
        })
    );
}
