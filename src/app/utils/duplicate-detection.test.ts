import { describe, it, expect } from 'vitest';
import { detectDuplicates, detectInternalDuplicates, type ExistingTransaction } from './duplicate-detection';
import type { MappedTransaction } from './import-formats';

// Helper to make a MappedTransaction
function makeTx(overrides: Partial<MappedTransaction> = {}): MappedTransaction {
    return {
        rowIndex: 1,
        date: '2024-01-15',
        vendor: 'Tesco',
        amount: -45.00,
        description: '',
        categoryName: '',
        categoryGroupName: '',
        accountName: '',
        isStartingBalance: false,
        rawRow: [],
        ...overrides,
    };
}

// Helper to make an ExistingTransaction
function makeExisting(overrides: Partial<ExistingTransaction> = {}): ExistingTransaction {
    return {
        id: 'existing-1',
        date: '2024-01-15',
        amount: -45.00,
        vendor: 'Tesco',
        description: null,
        account_id: 'acc-1',
        ...overrides,
    };
}

// ─── detectDuplicates ────────────────────────────────────────────────────────

describe('detectDuplicates', () => {
    it('flags exact duplicates (same date, amount, vendor)', () => {
        const imported = [makeTx()];
        const existing = [makeExisting()];
        const results = detectDuplicates(imported, existing);

        expect(results.length).toBe(1);
        expect(results[0].isDuplicate).toBe(true);
        expect(results[0].confidence).toBeGreaterThanOrEqual(0.7);
        expect(results[0].matchedTransaction?.id).toBe('existing-1');
    });

    it('does not flag unrelated transactions', () => {
        const imported = [makeTx({ vendor: 'Tesco', amount: -45 })];
        const existing = [makeExisting({ vendor: 'Sainsbury', amount: -100, id: 'e1' })];
        const results = detectDuplicates(imported, existing);
        expect(results[0].isDuplicate).toBe(false);
    });

    it('does not flag different amounts on same date', () => {
        const imported = [makeTx({ amount: -45 })];
        const existing = [makeExisting({ amount: -50 })];
        const results = detectDuplicates(imported, existing);
        expect(results[0].isDuplicate).toBe(false);
    });

    it('handles fuzzy date matching within tolerance', () => {
        const imported = [makeTx({ date: '2024-01-16' })]; // One day off
        const existing = [makeExisting({ date: '2024-01-15' })];
        const results = detectDuplicates(imported, existing, { dateTolerance: 1 });
        // With fuzzy date + same amount + same vendor, should get some confidence
        // but may not exceed threshold since date is off
        expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('does not flag when date is outside tolerance', () => {
        const imported = [makeTx({ date: '2024-01-20' })]; // 5 days off
        const existing = [makeExisting({ date: '2024-01-15' })];
        const results = detectDuplicates(imported, existing, { dateTolerance: 1 });
        expect(results[0].isDuplicate).toBe(false);
    });

    it('handles vendor normalization (strips "CARD PAYMENT TO" prefix)', () => {
        const imported = [makeTx({ vendor: 'Tesco' })];
        const existing = [makeExisting({ vendor: 'CARD PAYMENT TO Tesco' })];
        const results = detectDuplicates(imported, existing);
        expect(results[0].isDuplicate).toBe(true);
    });

    it('prevents the same existing transaction from matching multiple imports', () => {
        const imported = [
            makeTx({ vendor: 'Tesco', amount: -45 }),
            makeTx({ vendor: 'Tesco', amount: -45 }),
        ];
        const existing = [makeExisting({ vendor: 'Tesco', amount: -45 })];
        const results = detectDuplicates(imported, existing);

        const duplicates = results.filter(r => r.isDuplicate);
        // Only one should be matched, the other should be unmatched
        expect(duplicates.length).toBe(1);
    });

    it('scopes detection to specific account when accountId is provided', () => {
        const imported = [makeTx()];
        const existing = [makeExisting({ account_id: 'acc-other' })];
        const results = detectDuplicates(imported, existing, { accountId: 'acc-1' });
        // Scoped to acc-1 but existing is in acc-other, so no match
        expect(results[0].isDuplicate).toBe(false);
    });

    it('returns results for all imported transactions', () => {
        const imported = [
            makeTx({ vendor: 'Tesco', amount: -45 }),
            makeTx({ vendor: 'Sainsbury', amount: -30 }),
            makeTx({ vendor: 'Amazon', amount: -100 }),
        ];
        const results = detectDuplicates(imported, []);
        expect(results.length).toBe(3);
        results.forEach(r => expect(r.isDuplicate).toBe(false));
    });

    it('custom confidence threshold works', () => {
        const imported = [makeTx()];
        const existing = [makeExisting()];
        // With a very high threshold, even exact matches might not pass
        const results = detectDuplicates(imported, existing, { confidenceThreshold: 1.1 });
        expect(results[0].isDuplicate).toBe(false);
    });
});

// ─── detectInternalDuplicates ────────────────────────────────────────────────

describe('detectInternalDuplicates', () => {
    it('detects duplicate rows within the import', () => {
        const transactions = [
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
        ];
        const dupes = detectInternalDuplicates(transactions);
        // The second one (index 1) should be flagged
        expect(dupes.has(1)).toBe(true);
        expect(dupes.has(0)).toBe(false);
    });

    it('does not flag different transactions', () => {
        const transactions = [
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
            makeTx({ date: '2024-01-15', vendor: 'Sainsbury', amount: -30 }),
        ];
        const dupes = detectInternalDuplicates(transactions);
        expect(dupes.size).toBe(0);
    });

    it('flags multiple duplicates of the same row', () => {
        const transactions = [
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
        ];
        const dupes = detectInternalDuplicates(transactions);
        expect(dupes.has(0)).toBe(false); // first occurrence is not flagged
        expect(dupes.has(1)).toBe(true);
        expect(dupes.has(2)).toBe(true);
    });

    it('returns empty set for empty input', () => {
        const dupes = detectInternalDuplicates([]);
        expect(dupes.size).toBe(0);
    });

    it('considers amount precision (same amount after toFixed(2))', () => {
        const transactions = [
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45.001 }),
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45.001 }),
        ];
        const dupes = detectInternalDuplicates(transactions);
        expect(dupes.has(1)).toBe(true);
    });

    it('treats different amounts as distinct', () => {
        const transactions = [
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -45 }),
            makeTx({ date: '2024-01-15', vendor: 'Tesco', amount: -46 }),
        ];
        const dupes = detectInternalDuplicates(transactions);
        expect(dupes.size).toBe(0);
    });
});
