import { verifyApiKey } from '@/lib/auth-api';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

const SERVER_INFO = {
    name: 'cashcat-mcp',
    version: '1.0.0',
};

const ALLOWED_GET_ENDPOINTS = new Set([
    'accounts',
    'assignments',
    'categories',
    'categories/budget-left',
    'groups',
    'transactions',
    'transfers',
]);

type JsonRpcId = string | number | null;

type RpcContext = {
    authHeader: string;
    baseOrigin: string;
};

type ToolHandler = (args: Record<string, unknown>, ctx: RpcContext) => Promise<unknown>;

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function asBoolean(value: unknown, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;
    }
    return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatToolText(payload: unknown) {
    return JSON.stringify(payload, null, 2);
}

function parseToolParams(params: unknown): { name: string; args: Record<string, unknown> } {
    if (!isRecord(params)) throw new Error('Invalid params for tools/call');
    const name = params.name;
    if (typeof name !== 'string' || name.trim() === '') throw new Error('Missing tool name');
    const args = isRecord(params.arguments) ? params.arguments : {};
    return { name, args };
}

function extractAuthHeader(request: NextRequest) {
    const auth = request.headers.get('authorization');
    if (!auth) throw new Error('Missing Authorization header');
    return auth;
}

function buildOrigin(request: NextRequest) {
    const url = new URL(request.url);
    return url.origin;
}

function parseDateArg(value: unknown, paramName: string): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
        throw new Error(`Invalid ${paramName}. Use YYYY-MM-DD.`);
    }
    return value;
}

function parseMonthArg(value: unknown, paramName: string): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || !MONTH_REGEX.test(value)) {
        throw new Error(`Invalid ${paramName}. Use YYYY-MM.`);
    }
    return value;
}

function parseQueryObject(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    const query: Record<string, string> = {};

    for (const [key, raw] of Object.entries(value)) {
        if (raw === undefined || raw === null || raw === '') continue;

        if (Array.isArray(raw)) {
            const list = raw
                .map((entry) => String(entry).trim())
                .filter(Boolean);
            if (list.length > 0) query[key] = list.join(',');
            continue;
        }

        if (typeof raw === 'object') continue;
        query[key] = String(raw);
    }

    return query;
}

function sumNumbers(values: number[]) {
    return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}

async function callV1(
    ctx: RpcContext,
    endpoint: string,
    queryInput: Record<string, unknown> = {}
): Promise<{ data: unknown; meta: Record<string, unknown> | null; raw: Record<string, unknown> }> {
    const url = new URL(`/api/v1/${endpoint}`, ctx.baseOrigin);
    const query = parseQueryObject(queryInput);
    for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: ctx.authHeader,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    });

    let payload: Record<string, unknown> = {};
    try {
        payload = (await response.json()) as Record<string, unknown>;
    } catch {
        throw new Error(`Non-JSON response from ${endpoint} (${response.status})`);
    }

    if (!response.ok) {
        const errorObj = isRecord(payload.error) ? payload.error : null;
        const message = typeof errorObj?.message === 'string'
            ? errorObj.message
            : `Request failed (${response.status})`;
        throw new Error(`${endpoint}: ${message}`);
    }

    return {
        data: payload.data,
        meta: isRecord(payload.meta) ? payload.meta : null,
        raw: payload,
    };
}

async function fetchAllPages(
    ctx: RpcContext,
    endpoint: string,
    baseQuery: Record<string, unknown>,
    maxRows: number
) {
    const rows: unknown[] = [];
    const seenCursors = new Set<string>();
    let nextCursor: string | undefined;
    let truncated = false;
    let lastMeta: Record<string, unknown> | null = null;

    const queryWithoutPaging = { ...baseQuery };
    delete queryWithoutPaging.limit;
    delete queryWithoutPaging.offset;
    delete queryWithoutPaging.cursor;

    while (rows.length < maxRows) {
        const remaining = maxRows - rows.length;
        const limit = Math.min(1000, remaining);
        const pageQuery: Record<string, unknown> = { ...queryWithoutPaging, limit };
        if (nextCursor) pageQuery.cursor = nextCursor;

        const page = await callV1(ctx, endpoint, pageQuery);
        lastMeta = page.meta;

        const pageRows = Array.isArray(page.data) ? page.data : [];
        rows.push(...pageRows);

        const cursorValue = typeof page.meta?.next_cursor === 'string' ? page.meta.next_cursor : null;
        if (!cursorValue || pageRows.length === 0 || seenCursors.has(cursorValue)) {
            break;
        }

        seenCursors.add(cursorValue);
        nextCursor = cursorValue;
    }

    if (rows.length >= maxRows) {
        const metaTotal = Number(lastMeta?.total);
        if (Number.isFinite(metaTotal) && metaTotal > rows.length) {
            truncated = true;
        }
    }

    return {
        data: rows,
        truncated,
        meta: lastMeta,
    };
}

