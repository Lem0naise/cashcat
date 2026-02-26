import { describe, it, expect } from 'vitest';
import {
    detectFormat,
    autoMapHeaders,
    applyMappings,
    IMPORT_PRESETS,
    type ColumnMapping,
} from './import-formats';

// ─── detectFormat ────────────────────────────────────────────────────────────

describe('detectFormat', () => {
    it('detects YNAB format from headers', () => {
        const headers = ['Account', 'Flag', 'Date', 'Payee', 'Category Group/Category', 'Category Group', 'Category', 'Memo', 'Outflow', 'Inflow', 'Cleared'];
        const result = detectFormat(headers);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('ynab');
    });

    it('detects generic bank format', () => {
        const headers = ['Date', 'Description', 'Amount'];
        const result = detectFormat(headers);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('generic-bank');
    });

    it('detects generic bank debit/credit format', () => {
        const headers = ['Date', 'Description', 'Debit', 'Credit'];
        const result = detectFormat(headers);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('generic-bank-debit-credit');
    });

    it('is case-insensitive', () => {
        const headers = ['date', 'description', 'amount'];
        const result = detectFormat(headers);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('generic-bank');
    });

    it('returns null for unrecognized headers', () => {
        const headers = ['Foo', 'Bar', 'Baz'];
        const result = detectFormat(headers);
        expect(result).toBeNull();
    });

    it('returns null for empty headers', () => {
        const result = detectFormat([]);
        expect(result).toBeNull();
    });

    it('matches even with extra headers present', () => {
        const headers = ['Date', 'Description', 'Amount', 'Balance', 'Reference'];
        const result = detectFormat(headers);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('generic-bank');
    });
});

// ─── autoMapHeaders ──────────────────────────────────────────────────────────

describe('autoMapHeaders', () => {
    it('maps common date headers', () => {
        const mappings = autoMapHeaders(['Date']);
        expect(mappings[0].cashcatField).toBe('date');
    });

    it('maps "Transaction Date" to date', () => {
        const mappings = autoMapHeaders(['Transaction Date']);
        expect(mappings[0].cashcatField).toBe('date');
    });

    it('maps payee/vendor headers', () => {
        const mappings = autoMapHeaders(['Payee']);
        expect(mappings[0].cashcatField).toBe('vendor');
    });

    it('maps description to vendor', () => {
        const mappings = autoMapHeaders(['Description']);
        expect(mappings[0].cashcatField).toBe('vendor');
    });

    it('maps amount headers', () => {
        const mappings = autoMapHeaders(['Amount']);
        expect(mappings[0].cashcatField).toBe('amount');
    });

    it('maps debit/credit headers', () => {
        const mappings = autoMapHeaders(['Debit', 'Credit']);
        expect(mappings[0].cashcatField).toBe('outflow');
        expect(mappings[1].cashcatField).toBe('inflow');
    });

    it('maps memo to description', () => {
        const mappings = autoMapHeaders(['Memo']);
        expect(mappings[0].cashcatField).toBe('description');
    });

    it('marks unknown headers as ignore', () => {
        const mappings = autoMapHeaders(['FooBar123']);
        expect(mappings[0].cashcatField).toBe('ignore');
    });

    it('maps multiple headers correctly', () => {
        const mappings = autoMapHeaders(['Date', 'Payee', 'Amount', 'Notes', 'Category']);
        expect(mappings.map(m => m.cashcatField)).toEqual([
            'date', 'vendor', 'amount', 'description', 'category'
        ]);
    });
});

// ─── applyMappings ───────────────────────────────────────────────────────────

