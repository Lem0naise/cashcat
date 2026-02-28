import { getAdminClient, verifyApiKey } from '@/lib/auth-api';
import { NextRequest } from 'next/server';
import {
    apiData,
    apiError,
    DATE_REGEX,
    listMeta,
    parseDateParam,
    parseEnumParam,
    parseFieldsParam,
    parseNumberParam,
    parsePagination,
    parseUuidParam,
} from '../../_helpers';

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const BATCH_SIZE = 1000;
const SORT_FIELDS = new Set(['budget_left', 'spent', 'assigned']);
const SORT_ORDERS = new Set(['asc', 'desc']);
const BUDGET_LEFT_FIELDS = [
    'category_id',
    'category_name',
    'group',
    'goal',
    'goal_type',
    'month',
    'assigned',
    'rollover',
    'spent',
    'budget_left',
] as const;

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

function parseBooleanParam(
    value: string | null,
    paramName: string,
    defaultValue: boolean
): { value?: boolean; error?: string } {
    if (value === null) return { value: defaultValue };
    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === '1') return { value: true };
    if (normalized === 'false' || normalized === '0') return { value: false };
    return { error: `Invalid ${paramName}. Use true/false` };
}

function calculateRolloverForCategory(
    categoryId: string,
    targetMonth: string,
    allAssignments: Array<{ category_id: string; month: string; assigned: number | null }>,
    allTransactionsData: Array<{ category_id: string | null; date: string; amount: number; type: string }>
): number {
    if (!categoryId) return 0;

    const categoryAssignments = allAssignments.filter((assignment) => assignment.category_id === categoryId);

    const earliestAssignmentMonth = categoryAssignments.length > 0
        ? categoryAssignments.reduce((earliest, assignment) => assignment.month < earliest ? assignment.month : earliest, categoryAssignments[0].month)
        : null;

    const startMonth = earliestAssignmentMonth;

    if (!startMonth || startMonth >= targetMonth) return 0;

    let currentDate = new Date(startMonth + '-01');
    currentDate.setDate(1);

    let rollover = 0;

    while (true) {
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthStr >= targetMonth) break;

        const assignment = allAssignments.find((a) => a.category_id === categoryId && a.month === monthStr);
        const assigned = assignment?.assigned || 0;

        const monthStart = monthStr + '-01';
        const nextMonthDate = new Date(monthStart);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const monthEnd = new Date(nextMonthDate.getTime() - 1).toISOString().split('T')[0];

        const monthSpent = allTransactionsData
            .filter((transaction) =>
                transaction.category_id === categoryId &&
                transaction.date >= monthStart &&
                transaction.date <= monthEnd &&
                transaction.type === 'payment'
            )
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

        rollover = rollover + assigned - monthSpent;

        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
    }

    return rollover;
}

async function fetchAllPaymentsUpToMonthEnd(supabase: ReturnType<typeof getAdminClient>, userId: string, endDate: string) {
    let from = 0;
    let hasMore = true;
    const allRows: Array<{ category_id: string | null; date: string; amount: number; type: string }> = [];

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

        if (error) {
            return { data: null, error };
        }

        const batch = (data || []).map((row) => ({
            category_id: row.category_id,
            date: row.date,
            amount: row.amount,
            type: row.type,
        }));

        allRows.push(...batch);
        hasMore = batch.length === BATCH_SIZE;
        from += BATCH_SIZE;
    }

    return { data: allRows, error: null };
}