function asObjectArray(value: unknown) {
    return Array.isArray(value) ? value.filter((row) => isRecord(row)) as Record<string, unknown>[] : [];
}

function numberField(row: Record<string, unknown>, key: string) {
    const value = Number(row[key]);
    return Number.isFinite(value) ? value : 0;
}

const tools = [
    {
        name: 'cashcat_get',
        description: 'Read any CashCat REST GET endpoint (accounts, categories, groups, assignments, transactions, transfers, budget-left).',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['endpoint'],
            properties: {
                endpoint: {
                    type: 'string',
                    enum: Array.from(ALLOWED_GET_ENDPOINTS),
                },
                query: {
                    type: 'object',
                    description: 'Query params passed through to the selected endpoint.',
                    additionalProperties: {
                        anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
                    },
                },
                paginate_all: {
                    type: 'boolean',
                    description: 'If true, keeps following cursor pagination until max_rows is reached.',
                    default: false,
                },
                max_rows: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10000,
                    default: 2000,
                },
            },
        },
    },
    {
        name: 'cashcat_financial_overview',
        description: 'Get an advisory-friendly snapshot: net worth, budget health, overspending, and monthly cashflow.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                month: {
                    type: 'string',
                    description: 'Optional month in YYYY-MM.',
                },
                as_of_date: {
                    type: 'string',
                    description: 'Optional as-of date in YYYY-MM-DD.',
                },
                max_rows_for_summaries: {
                    type: 'integer',
                    minimum: 100,
                    maximum: 10000,
                    default: 4000,
                },
                recent_items_limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 200,
                    default: 25,
                },
            },
        },
    },
    {
        name: 'cashcat_full_context',
        description: 'Fetch a broad, structured financial context bundle across all major endpoints for deep analysis/advice.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                month: {
                    type: 'string',
                    description: 'Optional month in YYYY-MM.',
                },
                start_date: {
                    type: 'string',
                    description: 'Optional start date in YYYY-MM-DD for transaction/transfer windows.',
                },
                end_date: {
                    type: 'string',
                    description: 'Optional end date in YYYY-MM-DD for transaction/transfer windows.',
                },
                as_of_date: {
                    type: 'string',
                    description: 'Optional balance as-of date in YYYY-MM-DD.',
                },
                include_accounts: { type: 'boolean', default: true },
                include_categories: { type: 'boolean', default: true },
                include_groups: { type: 'boolean', default: true },
                include_assignments: { type: 'boolean', default: true },
                include_transactions: { type: 'boolean', default: true },
                include_transfers: { type: 'boolean', default: true },
                include_budget_left: { type: 'boolean', default: true },
                max_rows_per_endpoint: {
                    type: 'integer',
                    minimum: 100,
                    maximum: 10000,
                    default: 4000,
                },
            },
        },
    },
];

