import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest } from 'next/server';
import {
    apiData,
    apiError,
    listMeta,
    parseBooleanParam,
    parseEnumParam,
    parseFieldsParam,
    parsePagination,
    parseUuidListParam,
    parseUuidParam,
} from '../_helpers';

const CATEGORY_FIELDS = [
    'id',
    'name',
    'group',
    'goal',
    'goal_type',
    'rollover_enabled',
    'timeframe',
    'created_at',
    'group_name',
] as const;
const CATEGORY_SORT_FIELDS = ['name', 'goal', 'created_at', 'goal_type'] as const;
const ORDER_FIELDS = ['asc', 'desc'] as const;
const GOAL_TYPES = ['spending', 'savings', 'emergency_fund'] as const;

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    const groupIdParsed = parseUuidParam(searchParams.get('group_id'), 'group_id');
    if (!groupIdParsed.ok) return groupIdParsed.response;
    const idsParsed = parseUuidListParam(searchParams.get('ids'), 'ids');
    if (!idsParsed.ok) return idsParsed.response;
    const goalTypeParsed = parseEnumParam(searchParams.get('goal_type'), 'goal_type', GOAL_TYPES);
    if (!goalTypeParsed.ok) return goalTypeParsed.response;

    const rolloverEnabledParsed = parseBooleanParam(searchParams.get('rollover_enabled'), 'rollover_enabled', false);
    if (!rolloverEnabledParsed.ok) return rolloverEnabledParsed.response;
    const hasGoalParsed = parseBooleanParam(searchParams.get('has_goal'), 'has_goal', true);
    if (!hasGoalParsed.ok) return hasGoalParsed.response;
    const includeGroupParsed = parseBooleanParam(searchParams.get('include_group'), 'include_group', false);
    if (!includeGroupParsed.ok) return includeGroupParsed.response;

    const sortParsed = parseEnumParam(searchParams.get('sort'), 'sort', CATEGORY_SORT_FIELDS);
    if (!sortParsed.ok) return sortParsed.response;
    const orderParsed = parseEnumParam(searchParams.get('order'), 'order', ORDER_FIELDS);
    if (!orderParsed.ok) return orderParsed.response;

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), CATEGORY_FIELDS);
    if (!fieldsParsed.ok) return fieldsParsed.response;

    const paginationParsed = parsePagination({
        limitRaw: searchParams.get('limit'),
        offsetRaw: searchParams.get('offset'),
        cursorRaw: searchParams.get('cursor'),
        defaultLimit: 100,
        maxLimit: 1000,
    });
    if (!paginationParsed.ok) return paginationParsed.response;

    const supabase = getAdminClient();
    const includeGroup = includeGroupParsed.value || (fieldsParsed.value || []).includes('group_name');

    const rawRequestedFields = fieldsParsed.value || [...CATEGORY_FIELDS];
    const selectedFields = rawRequestedFields.filter((field) => field !== 'group_name');
    const internalSelect = Array.from(new Set(['id', ...selectedFields])).join(',');
    const selectClause = includeGroup ? `${internalSelect},groups(name)` : internalSelect;

    let query = supabase
        .from('categories')
        .select(selectClause, { count: 'exact' })
        .eq('user_id', auth.userId);

    if (groupIdParsed.value) query = query.eq('group', groupIdParsed.value);
    if (idsParsed.value) query = query.in('id', idsParsed.value);
    if (goalTypeParsed.value) query = query.eq('goal_type', goalTypeParsed.value);
    if (q) query = query.ilike('name', `%${q}%`);
    if (searchParams.has('rollover_enabled')) query = query.eq('rollover_enabled', rolloverEnabledParsed.value);

    if (searchParams.has('has_goal')) {
        if (hasGoalParsed.value) {
            query = query.not('goal', 'is', null).gt('goal', 0);
        } else {
            query = query.or('goal.is.null,goal.lte.0');
        }
    }

    const sortField = sortParsed.value || 'name';
    const sortAscending = (orderParsed.value || 'asc') === 'asc';
    const { limit, offset } = paginationParsed.value;

    const { data, error, count } = await query
        .order(sortField, { ascending: sortAscending, nullsFirst: true })
        .range(offset, offset + limit - 1);

    if (error) {
        return apiError(500, 'query_failed', 'Failed to fetch categories', error.message);
    }

    const rows = (data || []).map((row: any) => {
        if (!includeGroup) return row;
        const groupsValue = row.groups as { name?: string }[] | { name?: string } | null | undefined;
        const groupName = Array.isArray(groupsValue) ? groupsValue[0]?.name : groupsValue?.name;
        const output = { ...row, group_name: groupName || null };
        delete (output as any).groups;
        return output;
    });

    const projectedRows = fieldsParsed.value
        ? rows.map((row: Record<string, any>) => {
            const output: Record<string, unknown> = {};
            for (const field of fieldsParsed.value || []) output[field] = row[field];
            return output;
        })
        : rows;

    return apiData(
        projectedRows,
        listMeta({
            total: count || 0,
            returned: projectedRows.length,
            limit,
            offset,
            extra: {
                sort: sortField,
                order: sortAscending ? 'asc' : 'desc',
                include_group: includeGroup,
            },
        })
    );
}
