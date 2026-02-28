import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest } from 'next/server';
import {
    apiData,
    apiError,
    listMeta,
    MONTH_REGEX,
    parseBooleanParam,
    parseFieldsParam,
    parseMonthParam,
    parsePagination,
    parseUuidListParam,
} from '../_helpers';

const GROUP_FIELDS = [
    'id',
    'name',
    'created_at',
    'category_count',
    'month',
    'month_assigned',
    'month_spent',
    'month_rollover',
    'month_budget_left',
] as const;
const BATCH_SIZE = 1000;

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthBounds(month: string): { startDate: string; endDate: string } {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthNumber = Number(monthStr);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const lastDay = new Date(year, monthNumber, 0);
    const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
    const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return { startDate, endDate };
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

function calculateRolloverForCategory(
    categoryId: string,
    targetMonth: string,
    allAssignments: Array<{ category_id: string; month: string; assigned: number | null }>,
    allPayments: Array<{ category_id: string | null; date: string; amount: number; type: string }>
) {
    const categoryAssignments = allAssignments.filter((assignment) => assignment.category_id === categoryId);
    const earliestAssignmentMonth = categoryAssignments.length > 0
        ? categoryAssignments.reduce((earliest, assignment) => assignment.month < earliest ? assignment.month : earliest, categoryAssignments[0].month)
        : null;
    if (!earliestAssignmentMonth || earliestAssignmentMonth >= targetMonth) return 0;

    let currentDate = new Date(earliestAssignmentMonth + '-01');
    currentDate.setDate(1);
    let rollover = 0;

    while (true) {
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthStr >= targetMonth) break;
        const assignment = allAssignments.find((row) => row.category_id === categoryId && row.month === monthStr);
        const assigned = assignment?.assigned || 0;

        const monthStart = monthStr + '-01';
        const nextMonthDate = new Date(monthStart);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const monthEnd = new Date(nextMonthDate.getTime() - 1).toISOString().split('T')[0];

        const monthSpent = allPayments
            .filter((payment) =>
                payment.category_id === categoryId &&
                payment.type === 'payment' &&
                payment.date >= monthStart &&
                payment.date <= monthEnd
            )
            .reduce((sum, payment) => sum + Math.abs(payment.amount), 0);

        rollover = rollover + assigned - monthSpent;
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
    }

    return rollover;
}

