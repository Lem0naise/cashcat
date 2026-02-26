/**
 * Import Format Presets
 * 
 * Defines known CSV formats from banks and budgeting apps.
 * Each preset maps CSV columns to CashCat transaction fields.
 * 
 * To add a new bank/service format:
 * 1. Add a new ImportFormatPreset object to the IMPORT_PRESETS array
 * 2. Define the column mappings and any special handling
 */

import { parseDate, parseAmount } from './csv-parser';

/** CashCat fields that CSV columns can map to */
export type CashCatField =
    | 'date'
    | 'vendor'
    | 'amount'          // Single amount column (negative = outflow, positive = inflow)
    | 'outflow'         // Separate outflow column (always positive number)
    | 'inflow'          // Separate inflow column (always positive number)
    | 'description'
    | 'category'        // Category name
    | 'category_group'  // Group name
    | 'account'         // Account name (for multi-account imports like YNAB)
    | 'type'            // Transaction type
    | 'ignore';         // Column should be ignored

export type ColumnMapping = {
    /** The CSV column header (as it appears in the file) */
    csvHeader: string;
    /** The CashCat field it maps to */
    cashcatField: CashCatField;
};

export type ImportFormatPreset = {
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** Short description */
    description: string;
    /** Whether this format supports multiple accounts in one file */
    multiAccount: boolean;
    /** Column mappings */
    mappings: ColumnMapping[];
    /** 
     * Headers that must be present for auto-detection.
     * If all these headers are found, this preset is suggested.
     */
    detectHeaders: string[];
    /** Optional: custom date format hint */
    dateFormat?: string;
    /** Whether amounts use separate inflow/outflow columns */
    splitAmounts: boolean;
    /**
     * Optional: special vendor value that indicates a starting balance.
     * These rows will be imported as type 'starting' instead of normal transactions.
     */
    startingBalanceVendor?: string;
};

/**
 * Built-in format presets.
 * Add new bank formats here. Order matters - first match wins for auto-detection.
 */
export const IMPORT_PRESETS: ImportFormatPreset[] = [
    {
        id: 'ynab',
        name: 'YNAB (You Need A Budget)',
        description: 'Export from YNAB budgeting app. Supports multiple accounts, categories, and groups.',
        multiAccount: true,
        splitAmounts: true,
        startingBalanceVendor: 'Starting Balance',
        detectHeaders: ['Account', 'Flag', 'Date', 'Payee', 'Category Group/Category', 'Category Group', 'Category', 'Memo', 'Outflow', 'Inflow', 'Cleared'],
        mappings: [
            { csvHeader: 'Account', cashcatField: 'account' },
            { csvHeader: 'Flag', cashcatField: 'ignore' },
            { csvHeader: 'Date', cashcatField: 'date' },
            { csvHeader: 'Payee', cashcatField: 'vendor' },
            { csvHeader: 'Category Group/Category', cashcatField: 'ignore' },
            { csvHeader: 'Category Group', cashcatField: 'category_group' },
            { csvHeader: 'Category', cashcatField: 'category' },
            { csvHeader: 'Memo', cashcatField: 'description' },
            { csvHeader: 'Outflow', cashcatField: 'outflow' },
            { csvHeader: 'Inflow', cashcatField: 'inflow' },
            { csvHeader: 'Cleared', cashcatField: 'ignore' },
        ],
    },
    {
        id: 'generic-bank',
        name: 'Generic Bank Export',
        description: 'Common bank CSV with Date, Description, Amount columns. Works with most UK/US banks.',
        multiAccount: false,
        splitAmounts: false,
        detectHeaders: ['Date', 'Description', 'Amount'],
        mappings: [
            { csvHeader: 'Date', cashcatField: 'date' },
            { csvHeader: 'Description', cashcatField: 'vendor' },
            { csvHeader: 'Amount', cashcatField: 'amount' },
        ],
    },
    {
        id: 'generic-bank-debit-credit',
        name: 'Generic Bank (Debit/Credit)',
        description: 'Bank CSV with separate Debit and Credit columns.',
        multiAccount: false,
        splitAmounts: true,
        detectHeaders: ['Date', 'Description', 'Debit', 'Credit'],
        mappings: [
            { csvHeader: 'Date', cashcatField: 'date' },
            { csvHeader: 'Description', cashcatField: 'vendor' },
            { csvHeader: 'Debit', cashcatField: 'outflow' },
            { csvHeader: 'Credit', cashcatField: 'inflow' },
        ],
    },
    {
        id: 'starling-bank',
        name: 'Starling Bank',
        description: 'Starling Bank export with counter party and spending category.',
        multiAccount: false,
        splitAmounts: false,
        detectHeaders: ['Date', 'Counter Party', 'Reference', 'Type', 'Amount (GBP)', 'Balance (GBP)', 'Spending Category', 'Notes'],
        mappings: [
            { csvHeader: 'Date', cashcatField: 'date' },
            { csvHeader: 'Counter Party', cashcatField: 'vendor' },
            { csvHeader: 'Reference', cashcatField: 'ignore' },
            { csvHeader: 'Type', cashcatField: 'ignore' },
            { csvHeader: 'Amount (GBP)', cashcatField: 'amount' },
            { csvHeader: 'Balance (GBP)', cashcatField: 'ignore' },
            { csvHeader: 'Spending Category', cashcatField: 'category' },
            { csvHeader: 'Notes', cashcatField: 'description' },
        ],
    },
];