describe('applyMappings', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const mappings: ColumnMapping[] = [
        { csvHeader: 'Date', cashcatField: 'date' },
        { csvHeader: 'Description', cashcatField: 'vendor' },
        { csvHeader: 'Amount', cashcatField: 'amount' },
    ];

    it('maps a simple CSV to transactions', () => {
        const rows = [
            ['2024-01-15', 'Tesco', '-45.00'],
            ['2024-01-16', 'Salary', '2000.00'],
        ];
        const result = applyMappings(headers, rows, mappings);
        expect(result.transactions.length).toBe(2);
        expect(result.errors.length).toBe(0);

        expect(result.transactions[0].date).toBe('2024-01-15');
        expect(result.transactions[0].vendor).toBe('Tesco');
        expect(result.transactions[0].amount).toBe(-45);

        expect(result.transactions[1].amount).toBe(2000);
    });

    it('reports errors for invalid dates', () => {
        const rows = [['not-a-date', 'Tesco', '-45.00']];
        const result = applyMappings(headers, rows, mappings);
        expect(result.transactions.length).toBe(0);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Invalid date');
    });

    it('reports errors for invalid amounts', () => {
        const rows = [['2024-01-15', 'Tesco', 'abc']];
        const result = applyMappings(headers, rows, mappings);
        expect(result.transactions.length).toBe(0);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Invalid amount');
    });

    it('handles separate inflow/outflow columns', () => {
        const splitHeaders = ['Date', 'Payee', 'Outflow', 'Inflow'];
        const splitMappings: ColumnMapping[] = [
            { csvHeader: 'Date', cashcatField: 'date' },
            { csvHeader: 'Payee', cashcatField: 'vendor' },
            { csvHeader: 'Outflow', cashcatField: 'outflow' },
            { csvHeader: 'Inflow', cashcatField: 'inflow' },
        ];
        const rows = [
            ['2024-01-15', 'Tesco', '45.00', ''],
            ['2024-01-16', 'Salary', '', '2000.00'],
        ];
        const result = applyMappings(splitHeaders, rows, splitMappings);
        expect(result.transactions.length).toBe(2);
        expect(result.transactions[0].amount).toBe(-45); // outflow = negative
        expect(result.transactions[1].amount).toBe(2000); // inflow = positive
    });

    it('detects starting balance vendor', () => {
        const rows = [['2024-01-01', 'Starting Balance', '500.00']];
        const result = applyMappings(headers, rows, mappings, {
            startingBalanceVendor: 'Starting Balance',
        });
        expect(result.transactions[0].isStartingBalance).toBe(true);
    });

    it('skips completely empty rows', () => {
        const rows = [
            ['2024-01-15', 'Tesco', '-45.00'],
            ['', '', ''],
            ['2024-01-16', 'Salary', '2000.00'],
        ];
        const result = applyMappings(headers, rows, mappings);
        expect(result.transactions.length).toBe(2);
    });

    it('reports error when no vendor or description is found', () => {
        const rows = [['2024-01-15', '', '100.00']];
        const result = applyMappings(headers, rows, mappings);
        expect(result.transactions.length).toBe(0);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('No vendor or description');
    });

    it('includes category and account names when mapped', () => {
        const fullHeaders = ['Date', 'Payee', 'Amount', 'Category', 'Category Group', 'Account'];
        const fullMappings: ColumnMapping[] = [
            { csvHeader: 'Date', cashcatField: 'date' },
            { csvHeader: 'Payee', cashcatField: 'vendor' },
            { csvHeader: 'Amount', cashcatField: 'amount' },
            { csvHeader: 'Category', cashcatField: 'category' },
            { csvHeader: 'Category Group', cashcatField: 'category_group' },
            { csvHeader: 'Account', cashcatField: 'account' },
        ];
        const rows = [['2024-01-15', 'Tesco', '-45.00', 'Groceries', 'Food & Drink', 'Current Account']];
        const result = applyMappings(fullHeaders, rows, fullMappings);
        expect(result.transactions[0].categoryName).toBe('Groceries');
        expect(result.transactions[0].categoryGroupName).toBe('Food & Drink');
        expect(result.transactions[0].accountName).toBe('Current Account');
    });
});

// ─── IMPORT_PRESETS ──────────────────────────────────────────────────────────

describe('IMPORT_PRESETS', () => {
    it('has at least 3 presets', () => {
        expect(IMPORT_PRESETS.length).toBeGreaterThanOrEqual(3);
    });

    it('each preset has required fields', () => {
        for (const preset of IMPORT_PRESETS) {
            expect(preset.id).toBeTruthy();
            expect(preset.name).toBeTruthy();
            expect(preset.mappings.length).toBeGreaterThan(0);
            expect(preset.detectHeaders.length).toBeGreaterThan(0);
        }
    });

    it('YNAB preset has multiAccount enabled', () => {
        const ynab = IMPORT_PRESETS.find(p => p.id === 'ynab');
        expect(ynab).toBeDefined();
        expect(ynab!.multiAccount).toBe(true);
    });

    it('YNAB preset has startingBalanceVendor', () => {
        const ynab = IMPORT_PRESETS.find(p => p.id === 'ynab');
        expect(ynab!.startingBalanceVendor).toBe('Starting Balance');
    });
});
