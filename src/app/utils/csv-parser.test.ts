import { describe, it, expect } from 'vitest';
import { parseCSV, detectDelimiter, parseDate, parseAmount } from './csv-parser';

// ─── parseCSV ────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
    it('parses a simple CSV with headers and rows', () => {
        const csv = 'Name,Age,City\nAlice,30,London\nBob,25,Paris';
        const result = parseCSV(csv);
        expect(result.headers).toEqual(['Name', 'Age', 'City']);
        expect(result.rows).toEqual([
            ['Alice', '30', 'London'],
            ['Bob', '25', 'Paris'],
        ]);
    });

    it('handles quoted fields containing commas', () => {
        const csv = 'Name,Description\nAlice,"Has a cat, a dog"\nBob,"Lives in Paris, France"';
        const result = parseCSV(csv);
        expect(result.rows[0]).toEqual(['Alice', 'Has a cat, a dog']);
        expect(result.rows[1]).toEqual(['Bob', 'Lives in Paris, France']);
    });

    it('handles escaped quotes (double quote)', () => {
        const csv = 'Name,Quote\nAlice,"She said ""hello"""\nBob,"A ""test"""';
        const result = parseCSV(csv);
        expect(result.rows[0]).toEqual(['Alice', 'She said "hello"']);
        expect(result.rows[1]).toEqual(['Bob', 'A "test"']);
    });

    it('handles Windows-style \\r\\n line endings', () => {
        const csv = 'Name,Age\r\nAlice,30\r\nBob,25';
        const result = parseCSV(csv);
        expect(result.headers).toEqual(['Name', 'Age']);
        expect(result.rows.length).toBe(2);
    });

    it('handles standalone \\r line endings', () => {
        const csv = 'Name,Age\rAlice,30\rBob,25';
        const result = parseCSV(csv);
        expect(result.headers).toEqual(['Name', 'Age']);
        expect(result.rows.length).toBe(2);
    });

    it('uses a custom delimiter', () => {
        const csv = 'Name;Age;City\nAlice;30;London';
        const result = parseCSV(csv, ';');
        expect(result.headers).toEqual(['Name', 'Age', 'City']);
        expect(result.rows[0]).toEqual(['Alice', '30', 'London']);
    });

    it('returns empty result for empty input', () => {
        const result = parseCSV('');
        expect(result.headers).toEqual([]);
        expect(result.rows).toEqual([]);
    });

    it('returns empty result for whitespace-only input', () => {
        const result = parseCSV('   \n\n  ');
        expect(result.headers).toEqual([]);
        expect(result.rows).toEqual([]);
    });

    it('filters out completely empty rows', () => {
        const csv = 'Name,Age\nAlice,30\n\nBob,25\n\n';
        const result = parseCSV(csv);
        expect(result.rows.length).toBe(2);
    });

    it('trims whitespace from field values', () => {
        const csv = 'Name , Age \n Alice , 30 ';
        const result = parseCSV(csv);
        expect(result.headers).toEqual(['Name', 'Age']);
        expect(result.rows[0]).toEqual(['Alice', '30']);
    });

    it('handles tab delimiter', () => {
        const csv = 'Name\tAge\nAlice\t30';
        const result = parseCSV(csv, '\t');
        expect(result.headers).toEqual(['Name', 'Age']);
        expect(result.rows[0]).toEqual(['Alice', '30']);
    });
});

// ─── detectDelimiter ─────────────────────────────────────────────────────────

describe('detectDelimiter', () => {
    it('detects comma as delimiter', () => {
        expect(detectDelimiter('Name,Age,City\nAlice,30,London')).toBe(',');
    });

    it('detects semicolon as delimiter', () => {
        expect(detectDelimiter('Name;Age;City\nAlice;30;London')).toBe(';');
    });

    it('detects tab as delimiter', () => {
        expect(detectDelimiter('Name\tAge\tCity\nAlice\t30\tLondon')).toBe('\t');
    });

    it('detects pipe as delimiter', () => {
        expect(detectDelimiter('Name|Age|City\nAlice|30|London')).toBe('|');
    });

    it('ignores delimiters inside quoted strings', () => {
        // The comma inside quotes should not be counted
        expect(detectDelimiter('"Name,Full";Age;City')).toBe(';');
    });

    it('defaults to comma for ambiguous input', () => {
        expect(detectDelimiter('single_column')).toBe(',');
    });
});

