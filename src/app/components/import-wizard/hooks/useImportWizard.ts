// ─── Import Wizard State Hook ────────────────────────────────────────────────
// Central reducer managing the entire wizard lifecycle.

'use client';

import { useReducer, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type {
    ImportWizardState,
    ImportWizardAction,
    ParsedTransaction,
    ColumnMapping,
    ExistingTransaction,
    ExistingCategory,
    ExistingGroup,
    CategoryAction,
} from '../types';
import { parseCSVFile, normalizeVendor, parseDate, parseAmount, detectDateFormat } from '../utils/csv-parser';
import { detectFormat } from '../utils/format-detectors';
import { findDuplicates } from '../utils/duplicate-checker';

const initialState: ImportWizardState = {
    step: 'upload',
    rawFile: null,
    rawRows: [],
    headers: [],
    detectedFormat: 'custom',
    columnMapping: { date: 0, vendor: 1, amount: 2 },
    dateFormat: 'auto',
    targetAccountId: null,
    createNewAccount: null,
    parsedTransactions: [],
    vendorCategoryRules: {},
    categoryActions: {},
    isCommitting: false,
    commitProgress: 0,
    commitTotal: 0,
    commitError: null,
    commitDone: false,
};

function reducer(state: ImportWizardState, action: ImportWizardAction): ImportWizardState {
    switch (action.type) {
        case 'SET_FILE':
            return {
                ...state,
                rawFile: action.file,
                headers: action.headers,
                rawRows: action.rows,
            };

        case 'SET_FORMAT':
            return {
                ...state,
                detectedFormat: action.format,
                columnMapping: action.mapping,
            };

        case 'SET_DATE_FORMAT':
            return { ...state, dateFormat: action.dateFormat };

        case 'UPDATE_MAPPING':
            return {
                ...state,
                columnMapping: { ...state.columnMapping, ...action.mapping },
            };

        case 'SET_ACCOUNT':
            return { ...state, targetAccountId: action.accountId, createNewAccount: null };

        case 'SET_CREATE_ACCOUNT':
            return { ...state, createNewAccount: action.account, targetAccountId: null };

        case 'SET_PARSED_TRANSACTIONS':
            return { ...state, parsedTransactions: action.transactions };

        case 'SET_CATEGORY_ACTION': {
            const newActions = { ...state.categoryActions, [action.csvCategory]: action.action };
            // Apply the action to all transactions with this CSV category
            const updatedTransactions = state.parsedTransactions.map(tx => {
                if (tx.csvCategory === action.csvCategory) {
                    const act = action.action;
                    return {
                        ...tx,
                        assignedCategoryId: act.type === 'merge' ? act.targetCategoryId
                            : act.type === 'create' ? `new:${action.csvCategory}`
                            : null,
                    };
                }
                return tx;
            });
            return {
                ...state,
                categoryActions: newActions,
                parsedTransactions: updatedTransactions,
            };
        }

        case 'SET_VENDOR_RULE': {
            const normalizedVendor = normalizeVendor(action.vendor);
            const newRules = { ...state.vendorCategoryRules, [normalizedVendor]: action.categoryId };
            // Auto-apply to all transactions with this vendor that don't already have a category
            const updatedTransactions = state.parsedTransactions.map(tx => {
                if (normalizeVendor(tx.vendor) === normalizedVendor) {
                    return { ...tx, assignedCategoryId: action.categoryId };
                }
                return tx;
            });
            return {
                ...state,
                vendorCategoryRules: newRules,
                parsedTransactions: updatedTransactions,
            };
        }

        case 'APPLY_VENDOR_RULES': {
            const updatedTransactions = state.parsedTransactions.map(tx => {
                const rule = state.vendorCategoryRules[normalizeVendor(tx.vendor)];
                if (rule && !tx.assignedCategoryId) {
                    return { ...tx, assignedCategoryId: rule };
                }
                return tx;
            });
            return { ...state, parsedTransactions: updatedTransactions };
        }

        case 'SET_TRANSACTION_CATEGORY':
            return {
                ...state,
                parsedTransactions: state.parsedTransactions.map(tx =>
                    tx.index === action.index
                        ? { ...tx, assignedCategoryId: action.categoryId }
                        : tx
                ),
            };

        case 'TOGGLE_DUPLICATE_INCLUDE':
            return {
                ...state,
                parsedTransactions: state.parsedTransactions.map(tx =>
                    tx.index === action.index
                        ? { ...tx, includeAnyway: !tx.includeAnyway }
                        : tx
                ),
            };

        case 'MARK_DUPLICATES':
            return {
                ...state,
                parsedTransactions: state.parsedTransactions.map(tx => ({
                    ...tx,
                    isDuplicate: action.duplicateIndices.has(tx.index),
                })),
            };

        case 'GO_TO_STEP':
            return { ...state, step: action.step };

        case 'COMMIT_START':
            return { ...state, isCommitting: true, commitProgress: 0, commitError: null, commitDone: false };

        case 'COMMIT_PROGRESS':
            return { ...state, commitProgress: action.progress, commitTotal: action.total };

        case 'COMMIT_ERROR':
            return { ...state, isCommitting: false, commitError: action.error };

        case 'COMMIT_DONE':
            return { ...state, isCommitting: false, commitDone: true, commitProgress: state.commitTotal };

        case 'RESET':
            return { ...initialState };

        default:
            return state;
    }
}

export function useImportWizard() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const supabase = createClientComponentClient<Database>();

    /**
     * Step 1: Process the uploaded file
     */
    const processFile = useCallback(async (file: File) => {
        const { headers, rows } = await parseCSVFile(file);
        dispatch({ type: 'SET_FILE', file, headers, rows });

        // Auto-detect format
        const detection = detectFormat(headers);
        dispatch({ type: 'SET_FORMAT', format: detection.format, mapping: detection.mapping });

        // Auto-detect date format from sample data
        const dateColIdx = detection.mapping.date;
        if (dateColIdx >= 0) {
            const dateSamples = rows.slice(0, 20).map(r => r[dateColIdx] || '').filter(Boolean);
            const dateFormat = detectDateFormat(dateSamples);
            dispatch({ type: 'SET_DATE_FORMAT', dateFormat });
        }
    }, []);

    /**
     * Step 2→3 transition: Parse rows into structured transactions using the confirmed mapping
     */
    const parseTransactions = useCallback(() => {
        const { rawRows, columnMapping, detectedFormat, dateFormat } = state;
        const transactions: ParsedTransaction[] = [];

        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];

            // Extract date
            const rawDate = row[columnMapping.date] || '';
            const date = parseDate(rawDate, dateFormat);
            if (!date) continue; // Skip rows with unparseable dates

            // Extract vendor
            const vendor = (row[columnMapping.vendor] || '').trim();
            if (!vendor) continue; // Skip rows with no vendor

            // Extract amount
            let amount: number | null = null;
            if (detectedFormat === 'ynab' && columnMapping.inflow !== undefined && columnMapping.outflow !== undefined) {
                const inflow = parseAmount(row[columnMapping.inflow] || '0') || 0;
                const outflow = parseAmount(row[columnMapping.outflow] || '0') || 0;
                amount = inflow - outflow;
            } else {
                amount = parseAmount(row[columnMapping.amount] || '');
            }
            if (amount === null) continue; // Skip rows with unparseable amounts

            // Extract description
            const description = columnMapping.description !== undefined
                ? (row[columnMapping.description] || '').trim()
                : '';

            // Extract CSV category
            const csvCategory = columnMapping.category !== undefined
                ? (row[columnMapping.category] || '').trim()
                : '';

            // Detect starting balance
            const isStartingBalance = normalizeVendor(vendor).includes('starting balance');

            transactions.push({
                index: i,
                date,
                vendor,
                amount,
                description,
                csvCategory,
                isStartingBalance,
                assignedCategoryId: null,
                isDuplicate: false,
                includeAnyway: false,
            });
        }

        dispatch({ type: 'SET_PARSED_TRANSACTIONS', transactions });
        return transactions;
    }, [state.rawRows, state.columnMapping, state.detectedFormat, state.dateFormat]);

    /**
     * Check for duplicates against existing transactions
     */
    const checkDuplicates = useCallback(async (accountId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existingTxs } = await supabase
            .from('transactions')
            .select('date, vendor, amount')
            .eq('user_id', user.id)
            .eq('account_id', accountId);

        if (existingTxs) {
            const duplicates = findDuplicates(state.parsedTransactions, existingTxs as ExistingTransaction[]);
            dispatch({ type: 'MARK_DUPLICATES', duplicateIndices: duplicates });
        }
    }, [state.parsedTransactions, supabase]);

    /**
     * Commit the import to the database
     */
    const commitImport = useCallback(async (
        existingCategories: ExistingCategory[],
        existingGroups: ExistingGroup[],
        invalidateQueries: () => void,
    ) => {
        dispatch({ type: 'COMMIT_START' });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            let accountId = state.targetAccountId;

            // 1. Create account if needed
            if (state.createNewAccount && !accountId) {
                const { data: newAccount, error: accError } = await supabase
                    .from('accounts')
                    .insert({
                        name: state.createNewAccount.name,
                        type: state.createNewAccount.type,
                        user_id: user.id,
                        is_active: true,
                        is_default: false,
                    })
                    .select()
                    .single();

                if (accError) throw new Error(`Failed to create account: ${accError.message}`);
                accountId = newAccount.id;
            }

            if (!accountId) throw new Error('No account selected');

            // 2. Create new categories and groups as needed
            const categoryIdMap = new Map<string, string>(); // "new:csvCategoryName" → real ID

            for (const [csvCategory, action] of Object.entries(state.categoryActions)) {
                if (action.type === 'create') {
                    let groupId = action.groupId;

                    // If groupId starts with "new:", create the group first
                    if (groupId.startsWith('new:')) {
                        const groupName = action.groupName;
                        // Check if it already exists (might have been created for a previous category)
                        const existingGroup = existingGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
                        if (existingGroup) {
                            groupId = existingGroup.id;
                        } else {
                            const { data: newGroup, error: grpError } = await supabase
                                .from('groups')
                                .insert({ name: groupName, user_id: user.id })
                                .select()
                                .single();

                            if (grpError) throw new Error(`Failed to create group "${groupName}": ${grpError.message}`);
                            groupId = newGroup.id;
                            // Add to existingGroups so subsequent categories can find it
                            existingGroups.push({ id: groupId, name: groupName });
                        }
                    }

                    const { data: newCat, error: catError } = await supabase
                        .from('categories')
                        .insert({
                            name: action.name,
                            group: groupId,
                            user_id: user.id,
                            timeframe: { type: 'monthly' },
                        })
                        .select()
                        .single();

                    if (catError) throw new Error(`Failed to create category "${action.name}": ${catError.message}`);
                    categoryIdMap.set(`new:${csvCategory}`, newCat.id);
                } else if (action.type === 'merge') {
                    categoryIdMap.set(`new:${csvCategory}`, action.targetCategoryId);
                }
            }

            // 3. Build final transaction list
            const transactionsToInsert = state.parsedTransactions
                .filter(tx => {
                    if (tx.isDuplicate && !tx.includeAnyway) return false;
                    return true;
                })
                .map(tx => {
                    // Resolve category ID
                    let categoryId = tx.assignedCategoryId;
                    if (categoryId && categoryId.startsWith('new:')) {
                        categoryId = categoryIdMap.get(categoryId) || null;
                    }

                    // Determine transaction type
                    let type = 'payment';
                    if (tx.isStartingBalance) {
                        type = 'starting';
                    } else if (tx.amount > 0) {
                        type = 'income';
                    }

                    return {
                        amount: tx.amount,
                        date: tx.date,
                        vendor: tx.vendor,
                        description: tx.description || null,
                        type,
                        account_id: accountId!,
                        user_id: user.id,
                        ...(categoryId ? { category_id: categoryId } : {}),
                    };
                });

            // 4. Insert in batches
            const batchSize = 50;
            const total = transactionsToInsert.length;
            dispatch({ type: 'COMMIT_PROGRESS', progress: 0, total });

            for (let i = 0; i < total; i += batchSize) {
                const batch = transactionsToInsert.slice(i, i + batchSize);
                const { error: insertError } = await supabase
                    .from('transactions')
                    .insert(batch);

                if (insertError) {
                    throw new Error(`Failed to insert transactions (batch ${Math.floor(i / batchSize) + 1}): ${insertError.message}`);
                }

                dispatch({ type: 'COMMIT_PROGRESS', progress: Math.min(i + batchSize, total), total });
            }

            // 5. Create vendors for any new vendor names
            const uniqueVendors = [...new Set(transactionsToInsert.map(tx => tx.vendor))];
            const { data: existingVendors } = await supabase
                .from('vendors')
                .select('name')
                .eq('user_id', user.id);

            const existingVendorNames = new Set((existingVendors || []).map(v => v.name.toLowerCase()));
            const newVendors = uniqueVendors
                .filter(v => !existingVendorNames.has(v.toLowerCase()) && v !== 'Starting Balance')
                .map(name => ({ name, user_id: user.id }));

            if (newVendors.length > 0) {
                // Insert in batches to avoid hitting limits
                for (let i = 0; i < newVendors.length; i += batchSize) {
                    await supabase.from('vendors').insert(newVendors.slice(i, i + batchSize));
                }
            }

            // 6. Invalidate caches
            invalidateQueries();

            dispatch({ type: 'COMMIT_DONE' });
        } catch (error: any) {
            dispatch({ type: 'COMMIT_ERROR', error: error.message || 'Import failed' });
        }
    }, [state, supabase]);

    return {
        state,
        dispatch,
        processFile,
        parseTransactions,
        checkDuplicates,
        commitImport,
    };
}