export async function GET(request: NextRequest) {
    const auth = await verifyApiKey(request);

    if (!auth.isValid) {
        return apiError(401, 'unauthorized', auth.error);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || getCurrentMonth();
    const asOfDateRaw = searchParams.get('as_of_date');
    const categoryId = searchParams.get('category_id');
    const groupId = searchParams.get('group_id');
    const goalType = searchParams.get('goal_type');
    const onlyOverspentRaw = searchParams.get('only_overspent');
    const includeZeroRaw = searchParams.get('include_zero');
    const minBudgetLeftRaw = searchParams.get('min_budget_left');
    const maxBudgetLeftRaw = searchParams.get('max_budget_left');
    const sort = searchParams.get('sort');
    const order = (searchParams.get('order') || 'asc').toLowerCase();

    if (!MONTH_REGEX.test(month)) {
        return apiError(400, 'invalid_parameter', 'Invalid month format. Use YYYY-MM');
    }

    const categoryIdParsed = parseUuidParam(categoryId, 'category_id');
    if (!categoryIdParsed.ok) return categoryIdParsed.response;
    const groupIdParsed = parseUuidParam(groupId, 'group_id');
    if (!groupIdParsed.ok) return groupIdParsed.response;
    const goalTypeParsed = parseEnumParam(goalType, 'goal_type', ['spending', 'savings', 'emergency_fund'] as const);
    if (!goalTypeParsed.ok) return goalTypeParsed.response;

    const onlyOverspentParsed = parseBooleanParam(onlyOverspentRaw, 'only_overspent', false);
    if (onlyOverspentParsed.error) {
        return apiError(400, 'invalid_parameter', onlyOverspentParsed.error);
    }

    const includeZeroParsed = parseBooleanParam(includeZeroRaw, 'include_zero', true);
    if (includeZeroParsed.error) {
        return apiError(400, 'invalid_parameter', includeZeroParsed.error);
    }

    const minBudgetLeftParsed = parseNumberParam(minBudgetLeftRaw, 'min_budget_left');
    if (!minBudgetLeftParsed.ok) return minBudgetLeftParsed.response;
    const minBudgetLeft = minBudgetLeftParsed.value;

    const maxBudgetLeftParsed = parseNumberParam(maxBudgetLeftRaw, 'max_budget_left');
    if (!maxBudgetLeftParsed.ok) return maxBudgetLeftParsed.response;
    const maxBudgetLeft = maxBudgetLeftParsed.value;

    if (minBudgetLeft !== null && maxBudgetLeft !== null && minBudgetLeft > maxBudgetLeft) {
        return apiError(400, 'invalid_parameter', 'min_budget_left cannot be greater than max_budget_left');
    }

    if (sort && !SORT_FIELDS.has(sort)) {
        return apiError(400, 'invalid_parameter', "Invalid sort field. Use 'budget_left', 'spent', or 'assigned'");
    }

    if (!SORT_ORDERS.has(order)) {
        return apiError(400, 'invalid_parameter', "Invalid order. Use 'asc' or 'desc'");
    }

    const fieldsParsed = parseFieldsParam(searchParams.get('fields'), BUDGET_LEFT_FIELDS);
    if (!fieldsParsed.ok) return fieldsParsed.response;

    const paginationParsed = parsePagination({
        limitRaw: searchParams.get('limit'),
        offsetRaw: searchParams.get('offset'),
        cursorRaw: searchParams.get('cursor'),
        defaultLimit: 100,
        maxLimit: 1000,
    });
    if (!paginationParsed.ok) return paginationParsed.response;

    const { startDate, endDate } = getMonthBounds(month);
    const asOfDateParsed = parseDateParam(asOfDateRaw, 'as_of_date');
    if (!asOfDateParsed.ok) return asOfDateParsed.response;
    const asOfDate = asOfDateParsed.value || endDate;
    if (asOfDate && !DATE_REGEX.test(asOfDate)) {
        return apiError(400, 'invalid_parameter', 'Invalid as_of_date format. Use YYYY-MM-DD.');
    }
    if (asOfDate < startDate || asOfDate > endDate) {
        return apiError(400, 'invalid_parameter', 'as_of_date must be within the selected month.');
    }

    const supabase = getAdminClient();

    let categoriesQuery = supabase
        .from('categories')
        .select('id, name, goal, goal_type, group, groups(name)')
        .eq('user_id', auth.userId)
        .order('name');

    if (categoryIdParsed.value) categoriesQuery = categoriesQuery.eq('id', categoryIdParsed.value);
    if (groupIdParsed.value) categoriesQuery = categoriesQuery.eq('group', groupIdParsed.value);
    if (goalTypeParsed.value) categoriesQuery = categoriesQuery.eq('goal_type', goalTypeParsed.value);

    const { data: categories, error: categoriesError } = await categoriesQuery;

    if (categoriesError) {
        return apiError(500, 'query_failed', 'Failed to fetch categories', categoriesError.message);
    }

    if (!categories || categories.length === 0) {
        const { limit, offset } = paginationParsed.value;
        return apiData(
            [],
            listMeta({
                total: 0,
                returned: 0,
                limit,
                offset,
                extra: {
                    month,
                    start_date: startDate,
                    end_date: endDate,
                    as_of_date: asOfDate,
                },
            })
        );
    }

    const categoryIds = categories.map((category) => category.id);

    const [assignmentsResult, paymentsResult] = await Promise.all([
        supabase
            .from('assignments')
            .select('category_id, month, assigned')
            .eq('user_id', auth.userId)
            .in('category_id', categoryIds)
            .lte('month', month),
        fetchAllPaymentsUpToMonthEnd(supabase, auth.userId, endDate),
    ]);

    if (assignmentsResult.error) {
        return apiError(500, 'query_failed', 'Failed to fetch assignments for budget-left calculation', assignmentsResult.error.message);
    }

    if (paymentsResult.error) {
        return apiError(500, 'query_failed', 'Failed to fetch transactions for budget-left calculation', paymentsResult.error.message);
    }

    const allAssignments = assignmentsResult.data || [];
    const allTransactionsData = (paymentsResult.data || []).filter((transaction) =>
        !transaction.category_id || categoryIds.includes(transaction.category_id)
    );

    const assignmentsData = allAssignments.filter((assignment) => assignment.month === month);
    const transactionsData = allTransactionsData.filter((transaction) => transaction.date >= startDate && transaction.date <= asOfDate);

    const spentByCategory: Record<string, number> = {};
    transactionsData.forEach((transaction) => {
        const key = String(transaction.category_id);
        if (!spentByCategory[key]) {
            spentByCategory[key] = 0;
        }
        if (transaction.type === 'payment') {
            spentByCategory[key] += Math.abs(transaction.amount);
        }
    });

    const assignmentsByCategory = assignmentsData.reduce((acc, assignment) => {
        acc[assignment.category_id] = assignment;
        return acc;
    }, {} as Record<string, (typeof assignmentsData)[number]>);

    let data: Record<string, any>[] = categories.map((category) => {
        const groupsValue = category.groups as { name?: string }[] | { name?: string } | null | undefined;
        const groupName = Array.isArray(groupsValue)
            ? groupsValue[0]?.name
            : groupsValue?.name;
        const assignment = assignmentsByCategory[category.id];
        const assigned = roundCurrency(Number(assignment?.assigned ?? 0));
        const spent = roundCurrency(Number(spentByCategory[category.id] || 0));
        const rollover = roundCurrency(Number(calculateRolloverForCategory(category.id, month, allAssignments, allTransactionsData)));
        const budgetLeft = roundCurrency(assigned + rollover - spent);

        return {
            category_id: category.id,
            category_name: category.name,
            group: groupName || category.group || 'Uncategorized',
            goal: category.goal,
            goal_type: category.goal_type,
            month,
            assigned,
            rollover,
            spent,
            budget_left: budgetLeft,
        };
    });

    if (!includeZeroParsed.value) {
        data = data.filter((row) => !(row.assigned === 0 && row.spent === 0 && row.rollover === 0));
    }

    if (onlyOverspentParsed.value) {
        data = data.filter((row) => row.budget_left < 0);
    }

    if (minBudgetLeft !== null) {
        data = data.filter((row) => row.budget_left >= minBudgetLeft);
    }

    if (maxBudgetLeft !== null) {
        data = data.filter((row) => row.budget_left <= maxBudgetLeft);
    }

    if (sort) {
        data.sort((a, b) => {
            const aValue = a[sort as 'budget_left' | 'spent' | 'assigned'];
            const bValue = b[sort as 'budget_left' | 'spent' | 'assigned'];
            if (aValue === bValue) return 0;
            return order === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }

    const total = data.length;
    if (fieldsParsed.value) {
        data = data.map((row: Record<string, any>) => {
            const output: Record<string, unknown> = {};
            for (const field of fieldsParsed.value || []) output[field] = row[field];
            return output;
        });
    }

    const { limit, offset } = paginationParsed.value;
    const paginatedData = data.slice(offset, offset + limit);

    return apiData(
        paginatedData,
        listMeta({
            total,
            returned: paginatedData.length,
            limit,
            offset,
            extra: {
                month,
                start_date: startDate,
                end_date: endDate,
                as_of_date: asOfDate,
                sort: sort || null,
                order,
            },
        })
    );
}
