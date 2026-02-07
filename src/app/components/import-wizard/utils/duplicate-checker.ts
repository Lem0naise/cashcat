// ─── Duplicate Detection ─────────────────────────────────────────────────────

import type { ExistingTransaction, ParsedTransaction } from '../types';
import { normalizeVendor } from './csv-parser';

/**
 * Find indices of parsed transactions that are likely duplicates of existing ones.
 * Match criteria: same date + same vendor (normalized) + same amount (±0.01)
 */
export function findDuplicates(
    parsed: ParsedTransaction[],
    existing: ExistingTransaction[]
): Set<number> {
    const duplicateIndices = new Set<number>();

    if (existing.length === 0) return duplicateIndices;

    // Build a lookup map for existing transactions: date → array of { vendor, amount }
    const existingMap = new Map<string, { vendor: string; amount: number }[]>();
    for (const tx of existing) {
        const key = tx.date; // YYYY-MM-DD
        if (!existingMap.has(key)) {
            existingMap.set(key, []);
        }
        existingMap.get(key)!.push({
            vendor: normalizeVendor(tx.vendor),
            amount: tx.amount,
        });
    }

    for (const tx of parsed) {
        if (tx.isStartingBalance) continue; // Starting balances handled separately

        const candidates = existingMap.get(tx.date);
        if (!candidates) continue;

        const normalizedVendor = normalizeVendor(tx.vendor);

        const isDup = candidates.some(existing =>
            existing.vendor === normalizedVendor &&
            Math.abs(existing.amount - tx.amount) < 0.015
        );

        if (isDup) {
            duplicateIndices.add(tx.index);
        }
    }

    return duplicateIndices;
}