async function fetchAllPaymentsToDate(supabase: ReturnType<typeof getAdminClient>, userId: string, endDate: string) {
    let from = 0;
    let hasMore = true;
    const rows: Array<{ category_id: string | null; date: string; amount: number; type: string }> = [];

    while (hasMore) {
        const { data, error } = await supabase
            .from('transactions')
            .select('category_id, date, amount, type, created_at')
            .eq('user_id', userId)
            .eq('type', 'payment')
            .lte('date', endDate)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, from + BATCH_SIZE - 1);

        if (error) return { data: null, error };

        const batch = (data || []).map((row) => ({
            category_id: row.category_id,
            date: row.date,
            amount: row.amount,
            type: row.type,
        }));
        rows.push(...batch);
        hasMore = batch.length === BATCH_SIZE;
        from += BATCH_SIZE;
    }

    return { data: rows, error: null };
}

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const idsParsed = parseUuidListParam(searchParams.get('ids'), 'ids');
    if (!idsParsed.ok) return idsParsed.response;

    const includeCategoryCountParsed = parseBooleanParam(searchParams.get('include_category_count'), 'include_category_count', false);
    if (!includeCategoryCountParsed.ok) return includeCategoryCountParsed.response;
    const includeBudgetTotalsParsed = parseBooleanParam(searchParams.get('include_budget_totals'), 'include_budget_totals', false);
    if (!includeBudgetTotalsParsed.ok) return includeBudgetTotalsParsed.response;

    const monthParsed = parseMonthParam(searchParams.get('month'), 'month');
    if (!monthParsed.ok) return monthParsed.response;

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), GROUP_FIELDS);
    if (!fieldsParsed.ok) return fieldsParsed.response;

    const paginationParsed = parsePagination({
        limitRaw: searchParams.get('limit'),
        offsetRaw: searchParams.get('offset'),
        cursorRaw: searchParams.get('cursor'),
        defaultLimit: 100,
        maxLimit: 1000,
    });
    if (!paginationParsed.ok) return paginationParsed.response;

    const sort = (searchParams.get('sort') || 'name').toLowerCase();
    const order = (searchParams.get('order') || 'asc').toLowerCase();
    if (!['name', 'created_at'].includes(sort)) {
        return apiError(400, 'invalid_parameter', "Invalid sort field. Use 'name' or 'created_at'.");
    }
    if (!['asc', 'desc'].includes(order)) {
        return apiError(400, 'invalid_parameter', "Invalid order field. Use 'asc' or 'desc'.");
    }

    const includeCategoryCount = includeCategoryCountParsed.value || (fieldsParsed.value || []).includes('category_count');
    const includeBudgetTotals = includeBudgetTotalsParsed.value ||
        (fieldsParsed.value || []).some((field) => field.startsWith('month_') || field === 'month');
    const month = includeBudgetTotals ? (monthParsed.value || getCurrentMonth()) : monthParsed.value;
    if (month && !MONTH_REGEX.test(month)) {
        return apiError(400, 'invalid_parameter', 'Invalid month format. Use YYYY-MM.');
    }

    const supabase = getAdminClient();

    const selectedFields = fieldsParsed.value
        ? fieldsParsed.value.filter((field) => !['category_count', 'month', 'month_assigned', 'month_spent', 'month_rollover', 'month_budget_left'].includes(field))
        : ['id', 'name', 'created_at'];
    const internalSelect = Array.from(new Set(['id', ...selectedFields])).join(',');

    const { limit, offset } = paginationParsed.value;
    let query = supabase
        .from('groups')
        .select(internalSelect, { count: 'exact' })
        .eq('user_id', auth.userId);

    if (idsParsed.value) query = query.in('id', idsParsed.value);
    if (q) query = query.ilike('name', `%${q}%`);

    const { data, error, count } = await query
        .order(sort, { ascending: order === 'asc', nullsFirst: true })
        .range(offset, offset + limit - 1);

    if (error) {
        return apiError(500, 'query_failed', 'Failed to fetch groups', error.message);
    }

    let rows = (data || []) as Record<string, any>[];
    const groupIds = rows.map((row) => row.id);

    if (groupIds.length > 0 && includeCategoryCount) {
        const { data: categoryRows, error: categoryError } = await supabase
            .from('categories')
            .select('id, group')
            .eq('user_id', auth.userId)
            .in('group', groupIds);

        if (categoryError) {
            return apiError(500, 'query_failed', 'Failed to fetch categories for group counts', categoryError.message);
        }

        const counts = new Map<string, number>();
        for (const groupId of groupIds) counts.set(groupId, 0);
        for (const category of categoryRows || []) {
            counts.set(category.group, (counts.get(category.group) || 0) + 1);
        }

        rows = rows.map((row) => ({
            ...row,
            category_count: counts.get(row.id) || 0,
        }));
    }

    if (groupIds.length > 0 && includeBudgetTotals && month) {
        const { startDate, endDate } = getMonthBounds(month);

        const { data: categoryRows, error: categoriesError } = await supabase
            .from('categories')
            .select('id, group')
            .eq('user_id', auth.userId)
            .in('group', groupIds);

        if (categoriesError) {
            return apiError(500, 'query_failed', 'Failed to fetch categories for group totals', categoriesError.message);
        }

        const categoryIds = (categoryRows || []).map((row) => row.id);
        const categoryGroup = new Map<string, string>();
        for (const row of categoryRows || []) {
            categoryGroup.set(row.id, row.group);
        }

        if (categoryIds.length > 0) {
            const [assignmentResult, paymentsResult] = await Promise.all([
                supabase
                    .from('assignments')
                    .select('category_id, month, assigned')
                    .eq('user_id', auth.userId)
                    .in('category_id', categoryIds)
                    .lte('month', month),
                fetchAllPaymentsToDate(supabase, auth.userId, endDate),
            ]);

            if (assignmentResult.error) {
                return apiError(500, 'query_failed', 'Failed to fetch assignments for group totals', assignmentResult.error.message);
            }
            if (paymentsResult.error) {
                return apiError(500, 'query_failed', 'Failed to fetch payments for group totals', paymentsResult.error.message);
            }

            const allAssignments = assignmentResult.data || [];
            const paymentsForCategories = (paymentsResult.data || []).filter((payment) =>
                !payment.category_id || categoryIds.includes(payment.category_id)
            );
            const monthPayments = paymentsForCategories.filter((payment) => payment.date >= startDate && payment.date <= endDate);

            const spentByCategory = new Map<string, number>();
            for (const payment of monthPayments) {
                if (!payment.category_id) continue;
                spentByCategory.set(payment.category_id, (spentByCategory.get(payment.category_id) || 0) + Math.abs(payment.amount));
            }

            const monthAssignmentsByCategory = new Map<string, number>();
            for (const assignment of allAssignments.filter((row) => row.month === month)) {
                monthAssignmentsByCategory.set(assignment.category_id, Number(assignment.assigned || 0));
            }

            const totalsByGroup = new Map<string, { assigned: number; spent: number; rollover: number; budgetLeft: number }>();
            for (const groupId of groupIds) {
                totalsByGroup.set(groupId, { assigned: 0, spent: 0, rollover: 0, budgetLeft: 0 });
            }

            for (const categoryId of categoryIds) {
                const groupId = categoryGroup.get(categoryId);
                if (!groupId) continue;
                const assigned = roundCurrency(monthAssignmentsByCategory.get(categoryId) || 0);
                const spent = roundCurrency(spentByCategory.get(categoryId) || 0);
                const rollover = roundCurrency(calculateRolloverForCategory(categoryId, month, allAssignments, paymentsForCategories));
                const budgetLeft = roundCurrency(assigned + rollover - spent);

                const totals = totalsByGroup.get(groupId)!;
                totals.assigned = roundCurrency(totals.assigned + assigned);
                totals.spent = roundCurrency(totals.spent + spent);
                totals.rollover = roundCurrency(totals.rollover + rollover);
                totals.budgetLeft = roundCurrency(totals.budgetLeft + budgetLeft);
            }

            rows = rows.map((row) => {
                const totals = totalsByGroup.get(row.id) || { assigned: 0, spent: 0, rollover: 0, budgetLeft: 0 };
                return {
                    ...row,
                    month,
                    month_assigned: totals.assigned,
                    month_spent: totals.spent,
                    month_rollover: totals.rollover,
                    month_budget_left: totals.budgetLeft,
                };
            });
        } else {
            rows = rows.map((row) => ({
                ...row,
                month,
                month_assigned: 0,
                month_spent: 0,
                month_rollover: 0,
                month_budget_left: 0,
            }));
        }
    }

    if (fieldsParsed.value) {
        rows = rows.map((row) => {
            const output: Record<string, unknown> = {};
            for (const field of fieldsParsed.value || []) output[field] = row[field];
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
                sort,
                order,
                include_category_count: includeCategoryCount,
                include_budget_totals: includeBudgetTotals,
                month: month || null,
            },
        })
    );
}
