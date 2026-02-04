import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createClient } from '@/app/utils/supabase/server';
import type { Database } from '@/types/supabase';

// Generate date context for the AI
function getDateContext() {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Current date
    const currentDate = now.toISOString().split('T')[0];
    const dayName = dayNames[now.getDay()];

    // This week (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
        currentDate,
        dayName,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0],
        lastMonthStart: lastMonthStart.toISOString().split('T')[0],
        lastMonthEnd: lastMonthEnd.toISOString().split('T')[0],
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    };
}

export async function POST(req: Request) {
    console.log('--- Chat API POST Started ---');
    try {
        // Authenticate the user via session
        console.log('Initializing Supabase client...');
        const supabase = await createClient();

        console.log('Fetching user session...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Auth Error:', authError);
            console.log('User:', user);
            return new Response('Unauthorized', { status: 401 });
        }
        console.log('User authenticated:', user.id);

        console.log('Parsing request body...');
        const body = await req.json();
        const { messages, cachedData }: {
            messages: UIMessage[];
            cachedData?: {
                transactions?: Array<{
                    id: string;
                    amount: number;
                    date: string;
                    vendor: string;
                    description: string | null;
                    type: string;
                    category_id: string;
                    category_name: string | null;
                    group_id: string | null;
                }>;
                categories?: Array<{
                    id: string;
                    name: string;
                    group_id: string;
                    group_name: string | null;
                }>;
                assignments?: Array<{
                    id: string;
                    category_id: string;
                    month: string;
                    assigned: number | null;
                    rollover: number;
                }>;
            };
        } = body;
        console.log('Messages received:', messages.length);
        console.log('Cached data received:', cachedData ? `${cachedData.transactions?.length || 0} transactions, ${cachedData.categories?.length || 0} categories, ${cachedData.assignments?.length || 0} assignments` : 'none');

        // Generate date context for the AI
        const dateContext = getDateContext();
        console.log('Date context:', dateContext);

        console.log('Starting streamText...');
        const result = streamText({
            model: openai('gpt-4o-mini'),
            stopWhen: stepCountIs(10), // Allow up to 5 steps for multi-turn tool execution
            system: `You are CashCat, a friendly and helpful personal finance assistant. You help users manage their budget, track spending, and make smart financial decisions.

## Current Date Context
Today is ${dateContext.currentDate} (${dateContext.dayName}).
- This week: ${dateContext.weekStart} to ${dateContext.weekEnd}
- This month: ${dateContext.monthStart} to ${dateContext.monthEnd}  
- Last month: ${dateContext.lastMonthStart} to ${dateContext.lastMonthEnd}
- Current month (YYYY-MM): ${dateContext.currentMonth}

## Your Capabilities
You can:
- **Search transactions** by vendor name, description, category_name, etc, other text(use search_transactions)
- Fetch and analyze transactions
- Add new transactions
- Summarize budget spending
- Look up categories and groups

## IMPORTANT: Searching for Transactions
When users ask about payments to specific people/vendors (e.g., "did I pay Judi?", "have I bought from Amazon?"):
1. Use the search_transactions tool with a search query
2. The search matches against vendor names and descriptions using fuzzy matching
3. You can combine search with date filters (e.g., "this month", "this week")
4. Example: "Have I paid Judi this month?" → search for "Judi" with from_date/to_date set to this month

## IMPORTANT: Matching Categories and Groups
When users ask about spending on a topic (e.g., "food", "entertainment"):
1. FIRST call get_categories to see all available groups and categories
2. Match user's natural language to actual names:
   - "food" might match a GROUP called "Food" (use group_name filter)
   - "lunch and drinks" might match a CATEGORY called "Lunch & Drinks"
3. Groups contain multiple categories - use group_name when the match is a group
4. Use partial/fuzzy matching - "groceries" could match "Groceries & Shopping"

## Income vs Payment
When a user asks about "income", "earnings", "salary", etc, ALWAYS set the 'type' parameter to 'income' in the get_transactions or search_transactions tool.
Do not assume income is a category or group name unless you are told this. 

## Date Handling
ALWAYS use the date context above. "This month" = ${dateContext.monthStart} to ${dateContext.monthEnd}.
"This week" = ${dateContext.weekStart} to ${dateContext.weekEnd}.

## Transaction Guidelines
- Always confirm details before adding
- Use today's date (${dateContext.currentDate}) if not specified
- Ask for category if unclear
- **CRITICAL:** When reporting spending totals, **ALWAYS** use the 'totalSpent' and 'summaryByCategory' values provided by the 'get_transactions' tool. **DO NOT** attempt to sum the transaction amounts yourself, as you may make arithmetic errors. Trust the tool's calculations.

Be concise, friendly, and use emojis sparingly. Format currency amounts clearly.`,
            messages: await convertToModelMessages(messages),
            tools: {
                // Tool to get categories and groups - call this first to understand user's budget structure
                get_categories: tool({
                    description: 'Fetch all categories and groups. ALWAYS call this first when user asks about spending to match their natural language to actual category/group names.',
                    inputSchema: z.object({}),
                    execute: async () => {
                        console.log('Executing tool: get_categories');

                        // Use cached data if available
                        if (cachedData?.categories && cachedData.categories.length > 0) {
                            console.log(`Using cached categories data: ${cachedData.categories.length} categories`);

                            // Extract unique groups from categories
                            const groupsMap = new Map<string, string>();
                            cachedData.categories.forEach(c => {
                                if (c.group_id && c.group_name) {
                                    groupsMap.set(c.group_id, c.group_name);
                                }
                            });

                            const groups = Array.from(groupsMap.entries()).map(([id, name]) => ({ id, name }));
                            const categoriesWithGroup = cachedData.categories.map(c => ({
                                id: c.id,
                                name: c.name,
                                groupId: c.group_id,
                                groupName: c.group_name || 'Uncategorized',
                            }));

                            console.log(`get_categories (cached) success: ${groups.length} groups, ${categoriesWithGroup.length} categories`);
                            return {
                                groups,
                                categories: categoriesWithGroup,
                                hint: 'Use group_name filter to get all transactions in a group, or category_name for a specific category.',
                                source: 'cached',
                            };
                        }

                        // Fallback to database query
                        console.log('No cached categories, falling back to database query');

                        // Fetch groups
                        const { data: groups, error: groupsError } = await supabase
                            .from('groups')
                            .select('id, name')
                            .eq('user_id', user.id);

                        if (groupsError) {
                            console.error('get_categories groups error:', groupsError);
                            return { error: 'Failed to fetch groups' };
                        }

                        // Fetch categories with group info
                        const { data: categories, error: catError } = await supabase
                            .from('categories')
                            .select('id, name, group')
                            .eq('user_id', user.id);

                        if (catError) {
                            console.error('get_categories categories error:', catError);
                            return { error: 'Failed to fetch categories' };
                        }

                        // Build group-to-categories mapping
                        const groupMap = new Map(groups?.map(g => [g.id, g.name]) || []);
                        const categoriesWithGroup = categories?.map(c => ({
                            id: c.id,
                            name: c.name,
                            groupId: c.group,
                            groupName: groupMap.get(c.group) || 'Uncategorized',
                        })) || [];

                        console.log(`get_categories success: ${groups?.length || 0} groups, ${categories?.length || 0} categories`);
                        return {
                            groups: groups?.map(g => ({ id: g.id, name: g.name })) || [],
                            categories: categoriesWithGroup,
                            hint: 'Use group_name filter to get all transactions in a group, or category_name for a specific category.',
                        };
                    },
                }),

                // Search transactions tool - uses cached data from the client when available
                search_transactions: tool({
                    description: 'Search through transactions by vendor name, description, or any text. Use this when users ask about specific payments, vendors, or merchants (e.g., "did I pay Judi?", "Amazon purchases"). Uses local cached data for fast search.',
                    inputSchema: z.object({
                        amount: z.number().describe('Transaction amount (negative for payments, positive for income)'),
                        search_query: z.string().describe('Text to search for in vendor names and descriptions. Supports partial matching (e.g., "Judi" will match "Judi Therapy").'),
                        from_date: z.string().optional().describe('Start date filter (YYYY-MM-DD). Use date context for "this month", "this week", etc.'),
                        to_date: z.string().optional().describe('End date filter (YYYY-MM-DD). Use date context for "this month", "this week", etc.'),
                        category_name: z.string().optional().describe('Optional filter by category name'),
                        limit: z.number().optional().default(20).describe('Maximum number of results to return'),
                        type: z.enum(['payment', 'income']).optional().default('payment').describe('Transaction type (income / payment)'),
                    }),
                    execute: async ({ search_query, from_date, to_date, category_name, limit, type }) => {
                        console.log('Executing tool: search_transactions', { search_query, from_date, to_date, category_name, limit });

                        const searchLower = search_query.toLowerCase();

                        // Use cached data if available
                        if (cachedData?.transactions && cachedData.transactions.length > 0) {
                            console.log(`Using cached data: ${cachedData.transactions.length} transactions`);

                            let results = cachedData.transactions.filter(t => {
                                // Search in vendor and description
                                const vendorMatch = t.vendor?.toLowerCase().includes(searchLower);
                                const descMatch = t.description?.toLowerCase().includes(searchLower);

                                if (!vendorMatch && !descMatch) return false;

                                // Date filters
                                if (from_date && t.date < from_date) return false;
                                if (to_date && t.date > to_date) return false;

                                // Category filter
                                if (category_name) {
                                    const catMatch = t.category_name?.toLowerCase().includes(category_name.toLowerCase());
                                    if (!catMatch) return false;
                                }

                                return true;
                            });

                            // Sort by date descending
                            results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                            // Limit results
                            results = results.slice(0, limit);

                            // Calculate totals
                            let totalSpent = 0;
                            results.forEach(t => {
                                if (t.type === 'payment') {
                                    totalSpent += t.amount;
                                }
                            });

                            console.log(`search_transactions (cached) success: found ${results.length} matches`);
                            return {
                                transactions: results.map(t => ({
                                    id: t.id,
                                    amount: t.amount,
                                    date: t.date,
                                    vendor: t.vendor,
                                    description: t.description,
                                    type: t.type,
                                    category: t.category_name || 'Uncategorized',
                                })),
                                count: results.length,
                                totalSpent,
                                source: 'cached',
                                searchedFor: search_query,
                            };
                        }

                        // Fallback to database query if no cached data
                        console.log('No cached data available, falling back to database query');

                        let query = supabase
                            .from('transactions')
                            .select(`
                                *,
                                categories (
                                    id,
                                    name,
                                    group
                                )
                            `)
                            .eq('user_id', user.id)
                            .order('date', { ascending: false })
                            .limit(100); // Fetch more to filter

                        if (from_date) {
                            query = query.gte('date', from_date);
                        }
                        if (to_date) {
                            query = query.lte('date', to_date);
                        }
                        if (type) {
                            query = query.eq('type', type);
                        }

                        const { data, error } = await query;

                        if (error) {
                            console.error('search_transactions error:', error);
                            return { error: 'Failed to search transactions' };
                        }

                        // Filter by search query
                        type TransactionWithJoins = {
                            id: string;
                            amount: number;
                            date: string;
                            vendor: string;
                            description: string | null;
                            type: string;
                            categories: { name: string } | null;
                        };

                        let filtered = ((data || []) as TransactionWithJoins[]).filter(t => {
                            const vendorMatch = t.vendor?.toLowerCase().includes(searchLower);
                            const descMatch = t.description?.toLowerCase().includes(searchLower);

                            if (!vendorMatch && !descMatch) return false;

                            // Category filter
                            if (category_name) {
                                const catMatch = t.categories?.name?.toLowerCase().includes(category_name.toLowerCase());
                                if (!catMatch) return false;
                            }

                            return true;
                        }).slice(0, limit);

                        // Calculate totals
                        let totalSpent = 0;
                        filtered.forEach(t => {
                            if (t.type === 'payment') {
                                totalSpent += t.amount;
                            }
                        });

                        console.log(`search_transactions (db) success: found ${filtered.length} matches`);
                        return {
                            transactions: filtered.map(t => ({
                                id: t.id,
                                amount: t.amount,
                                date: t.date,
                                vendor: t.vendor,
                                description: t.description,
                                type: t.type,
                                category: t.categories?.name || 'Uncategorized',
                            })),
                            count: filtered.length,
                            totalSpent,
                            source: 'database',
                            searchedFor: search_query,
                        };
                    },
                }),

                get_transactions: tool({
                    description: 'Fetch transactions. Can filter by group name (to get all categories in a group), category name, or date range. Call get_categories first to find exact names. Often returns total payments / income, but only a sample of transactions. Use search_transactions for specific vendor/description searches.',
                    inputSchema: z.object({
                        limit: z.number().optional().default(10).describe('Maximum number of transactions to return'),
                        group_name: z.string().optional().describe('Filter by group name (e.g., "Food" to get all food-related categories)'),
                        category_name: z.string().optional().describe('Filter by category name (partial match)'),
                        from_date: z.string().optional().describe('Start date filter (YYYY-MM-DD). Use date context for "this month", "this week", etc.'),
                        to_date: z.string().optional().describe('End date filter (YYYY-MM-DD). Use date context for "this month", "this week", etc.'),
                        type: z.enum(['payment', 'income']).optional().default('payment').describe('Transaction type (income / payment)'),
                    }),
                    execute: async ({ limit, group_name, category_name, from_date, to_date, type }) => {
                        console.log('Executing tool: get_transactions', { limit, group_name, category_name, from_date, to_date });

                        // Use cached data if available
                        if (cachedData?.transactions && cachedData.transactions.length > 0 && cachedData?.categories) {
                            console.log(`Using cached data: ${cachedData.transactions.length} transactions`);

                            // Build group lookup from categories
                            const groupIdsByName = new Map<string, Set<string>>();
                            cachedData.categories.forEach(c => {
                                if (c.group_name && c.group_id) {
                                    const lowerGroupName = c.group_name.toLowerCase();
                                    if (!groupIdsByName.has(lowerGroupName)) {
                                        groupIdsByName.set(lowerGroupName, new Set());
                                    }
                                    // Store category_id for each group
                                }
                            });

                            // Get category IDs belonging to the group
                            let categoryIdsInGroup: string[] | null = null;
                            if (group_name) {
                                const lowerGroupName = group_name.toLowerCase();
                                categoryIdsInGroup = cachedData.categories
                                    .filter(c => c.group_name?.toLowerCase() === lowerGroupName)
                                    .map(c => c.id);
                                console.log(`Found ${categoryIdsInGroup.length} categories in group "${group_name}" (cached)`);
                            }

                            let results = cachedData.transactions.filter(t => {
                                // Group filter
                                if (type && t.type !== type) return false;
                                if (categoryIdsInGroup && categoryIdsInGroup.length > 0) {
                                    if (!categoryIdsInGroup.includes(t.category_id)) return false;
                                }

                                // Category name filter
                                if (category_name) {
                                    const lowerName = category_name.toLowerCase();
                                    if (!t.category_name?.toLowerCase().includes(lowerName)) return false;
                                }

                                // Date filters
                                if (from_date && t.date < from_date) return false;
                                if (to_date && t.date > to_date) return false;

                                return true;
                            });


                            let totalSpent = 0;
                            const summaryByCategory: Record<string, number> = {};


                            results.forEach(t => {
                                const amount = t.type === 'payment' ? t.amount : -t.amount;
                                totalSpent += amount;

                                const catName = t.category_name || 'Uncategorized';
                                summaryByCategory[catName] = (summaryByCategory[catName] || 0) + amount;
                            });


                            // 3. SORT & LIMIT (Only for what the AI "sees")
                            results.sort((a, b) => new Date(b.date).getTime() - new Date(b.date).getTime());
                            const limitedResults = results.slice(0, limit); // Slicing happens LAST



                            console.log(`get_transactions (cached) success: found ${results.length} items, total: ${totalSpent}`);
                            return {
                                transactions: limitedResults.map(t => ({
                                    id: t.id,
                                    amount: t.amount,
                                    date: t.date,
                                    vendor: t.vendor,
                                    description: t.description,
                                    type: t.type,
                                    category: t.category_name || 'Uncategorized',
                                })),
                                count: results.length,
                                totalSpent: Math.abs(totalSpent),
                                summaryByCategory,
                                source: 'cached',
                            };
                        }

                        // Fallback to database query
                        console.log('No cached data available, falling back to database query');

                        // If filtering by group, first get all category IDs in that group
                        let categoryIdsInGroup: string[] | null = null;
                        if (group_name) {
                            // Find the group by name (case-insensitive)
                            const { data: groups } = await supabase
                                .from('groups')
                                .select('id, name')
                                .eq('user_id', user.id);

                            const matchedGroup = groups?.find(g =>
                                g.name.toLowerCase() === group_name.toLowerCase()
                            );

                            if (matchedGroup) {
                                // Get all categories in this group
                                const { data: cats } = await supabase
                                    .from('categories')
                                    .select('id')
                                    .eq('user_id', user.id)
                                    .eq('group', matchedGroup.id);

                                categoryIdsInGroup = cats?.map(c => c.id) || [];
                                console.log(`Found ${categoryIdsInGroup.length} categories in group "${group_name}"`);
                            } else {
                                console.log(`Group "${group_name}" not found`);
                            }
                        }

                        let query = supabase
                            .from('transactions')
                            .select(`
                                *,
                                categories (
                                    id,
                                    name,
                                    group
                                ),
                                vendors (
                                    id,
                                    name
                                )
                            `)
                            .eq('user_id', user.id)
                            .order('date', { ascending: false })
                            .limit(limit);

                        // Filter by category IDs if filtering by group
                        if (categoryIdsInGroup && categoryIdsInGroup.length > 0) {
                            query = query.in('category_id', categoryIdsInGroup);
                        }

                        if (from_date) {
                            query = query.gte('date', from_date);
                        }
                        if (to_date) {
                            query = query.lte('date', to_date);
                        }
                        if (type) {
                            query = query.eq('type', type);
                        }

                        const { data, error } = await query;

                        if (error) {
                            console.error('get_transactions error:', error);
                            return { error: 'Failed to fetch transactions' };
                        }

                        // Filter by category name if provided (case-insensitive partial match)
                        type TransactionWithJoins = {
                            id: string;
                            amount: number;
                            date: string;
                            vendor: string;
                            description: string | null;
                            type: string;
                            categories: { name: string } | null;
                        };
                        let filtered: TransactionWithJoins[] = (data || []) as TransactionWithJoins[];
                        if (category_name) {
                            const lowerName = category_name.toLowerCase();
                            filtered = filtered.filter((t) =>
                                t.categories?.name?.toLowerCase().includes(lowerName)
                            );
                        }

                        // Calculate total spent and breakdown
                        let totalSpent = 0;
                        const summaryByCategory: Record<string, number> = {};

                        filtered.forEach(t => {
                            const amount = t.type === 'payment' ? t.amount : -t.amount;
                            totalSpent += amount;

                            const catName = t.categories?.name || 'Uncategorized';
                            summaryByCategory[catName] = (summaryByCategory[catName] || 0) + amount;
                        });

                        console.log(`get_transactions success: found ${filtered.length} items, total: ${totalSpent}`);
                        return {
                            transactions: filtered.map((t) => ({
                                id: t.id,
                                amount: t.amount,
                                date: t.date,
                                vendor: t.vendor,
                                description: t.description,
                                type: t.type,
                                category: t.categories?.name || 'Uncategorized',
                            })),
                            count: filtered.length,
                            totalSpent: Math.abs(totalSpent),
                            summaryByCategory,
                        };
                    },
                }),

                add_transaction: tool({
                    description: 'Add a new transaction for the user. Returns the created transaction details.',
                    inputSchema: z.object({
                        amount: z.number().describe('Transaction amount (negative for payments, positive for income)'),
                        vendor: z.string().describe('Vendor/merchant name'),
                        category_name: z.string().describe('Category name to assign the transaction to'),
                        date: z.string().optional().describe('Transaction date (YYYY-MM-DD). Defaults to today.'),
                        description: z.string().optional().describe('Optional description/notes'),
                        type: z.enum(['payment', 'income']).optional().default('payment').describe('Transaction type'),
                    }),
                    execute: async ({ amount, vendor, category_name, date, description, type }) => {
                        console.log('Executing tool: add_transaction', { amount, vendor, category_name });
                        // Find the category by name
                        const { data: categories, error: catError } = await supabase
                            .from('categories')
                            .select('id, name')
                            .eq('user_id', user.id)
                            .ilike('name', `%${category_name}%`)
                            .limit(1);

                        if (catError || !categories || categories.length === 0) {
                            return {
                                error: `Could not find a category matching "${category_name}". Please specify a valid category.`,
                                available_action: 'Try asking the user for a different category name.',
                            };
                        }

                        const category = categories[0];

                        // Find default account
                        const { data: defaultAccount } = await supabase
                            .from('accounts')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('is_default', true)
                            .single();

                        let accountId = defaultAccount?.id;

                        // Fallback to any account if no default
                        if (!accountId) {
                            const { data: anyAccount } = await supabase
                                .from('accounts')
                                .select('id')
                                .eq('user_id', user.id)
                                .limit(1)
                                .single();
                            accountId = anyAccount?.id;
                        }

                        if (!accountId) {
                            return { error: 'No account found. Please create an account first.' };
                        }

                        // Create the transaction
                        const transactionDate = date || new Date().toISOString().split('T')[0];

                        const { data: newTransaction, error: insertError } = await supabase
                            .from('transactions')
                            .insert({
                                user_id: user.id,
                                account_id: accountId,
                                category_id: category.id,
                                amount: Math.abs(amount),
                                vendor,
                                description: description || null,
                                date: transactionDate,
                                type: type || 'payment',
                            })
                            .select()
                            .single();

                        if (insertError) {
                            console.error('add_transaction insert error:', insertError);
                            return { error: `Failed to add transaction: ${insertError.message}` };
                        }

                        console.log('add_transaction success:', newTransaction.id);
                        return {
                            success: true,
                            transaction: {
                                id: newTransaction.id,
                                amount: newTransaction.amount,
                                vendor: newTransaction.vendor,
                                category: category.name,
                                date: newTransaction.date,
                                type: newTransaction.type,
                            },
                            message: `Added ${type || 'payment'} of $${Math.abs(amount).toFixed(2)} at ${vendor} in ${category.name}`,
                        };
                    },
                }),

                summarize_budget: tool({
                    description: 'Analyze the user\'s current spending against their budget for a given month. Shows assigned amount, spent amount, rollover from previous months, and available balance per category.',
                    inputSchema: z.object({
                        month: z.string().optional().describe('Month to analyze (YYYY-MM). Defaults to current month.'),
                    }),
                    execute: async ({ month }) => {
                        console.log('Executing tool: summarize_budget', { month });
                        const targetMonth = month || new Date().toISOString().slice(0, 7);
                        const startDate = `${targetMonth}-01`;
                        const endDate = new Date(
                            parseInt(targetMonth.slice(0, 4)),
                            parseInt(targetMonth.slice(5, 7)),
                            0
                        ).toISOString().split('T')[0];

                        // Helper function to calculate rollover for a category
                        const calculateRollover = (
                            categoryId: string,
                            targetMonth: string,
                            allAssignments: Array<{ category_id: string; month: string; assigned: number | null }>,
                            allTransactions: Array<{ category_id: string; date: string; type: string; amount: number }>
                        ): number => {
                            // Get all assignments for this category before the target month
                            const categoryAssignments = allAssignments.filter(a => a.category_id === categoryId && a.month < targetMonth);
                            
                            if (categoryAssignments.length === 0) return 0;
                            
                            // Find earliest month
                            const earliestMonth = categoryAssignments.reduce((earliest, a) => 
                                a.month < earliest ? a.month : earliest, categoryAssignments[0].month);
                            
                            let rollover = 0;
                            let currentDate = new Date(earliestMonth + '-01');
                            
                            while (true) {
                                const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                                if (monthStr >= targetMonth) break;
                                
                                const assignment = allAssignments.find(a => a.category_id === categoryId && a.month === monthStr);
                                const assigned = assignment?.assigned || 0;
                                
                                // Calculate month boundaries
                                const monthStart = monthStr + '-01';
                                const nextMonthDate = new Date(monthStart);
                                nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                                const monthEnd = new Date(nextMonthDate.getTime() - 1).toISOString().split('T')[0];
                                
                                // Sum spending for this month (payments only)
                                const monthSpent = allTransactions
                                    .filter(t => t.category_id === categoryId &&
                                        t.date >= monthStart &&
                                        t.date <= monthEnd &&
                                        t.type === 'payment')
                                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                                
                                rollover = rollover + assigned - monthSpent;
                                
                                currentDate.setMonth(currentDate.getMonth() + 1);
                            }
                            
                            return rollover;
                        };

                        // Use cached data if available
                        if (cachedData?.transactions && cachedData.transactions.length > 0 && 
                            cachedData?.categories && cachedData?.assignments) {
                            console.log('Using cached data for budget summary');
                            
                            // Get this month's assignments
                            const monthAssignments = cachedData.assignments.filter(a => a.month === targetMonth);
                            
                            // Calculate spending for this month
                            const spendingByCategory: Record<string, number> = {};
                            cachedData.transactions
                                .filter(t => t.date >= startDate && t.date <= endDate && t.type === 'payment')
                                .forEach(t => {
                                    spendingByCategory[t.category_id] = (spendingByCategory[t.category_id] || 0) + t.amount;
                                });
                            
                            // Build category summaries with rollover
                            const categorySummaries = monthAssignments.map(a => {
                                const category = cachedData.categories?.find(c => c.id === a.category_id);
                                const spent = spendingByCategory[a.category_id] || 0;
                                const assigned = a.assigned || 0;
                                
                                // Calculate rollover from previous months
                                const rollover = calculateRollover(
                                    a.category_id,
                                    targetMonth,
                                    cachedData.assignments || [],
                                    cachedData.transactions || []
                                );
                                
                                // Available = rollover + assigned - spent
                                const available = rollover + assigned - spent;
                                
                                return {
                                    category: category?.name || 'Unknown',
                                    assigned,
                                    spent,
                                    rollover,
                                    available,
                                    percentUsed: (rollover + assigned) > 0 ? Math.round((spent / (rollover + assigned)) * 100) : 0,
                                    status: available < 0 ? 'overspent' : available < (rollover + assigned) * 0.2 ? 'low' : 'ok',
                                };
                            });
                            
                            const totalAssigned = categorySummaries.reduce((sum, c) => sum + c.assigned, 0);
                            const totalSpent = categorySummaries.reduce((sum, c) => sum + c.spent, 0);
                            const totalRollover = categorySummaries.reduce((sum, c) => sum + c.rollover, 0);
                            const totalAvailable = categorySummaries.reduce((sum, c) => sum + c.available, 0);
                            
                            console.log('summarize_budget (cached) success', { totalAssigned, totalSpent, totalRollover });
                            return {
                                month: targetMonth,
                                summary: {
                                    totalAssigned,
                                    totalSpent,
                                    totalRollover,
                                    totalAvailable,
                                    percentUsed: (totalAssigned + totalRollover) > 0 ? Math.round((totalSpent / (totalAssigned + totalRollover)) * 100) : 0,
                                },
                                categories: categorySummaries.sort((a, b) => b.spent - a.spent),
                                alerts: categorySummaries
                                    .filter(c => c.status === 'overspent')
                                    .map(c => `${c.category} is £${Math.abs(c.available).toFixed(2)} over budget`),
                                source: 'cached',
                            };
                        }

                        // Fallback to database query
                        console.log('No cached data, falling back to database for budget summary');

                        // Get ALL assignments (needed for rollover calculation)
                        const { data: allAssignments, error: allAssignError } = await supabase
                            .from('assignments')
                            .select(`
                                id,
                                assigned,
                                category_id,
                                month,
                                categories (
                                    id,
                                    name,
                                    group
                                )
                            `)
                            .eq('user_id', user.id);

                        if (allAssignError) {
                            console.error('summarize_budget assignment error:', allAssignError);
                            return { error: 'Failed to fetch budget assignments' };
                        }

                        // Get ALL transactions (needed for rollover calculation)
                        const { data: allTransactions, error: allTxError } = await supabase
                            .from('transactions')
                            .select('amount, category_id, type, date')
                            .eq('user_id', user.id);

                        if (allTxError) {
                            console.error('summarize_budget transaction error:', allTxError);
                            return { error: 'Failed to fetch transactions' };
                        }

                        // Filter to this month's assignments
                        type AssignmentWithCategory = {
                            id: string;
                            assigned: number | null;
                            category_id: string;
                            month: string;
                            categories: { id: string; name: string; group: string } | null;
                        };
                        const monthAssignments = (allAssignments || []).filter(a => a.month === targetMonth) as AssignmentWithCategory[];

                        // Calculate spending for this month
                        const spendingByCategory: Record<string, number> = {};
                        (allTransactions || [])
                            .filter(t => t.date >= startDate && t.date <= endDate && t.type === 'payment')
                            .forEach(t => {
                                spendingByCategory[t.category_id] = (spendingByCategory[t.category_id] || 0) + t.amount;
                            });

                        // Build summary with rollover
                        const categorySummaries = monthAssignments.map((a) => {
                            const spent = spendingByCategory[a.category_id] || 0;
                            const assigned = a.assigned || 0;
                            
                            // Calculate rollover
                            const rollover = calculateRollover(
                                a.category_id,
                                targetMonth,
                                (allAssignments || []).map(x => ({ category_id: x.category_id, month: x.month, assigned: x.assigned })),
                                (allTransactions || []).map(x => ({ category_id: x.category_id, date: x.date, type: x.type, amount: x.amount }))
                            );
                            
                            const available = rollover + assigned - spent;

                            return {
                                category: a.categories?.name || 'Unknown',
                                assigned,
                                spent,
                                rollover,
                                available,
                                percentUsed: (rollover + assigned) > 0 ? Math.round((spent / (rollover + assigned)) * 100) : 0,
                                status: available < 0 ? 'overspent' : available < (rollover + assigned) * 0.2 ? 'low' : 'ok',
                            };
                        });

                        const totalAssigned = categorySummaries.reduce((sum: number, c) => sum + c.assigned, 0);
                        const totalSpent = categorySummaries.reduce((sum: number, c) => sum + c.spent, 0);
                        const totalRollover = categorySummaries.reduce((sum: number, c) => sum + c.rollover, 0);
                        const totalAvailable = categorySummaries.reduce((sum: number, c) => sum + c.available, 0);

                        console.log('summarize_budget success', { totalAssigned, totalSpent, totalRollover });
                        return {
                            month: targetMonth,
                            summary: {
                                totalAssigned,
                                totalSpent,
                                totalRollover,
                                totalAvailable,
                                percentUsed: (totalAssigned + totalRollover) > 0 ? Math.round((totalSpent / (totalAssigned + totalRollover)) * 100) : 0,
                            },
                            categories: categorySummaries.sort((a, b) => b.spent - a.spent),
                            alerts: categorySummaries
                                .filter((c) => c.status === 'overspent')
                                .map((c) => `${c.category} is £${Math.abs(c.available).toFixed(2)} over budget`),
                        };
                    },
                }),
            },
        });

        console.log('Stream created successfully');
        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error('CATALOGGED API ERROR:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
