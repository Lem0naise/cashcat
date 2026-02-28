import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest } from 'next/server';
import {
    apiData,
    apiError,
    listMeta,
    parseBooleanParam,
    parseEnumParam,
    parseFieldsParam,
    parseMonthParam,
    parsePagination,
    parseUuidParam,
} from '../_helpers';

const ASSIGNMENT_FIELDS = ['id', 'category_id', 'month', 'assigned', 'rollover', 'created_at'] as const;
const ASSIGNMENT_SORT_FIELDS = ['month', 'assigned', 'created_at'] as const;
const ORDER_FIELDS = ['asc', 'desc'] as const;
const GOAL_TYPES = ['spending', 'savings', 'emergency_fund'] as const;
const SUMMARY_FIELDS = ['month', 'category', 'group'] as const;

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const monthParsed = parseMonthParam(searchParams.get('month'), 'month');
    if (!monthParsed.ok) return monthParsed.response;
    const fromMonthParsed = parseMonthParam(searchParams.get('from_month'), 'from_month');
    if (!fromMonthParsed.ok) return fromMonthParsed.response;
    const toMonthParsed = parseMonthParam(searchParams.get('to_month'), 'to_month');
    if (!toMonthParsed.ok) return toMonthParsed.response;

    const categoryIdParsed = parseUuidParam(searchParams.get('category_id'), 'category_id');
    if (!categoryIdParsed.ok) return categoryIdParsed.response;
    const groupIdParsed = parseUuidParam(searchParams.get('group_id'), 'group_id');
    if (!groupIdParsed.ok) return groupIdParsed.response;
    const goalTypeParsed = parseEnumParam(searchParams.get('goal_type'), 'goal_type', GOAL_TYPES);
    if (!goalTypeParsed.ok) return goalTypeParsed.response;

    const includeUnassignedParsed = parseBooleanParam(searchParams.get('include_unassigned'), 'include_unassigned', false);
    if (!includeUnassignedParsed.ok) return includeUnassignedParsed.response;
    const summaryParsed = parseEnumParam(searchParams.get('summary'), 'summary', SUMMARY_FIELDS);
    if (!summaryParsed.ok) return summaryParsed.response;

    const sortParsed = parseEnumParam(searchParams.get('sort'), 'sort', ASSIGNMENT_SORT_FIELDS);
    if (!sortParsed.ok) return sortParsed.response;
    const orderParsed = parseEnumParam(searchParams.get('order'), 'order', ORDER_FIELDS);
    if (!orderParsed.ok) return orderParsed.response;

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), ASSIGNMENT_FIELDS);
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
    const month = monthParsed.value;
    const fromMonth = fromMonthParsed.value;
    const toMonth = toMonthParsed.value;
    const includeUnassigned = includeUnassignedParsed.value;

    if (month && (fromMonth || toMonth)) {
        return apiError(400, 'invalid_parameter', "Use either 'month' or 'from_month/to_month', not both.");
    }

    if (fromMonth && toMonth && fromMonth > toMonth) {
        return apiError(400, 'invalid_parameter', 'from_month cannot be after to_month.');
    }

    if (includeUnassigned && !month) {
        return apiError(400, 'invalid_parameter', "include_unassigned=true requires a single 'month' parameter.");
    }
    if (includeUnassigned && summaryParsed.value) {
        return apiError(400, 'invalid_parameter', 'summary cannot be combined with include_unassigned=true.');
    }

    let categoryIds: string[] | null = null;
    const shouldFilterCategories =
        !!categoryIdParsed.value ||
        !!groupIdParsed.value ||
        !!goalTypeParsed.value ||
        includeUnassigned;

    if (shouldFilterCategories) {
        let categoryQuery = supabase
            .from('categories')
            .select('id')
            .eq('user_id', auth.userId);

        if (categoryIdParsed.value) categoryQuery = categoryQuery.eq('id', categoryIdParsed.value);
        if (groupIdParsed.value) categoryQuery = categoryQuery.eq('group', groupIdParsed.value);
        if (goalTypeParsed.value) categoryQuery = categoryQuery.eq('goal_type', goalTypeParsed.value);

        const { data: categoryRows, error: categoryError } = await categoryQuery;
        if (categoryError) {
            return apiError(500, 'query_failed', 'Failed to fetch categories for assignment filtering', categoryError.message);
        }

        categoryIds = (categoryRows || []).map((row) => row.id);
        if (categoryIds.length === 0) {
            const { limit, offset } = paginationParsed.value;
            return apiData(
                [],
                listMeta({
                    total: 0,
                    returned: 0,
                    limit,
                    offset,
                    extra: { month, from_month: fromMonth, to_month: toMonth, include_unassigned: includeUnassigned },
                })
            );
        }
    }

    const selectedFields = fieldsParsed.value || [...ASSIGNMENT_FIELDS];
    const internalSelect = Array.from(new Set(['category_id', 'month', ...selectedFields])).join(',');

    let query = supabase
        .from('assignments')
        .select(internalSelect, { count: 'exact' })
        .eq('user_id', auth.userId);

    if (month) {
        query = query.eq('month', month);
    } else {
        if (fromMonth) query = query.gte('month', fromMonth);
        if (toMonth) query = query.lte('month', toMonth);
    }

    if (categoryIds) query = query.in('category_id', categoryIds);

    const { limit, offset } = paginationParsed.value;
    const sortField = sortParsed.value || 'month';
    const sortAscending = (orderParsed.value || 'asc') === 'asc';

    const summary = summaryParsed.value;
    let queryExecution = query.order(sortField, { ascending: sortAscending, nullsFirst: true });
    if (!summary) {
        queryExecution = queryExecution.range(offset, offset + limit - 1);
    }
    const { data, error, count } = await queryExecution;

    if (error) {
        return apiError(500, 'query_failed', 'Failed to fetch assignments', error.message);
    }

    let rows = (data || []) as Record<string, any>[];

    if (includeUnassigned && month && categoryIds) {
        const existingByCategory = new Map<string, Record<string, any>>();
        for (const row of rows) {
            existingByCategory.set(String(row.category_id), row);
        }

        rows = categoryIds.map((id) => {
            const existing = existingByCategory.get(id);
            if (existing) {
                return { ...existing, is_assigned: true };
            }
            return {
                id: null,
                category_id: id,
                month,
                assigned: 0,
                rollover: 0,
                created_at: null,
                is_assigned: false,
            };
        });

        rows.sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];
            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return sortAscending ? -1 : 1;
            if (bValue === null || bValue === undefined) return sortAscending ? 1 : -1;
            return sortAscending ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
        });

        const paginatedRows = rows.slice(offset, offset + limit);

        return apiData(
            paginatedRows,
            listMeta({
                total: rows.length,
                returned: paginatedRows.length,
                limit,
                offset,
                extra: {
                    month,
                    include_unassigned: true,
                    sort: sortField,
                    order: sortAscending ? 'asc' : 'desc',
                },
            })
        );
    }

    if (summary) {
        let summaryRows: Record<string, any>[] = [];

        if (summary === 'month') {
            const byMonth = new Map<string, { total_assigned: number; total_rollover: number; row_count: number }>();
            for (const row of rows) {
                const monthKey = String(row.month);
                const current = byMonth.get(monthKey) || { total_assigned: 0, total_rollover: 0, row_count: 0 };
                current.total_assigned += Number(row.assigned || 0);
                current.total_rollover += Number(row.rollover || 0);
                current.row_count += 1;
                byMonth.set(monthKey, current);
            }
            summaryRows = Array.from(byMonth.entries()).map(([monthKey, value]) => ({
                month: monthKey,
                total_assigned: value.total_assigned,
                total_rollover: value.total_rollover,
                row_count: value.row_count,
            }));
            summaryRows.sort((a, b) => a.month.localeCompare(b.month));
        }

        if (summary === 'category') {
            const byCategory = new Map<string, { total_assigned: number; total_rollover: number; row_count: number }>();
            for (const row of rows) {
                const categoryKey = String(row.category_id);
                const current = byCategory.get(categoryKey) || { total_assigned: 0, total_rollover: 0, row_count: 0 };
                current.total_assigned += Number(row.assigned || 0);
                current.total_rollover += Number(row.rollover || 0);
                current.row_count += 1;
                byCategory.set(categoryKey, current);
            }
            summaryRows = Array.from(byCategory.entries()).map(([categoryKey, value]) => ({
                category_id: categoryKey,
                total_assigned: value.total_assigned,
                total_rollover: value.total_rollover,
                row_count: value.row_count,
            }));
            summaryRows.sort((a, b) => a.category_id.localeCompare(b.category_id));
        }

        if (summary === 'group') {
            const categoryIdsForSummary = Array.from(new Set(rows.map((row) => String(row.category_id))));
            const { data: categoryRows, error: categoryError } = await supabase
                .from('categories')
                .select('id, group')
                .eq('user_id', auth.userId)
                .in('id', categoryIdsForSummary);
            if (categoryError) {
                return apiError(500, 'query_failed', 'Failed to fetch categories for group summary', categoryError.message);
            }

            const categoryToGroup = new Map<string, string>();
            for (const categoryRow of categoryRows || []) {
                categoryToGroup.set(categoryRow.id, categoryRow.group);
            }

            const byGroup = new Map<string, { total_assigned: number; total_rollover: number; row_count: number }>();
            for (const row of rows) {
                const groupKey = categoryToGroup.get(String(row.category_id)) || 'unknown';
                const current = byGroup.get(groupKey) || { total_assigned: 0, total_rollover: 0, row_count: 0 };
                current.total_assigned += Number(row.assigned || 0);
                current.total_rollover += Number(row.rollover || 0);
                current.row_count += 1;
                byGroup.set(groupKey, current);
            }

            summaryRows = Array.from(byGroup.entries()).map(([groupKey, value]) => ({
                group_id: groupKey,
                total_assigned: value.total_assigned,
                total_rollover: value.total_rollover,
                row_count: value.row_count,
            }));
            summaryRows.sort((a, b) => a.group_id.localeCompare(b.group_id));
        }

        const paginatedRows = summaryRows.slice(offset, offset + limit);
        return apiData(
            paginatedRows,
            listMeta({
                total: summaryRows.length,
                returned: paginatedRows.length,
                limit,
                offset,
                extra: {
                    month,
                    from_month: fromMonth,
                    to_month: toMonth,
                    summary,
                },
            })
        );
    }

    return apiData(
        rows,
        listMeta({
            total: count || 0,
            returned: rows.length,
            limit,
            offset,
            extra: {
                month,
                from_month: fromMonth,
                to_month: toMonth,
                include_unassigned: false,
                sort: sortField,
                order: sortAscending ? 'asc' : 'desc',
            },
        })
    );
}