const toolHandlers: Record<string, ToolHandler> = {
    async cashcat_get(args, ctx) {
        const endpoint = args.endpoint;
        if (typeof endpoint !== 'string' || !ALLOWED_GET_ENDPOINTS.has(endpoint)) {
            throw new Error(`Invalid endpoint. Allowed: ${Array.from(ALLOWED_GET_ENDPOINTS).join(', ')}`);
        }

        const query = parseQueryObject(args.query);
        const paginateAll = asBoolean(args.paginate_all, false);
        const maxRows = clampNumber(args.max_rows, 2000, 1, 10000);

        if (!paginateAll) {
            const onePage = await callV1(ctx, endpoint, query);
            return {
                endpoint,
                paginated: false,
                data: onePage.data,
                meta: onePage.meta,
            };
        }

        const allPages = await fetchAllPages(ctx, endpoint, query, maxRows);
        return {
            endpoint,
            paginated: true,
            max_rows: maxRows,
            returned: allPages.data.length,
            truncated: allPages.truncated,
            data: allPages.data,
            meta: allPages.meta,
        };
    },

    async cashcat_financial_overview(args, ctx) {
        const monthArg = parseMonthArg(args.month, 'month');
        const asOfDate = parseDateArg(args.as_of_date, 'as_of_date');
        const contextMonth = monthArg || (asOfDate ? asOfDate.slice(0, 7) : getCurrentMonth());

        if (asOfDate && asOfDate.slice(0, 7) !== contextMonth) {
            throw new Error('as_of_date must be in the same month as month.');
        }

        const maxRows = clampNumber(args.max_rows_for_summaries, 4000, 100, 10000);
        const recentItemsLimit = clampNumber(args.recent_items_limit, 25, 1, 200);

        const [accountsResult, groupsResult, budgetResult, txResult, transferResult] = await Promise.all([
            callV1(ctx, 'accounts', { include_balance: true, as_of_date: asOfDate }),
            callV1(ctx, 'groups', { include_budget_totals: true, include_category_count: true, month: contextMonth, limit: 1000 }),
            fetchAllPages(ctx, 'categories/budget-left', { month: contextMonth, as_of_date: asOfDate, include_zero: true }, maxRows),
            fetchAllPages(ctx, 'transactions', { month: contextMonth, sort: 'date', order: 'desc' }, maxRows),
            fetchAllPages(ctx, 'transfers', { month: contextMonth, sort: 'date', order: 'desc' }, maxRows),
        ]);

        const accounts = asObjectArray(accountsResult.data);
        const groups = asObjectArray(groupsResult.data);
        const budgetRows = asObjectArray(budgetResult.data);
        const transactions = asObjectArray(txResult.data);
        const transfers = asObjectArray(transferResult.data);

        const netWorth = sumNumbers(accounts.map((account) => numberField(account, 'balance')));

        const totals = budgetRows.reduce<{ assigned: number; spent: number; rollover: number; budget_left: number }>(
            (acc, row) => ({
                assigned: acc.assigned + numberField(row, 'assigned'),
                spent: acc.spent + numberField(row, 'spent'),
                rollover: acc.rollover + numberField(row, 'rollover'),
                budget_left: acc.budget_left + numberField(row, 'budget_left'),
            }),
            { assigned: 0, spent: 0, rollover: 0, budget_left: 0 }
        );

        const paymentTotal = sumNumbers(
            transactions
                .filter((row) => String(row.type || '') === 'payment')
                .map((row) => Math.abs(numberField(row, 'amount')))
        );
        const incomeTotal = sumNumbers(
            transactions
                .filter((row) => String(row.type || '') === 'income')
                .map((row) => numberField(row, 'amount'))
        );
        const startingTotal = sumNumbers(
            transactions
                .filter((row) => String(row.type || '') === 'starting')
                .map((row) => numberField(row, 'amount'))
        );
        const netTransactionCashflow = sumNumbers(transactions.map((row) => numberField(row, 'amount')));
        const transferVolume = sumNumbers(transfers.map((row) => Math.abs(numberField(row, 'amount'))));

        const overspentCategories = budgetRows
            .filter((row) => numberField(row, 'budget_left') < 0)
            .sort((a, b) => numberField(a, 'budget_left') - numberField(b, 'budget_left'))
            .slice(0, 20);

        const topSpendingCategories = budgetRows
            .slice()
            .sort((a, b) => numberField(b, 'spent') - numberField(a, 'spent'))
            .slice(0, 20);

        const groupsByDeficit = groups
            .slice()
            .sort((a, b) => numberField(a, 'month_budget_left') - numberField(b, 'month_budget_left'))
            .slice(0, 20);

        return {
            generated_at: new Date().toISOString(),
            month: contextMonth,
            as_of_date: asOfDate || null,
            summary: {
                net_worth: netWorth,
                account_count: accounts.length,
                category_count: budgetRows.length,
                group_count: groups.length,
                totals: {
                    assigned: sumNumbers([totals.assigned as number]),
                    spent: sumNumbers([totals.spent as number]),
                    rollover: sumNumbers([totals.rollover as number]),
                    budget_left: sumNumbers([totals.budget_left as number]),
                },
                cashflow: {
                    income_total: incomeTotal,
                    starting_total: startingTotal,
                    payment_total: paymentTotal,
                    net_transaction_cashflow: netTransactionCashflow,
                    transfer_volume: transferVolume,
                },
                overspent_category_count: overspentCategories.length,
            },
            highlights: {
                overspent_categories: overspentCategories,
                top_spending_categories: topSpendingCategories,
                groups_by_lowest_budget_left: groupsByDeficit,
            },
            recent: {
                transactions: transactions.slice(0, recentItemsLimit),
                transfers: transfers.slice(0, recentItemsLimit),
            },
            truncation: {
                budget_left: budgetResult.truncated,
                transactions: txResult.truncated,
                transfers: transferResult.truncated,
                max_rows_for_summaries: maxRows,
            },
        };
    },

    async cashcat_full_context(args, ctx) {
        const monthArg = parseMonthArg(args.month, 'month');
        const startDate = parseDateArg(args.start_date, 'start_date');
        const endDate = parseDateArg(args.end_date, 'end_date');
        const asOfDate = parseDateArg(args.as_of_date, 'as_of_date');

        if (monthArg && (startDate || endDate)) {
            throw new Error("Use either month or start_date/end_date, not both.");
        }
        if (startDate && endDate && startDate > endDate) {
            throw new Error('start_date cannot be after end_date.');
        }

        const includeAccounts = asBoolean(args.include_accounts, true);
        const includeCategories = asBoolean(args.include_categories, true);
        const includeGroups = asBoolean(args.include_groups, true);
        const includeAssignments = asBoolean(args.include_assignments, true);
        const includeTransactions = asBoolean(args.include_transactions, true);
        const includeTransfers = asBoolean(args.include_transfers, true);
        const includeBudgetLeft = asBoolean(args.include_budget_left, true);
        const maxRows = clampNumber(args.max_rows_per_endpoint, 4000, 100, 10000);

        const contextMonth = monthArg
            || (asOfDate ? asOfDate.slice(0, 7) : undefined)
            || (startDate ? startDate.slice(0, 7) : undefined)
            || getCurrentMonth();

        const tasks: Array<Promise<[string, unknown]>> = [];

        if (includeAccounts) {
            tasks.push(
                fetchAllPages(ctx, 'accounts', { include_balance: true, as_of_date: asOfDate }, maxRows)
                    .then((result) => ['accounts', result])
            );
        }
        if (includeCategories) {
            tasks.push(
                fetchAllPages(ctx, 'categories', {}, maxRows)
                    .then((result) => ['categories', result])
            );
        }
        if (includeGroups) {
            tasks.push(
                fetchAllPages(ctx, 'groups', { include_category_count: true, include_budget_totals: true, month: contextMonth }, maxRows)
                    .then((result) => ['groups', result])
            );
        }
        if (includeAssignments) {
            const assignmentQuery = monthArg
                ? { month: monthArg }
                : {
                    ...(startDate ? { from_month: startDate.slice(0, 7) } : {}),
                    ...(endDate ? { to_month: endDate.slice(0, 7) } : {}),
                };
            tasks.push(
                fetchAllPages(ctx, 'assignments', assignmentQuery, maxRows)
                    .then((result) => ['assignments', result])
            );
        }
        if (includeTransactions) {
            const txQuery = monthArg
                ? { month: monthArg, sort: 'date', order: 'desc' }
                : { start_date: startDate, end_date: endDate, sort: 'date', order: 'desc' };
            tasks.push(
                fetchAllPages(ctx, 'transactions', txQuery, maxRows)
                    .then((result) => ['transactions', result])
            );
        }
        if (includeTransfers) {
            const transferQuery = monthArg
                ? { month: monthArg, sort: 'date', order: 'desc' }
                : { start_date: startDate, end_date: endDate, sort: 'date', order: 'desc' };
            tasks.push(
                fetchAllPages(ctx, 'transfers', transferQuery, maxRows)
                    .then((result) => ['transfers', result])
            );
        }
        if (includeBudgetLeft) {
            tasks.push(
                fetchAllPages(ctx, 'categories/budget-left', { month: contextMonth, as_of_date: asOfDate, include_zero: true }, maxRows)
                    .then((result) => ['budget_left', result])
            );
        }

        const settled = await Promise.all(tasks);
        const datasets = Object.fromEntries(settled) as Record<string, { data: unknown[]; truncated: boolean; meta: Record<string, unknown> | null }>;

        const accounts = asObjectArray(datasets.accounts?.data || []);
        const budgetRows = asObjectArray(datasets.budget_left?.data || []);
        const transactions = asObjectArray(datasets.transactions?.data || []);

        const overview = {
            net_worth: sumNumbers(accounts.map((account) => numberField(account, 'balance'))),
            budget_left_total: sumNumbers(budgetRows.map((row) => numberField(row, 'budget_left'))),
            spending_total: sumNumbers(
                transactions
                    .filter((row) => String(row.type || '') === 'payment')
                    .map((row) => Math.abs(numberField(row, 'amount')))
            ),
            income_total: sumNumbers(
                transactions
                    .filter((row) => String(row.type || '') === 'income')
                    .map((row) => numberField(row, 'amount'))
            ),
        };

        const counts = Object.fromEntries(
            Object.entries(datasets).map(([key, value]) => [key, value.data.length])
        );
        const truncation = Object.fromEntries(
            Object.entries(datasets).map(([key, value]) => [key, value.truncated])
        );

        return {
            generated_at: new Date().toISOString(),
            query: {
                month: monthArg || null,
                start_date: startDate || null,
                end_date: endDate || null,
                as_of_date: asOfDate || null,
                context_month: contextMonth,
                max_rows_per_endpoint: maxRows,
            },
            overview,
            counts,
            truncation,
            datasets,
        };
    },
};