/**
 * Try to detect which preset matches the given CSV headers.
 * Returns the first matching preset, or null if no match.
 */
export function detectFormat(headers: string[]): ImportFormatPreset | null {
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

    for (const preset of IMPORT_PRESETS) {
        const normalizedDetect = preset.detectHeaders.map(h => h.toLowerCase());
        const allPresent = normalizedDetect.every(dh =>
            normalizedHeaders.some(h => h === dh)
        );
        if (allPresent) {
            return preset;
        }
    }

    return null;
}

/**
 * Attempt to auto-map CSV headers to CashCat fields using common patterns.
 * Returns a mapping for each header.
 */
export function autoMapHeaders(headers: string[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    for (const header of headers) {
        const lower = header.toLowerCase().trim();

        let field: CashCatField = 'ignore';

        // Date patterns
        if (/^(date|transaction.?date|posting.?date|value.?date|trans.?date)$/i.test(lower)) {
            field = 'date';
        }
        // Vendor/Payee patterns
        else if (/^(payee|vendor|merchant|description|narrative|details|transaction.?description|name|reference|particulars)$/i.test(lower)) {
            field = 'vendor';
        }
        // Single amount patterns
        else if (/^(amount|value|sum|total|transaction.?amount)$/i.test(lower)) {
            field = 'amount';
        }
        // Outflow patterns
        else if (/^(outflow|debit|withdrawal|debit.?amount|money.?out|paid.?out|expenditure)$/i.test(lower)) {
            field = 'outflow';
        }
        // Inflow patterns
        else if (/^(inflow|credit|deposit|credit.?amount|money.?in|paid.?in)$/i.test(lower)) {
            field = 'inflow';
        }
        // Description/Memo patterns
        else if (/^(memo|notes?|comment|additional.?info)$/i.test(lower)) {
            field = 'description';
        }
        // Category patterns
        else if (/^(category|type|transaction.?type)$/i.test(lower)) {
            field = 'category';
        }
        // Category group patterns
        else if (/^(category.?group|group)$/i.test(lower)) {
            field = 'category_group';
        }
        // Account patterns
        else if (/^(account|account.?name|account.?number)$/i.test(lower)) {
            field = 'account';
        }

        mappings.push({
            csvHeader: header,
            cashcatField: field,
        });
    }

    return mappings;
}

/**
 * Represents a single parsed & mapped transaction row ready for review/import.
 */
export type MappedTransaction = {
    /** Row index in the original CSV (for reference) */
    rowIndex: number;
    /** Parsed date in YYYY-MM-DD format */
    date: string;
    /** Vendor/payee name */
    vendor: string;
    /** Amount (negative for outflow, positive for inflow) */
    amount: number;
    /** Optional description/memo */
    description: string;
    /** Optional category name from CSV (for YNAB-style imports) */
    categoryName: string;
    /** Optional category group name from CSV */
    categoryGroupName: string;
    /** Optional account name from CSV (for multi-account imports) */
    accountName: string;
    /** Whether this is a starting balance row */
    isStartingBalance: boolean;
    /** Raw row data for debugging */
    rawRow: string[];
};

/**
 * Apply column mappings to parsed CSV rows and produce MappedTransaction objects.
 */
export function applyMappings(
    headers: string[],
    rows: string[][],
    mappings: ColumnMapping[],
    options?: {
        startingBalanceVendor?: string;
    }
): { transactions: MappedTransaction[]; errors: { rowIndex: number; message: string }[] } {
    const transactions: MappedTransaction[] = [];
    const errors: { rowIndex: number; message: string }[] = [];

    // Build a lookup: csvHeader -> { fieldName, columnIndex }
    const fieldLookup: Record<CashCatField, number[]> = {
        date: [],
        vendor: [],
        amount: [],
        outflow: [],
        inflow: [],
        description: [],
        category: [],
        category_group: [],
        account: [],
        type: [],
        ignore: [],
    };

    for (const mapping of mappings) {
        const idx = headers.findIndex(h => h.trim() === mapping.csvHeader.trim());
        if (idx !== -1) {
            fieldLookup[mapping.cashcatField].push(idx);
        }
    }

    const getField = (row: string[], field: CashCatField): string => {
        const indices = fieldLookup[field];
        if (indices.length === 0) return '';
        return row[indices[0]]?.trim() || '';
    };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.every(cell => !cell.trim())) continue; // skip empty rows

        const dateStr = getField(row, 'date');
        const vendor = getField(row, 'vendor');
        const amountStr = getField(row, 'amount');
        const outflowStr = getField(row, 'outflow');
        const inflowStr = getField(row, 'inflow');
        const description = getField(row, 'description');
        const categoryName = getField(row, 'category');
        const categoryGroupName = getField(row, 'category_group');
        const accountName = getField(row, 'account');

        // Parse date
        const date = parseDate(dateStr);
        if (!date) {
            errors.push({ rowIndex: i + 2, message: `Invalid date: "${dateStr}"` });
            continue;
        }

        // Parse amount
        let amount: number;
        if (amountStr) {
            const parsed = parseAmount(amountStr);
            if (parsed === null) {
                errors.push({ rowIndex: i + 2, message: `Invalid amount: "${amountStr}"` });
                continue;
            }
            amount = parsed;
        } else if (outflowStr || inflowStr) {
            const outflow = parseAmount(outflowStr) || 0;
            const inflow = parseAmount(inflowStr) || 0;
            // Outflow is money leaving (negative), inflow is money coming in (positive)
            amount = inflow - outflow;
        } else {
            errors.push({ rowIndex: i + 2, message: 'No amount found' });
            continue;
        }

        if (!vendor && !description) {
            errors.push({ rowIndex: i + 2, message: 'No vendor or description found' });
            continue;
        }

        const isStartingBalance = options?.startingBalanceVendor
            ? vendor.toLowerCase() === options.startingBalanceVendor.toLowerCase()
            : false;

        transactions.push({
            rowIndex: i + 2, // +2 for 1-indexed + header row
            date,
            vendor: vendor || description,
            amount,
            description,
            categoryName,
            categoryGroupName,
            accountName,
            isStartingBalance,
            rawRow: row,
        });
    }

    return { transactions, errors };
}