// ─── parseDate ───────────────────────────────────────────────────────────────

describe('parseDate', () => {
    it('returns YYYY-MM-DD as-is', () => {
        expect(parseDate('2024-01-15')).toBe('2024-01-15');
    });

    it('converts YYYY/MM/DD to YYYY-MM-DD', () => {
        expect(parseDate('2024/01/15')).toBe('2024-01-15');
    });

    it('parses DD/MM/YYYY (international standard)', () => {
        // 15 > 12, so first number must be day
        expect(parseDate('15/01/2024')).toBe('2024-01-15');
    });

    it('parses DD/MM/YYYY when ambiguous (defaults to DD/MM)', () => {
        // Both could be day or month, defaults to DD/MM/YYYY
        expect(parseDate('05/06/2024')).toBe('2024-06-05');
    });

    it('handles MM/DD/YYYY when second number > 12', () => {
        // 13 > 12 so second number must be day, first is month
        expect(parseDate('01/13/2024')).toBe('2024-01-13');
    });

    it('parses DD.MM.YYYY (European dot format)', () => {
        expect(parseDate('15.01.2024')).toBe('2024-01-15');
    });

    it('parses DD-MM-YYYY', () => {
        expect(parseDate('15-01-2024')).toBe('2024-01-15');
    });

    it('returns null for empty string', () => {
        expect(parseDate('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
        expect(parseDate('   ')).toBeNull();
    });

    it('trims whitespace', () => {
        expect(parseDate('  2024-01-15  ')).toBe('2024-01-15');
    });

    it('handles single-digit day and month in slash format', () => {
        expect(parseDate('1/2/2024')).toBe('2024-02-01');
    });
});

// ─── parseAmount ─────────────────────────────────────────────────────────────

describe('parseAmount', () => {
    it('parses a simple positive number', () => {
        expect(parseAmount('100.50')).toBe(100.50);
    });

    it('parses a negative number with minus sign', () => {
        expect(parseAmount('-50.25')).toBe(-50.25);
    });

    it('parses amount with GBP symbol', () => {
        expect(parseAmount('£1234.56')).toBe(1234.56);
    });

    it('parses amount with USD symbol', () => {
        expect(parseAmount('$99.99')).toBe(99.99);
    });

    it('parses amount with EUR symbol', () => {
        expect(parseAmount('€50.00')).toBe(50.00);
    });

    it('strips currency symbols from negative amounts', () => {
        expect(parseAmount('-£45.00')).toBe(-45.00);
    });

    it('parses parenthesized negative (accounting format)', () => {
        expect(parseAmount('(100.00)')).toBe(-100.00);
    });

    it('parses parenthesized negative with currency symbol', () => {
        expect(parseAmount('($100.00)')).toBe(-100.00);
    });

    it('handles thousand separators (standard format)', () => {
        expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    it('handles European format (comma as decimal)', () => {
        expect(parseAmount('1.234,56')).toBe(1234.56);
    });

    it('handles simple European decimal (no thousands)', () => {
        expect(parseAmount('100,50')).toBe(100.50);
    });

    it('returns null for empty string', () => {
        expect(parseAmount('')).toBeNull();
    });

    it('returns null for whitespace', () => {
        expect(parseAmount('  ')).toBeNull();
    });

    it('returns null for non-numeric text', () => {
        expect(parseAmount('abc')).toBeNull();
    });

    it('handles whitespace around the number', () => {
        expect(parseAmount('  100.50  ')).toBe(100.50);
    });

    it('handles amount with spaces inside (e.g., "£ 100.50")', () => {
        expect(parseAmount('£ 100.50')).toBe(100.50);
    });
});