function rpcSuccess(id: JsonRpcId, result: unknown) {
    return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result,
    });
}

function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown) {
    return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: {
            code,
            message,
            ...(data === undefined ? {} : { data }),
        },
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}

export async function GET() {
    return NextResponse.json({
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        transport: 'http-jsonrpc',
        endpoint: '/api/mcp',
        notes: 'POST JSON-RPC requests to this endpoint. Authenticate tool calls with Authorization: Bearer cc_live_...',
    });
}

export async function POST(request: NextRequest) {
    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return rpcError(null, -32700, 'Parse error');
    }

    if (!isRecord(payload)) {
        return rpcError(null, -32600, 'Invalid Request');
    }

    const id: JsonRpcId = (
        typeof payload.id === 'string'
        || typeof payload.id === 'number'
        || payload.id === null
    ) ? payload.id : null;

    if (payload.jsonrpc !== '2.0') {
        return rpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
    }

    const method = payload.method;
    if (typeof method !== 'string') {
        return rpcError(id, -32600, 'Invalid Request: missing method');
    }

    if (method === 'initialize') {
        return rpcSuccess(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {
                    listChanged: false,
                },
            },
            serverInfo: SERVER_INFO,
            instructions: 'Use cashcat_financial_overview and cashcat_full_context for comprehensive financial analysis.',
        });
    }

    if (method === 'ping') {
        return rpcSuccess(id, { ok: true, timestamp: new Date().toISOString() });
    }

    if (method === 'tools/list') {
        return rpcSuccess(id, { tools });
    }

    if (method === 'tools/call') {
        try {
            const authResult = await verifyApiKey(request);
            if (!authResult.isValid) {
                return rpcError(id, -32001, 'Unauthorized', { reason: authResult.error });
            }

            const { name, args } = parseToolParams(payload.params);
            const handler = toolHandlers[name];
            if (!handler) {
                return rpcError(id, -32602, `Unknown tool: ${name}`);
            }

            const ctx: RpcContext = {
                authHeader: extractAuthHeader(request),
                baseOrigin: buildOrigin(request),
            };

            const result = await handler(args, ctx);
            return rpcSuccess(id, {
                content: [
                    {
                        type: 'text',
                        text: formatToolText(result),
                    },
                ],
                structuredContent: result,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            return rpcError(id, -32000, message);
        }
    }

    if (method.startsWith('notifications/')) {
        return new NextResponse(null, { status: 202 });
    }

    return rpcError(id, -32601, `Method not found: ${method}`);
}
