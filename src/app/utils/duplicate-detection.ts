/**
 * Duplicate Detection Utility
 * 
 * Detects potential duplicate transactions when importing CSV data.
 * Uses a combination of date, amount, and vendor similarity to identify duplicates.
 */

import type { MappedTransaction } from './import-formats';

export type ExistingTransaction = {
    id: string;
    date: string;
    amount: number;
    vendor: string;
    description: string | null;
    account_id: string | null;
};

export type DuplicateResult = {
    /** The imported transaction */
    imported: MappedTransaction;
    /** Whether this is likely a duplicate */
    isDuplicate: boolean;
    /** Confidence score from 0 to 1 */
    confidence: number;
    /** The matching existing transaction, if found */
    matchedTransaction?: ExistingTransaction;
    /** Reason for the duplicate detection */
    reason?: string;
};

/**
 * Normalize a vendor name for comparison.
 * Strips common noise, lowercases, trims, removes extra spaces.
 */
function normalizeVendor(vendor: string): string {
    return vendor
        .toLowerCase()
        .trim()
        // Remove common prefixes like "CARD PAYMENT TO" etc.
        .replace(/^(card payment to|payment to|direct debit to|standing order to|transfer to|transfer from|pos |pos transaction |card |visa |mastercard |debit )/i, '')
        // Remove reference numbers and dates in the string
        .replace(/\s+on\s+\d{2}\/\d{2}\/\d{4}.*$/i, '')
        .replace(/\s+ref[:\s].*$/i, '')
        // Remove trailing reference codes (common in UK banks)
        .replace(/\s+[A-Z0-9]{6,}$/i, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate similarity between two strings using a simple approach.
 * Returns 0 to 1 where 1 is an exact match.
 */
function stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const la = a.toLowerCase();
    const lb = b.toLowerCase();

    if (la === lb) return 1;

    // Check if one contains the other
    if (la.includes(lb) || lb.includes(la)) {
        const shorter = Math.min(la.length, lb.length);
        const longer = Math.max(la.length, lb.length);
        return shorter / longer;
    }

    // Simple bigram similarity
    const getBigrams = (str: string): Set<string> => {
        const bigrams = new Set<string>();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };

    const bigramsA = getBigrams(la);
    const bigramsB = getBigrams(lb);

    let intersection = 0;
    for (const bigram of bigramsA) {
        if (bigramsB.has(bigram)) intersection++;
    }

    const union = bigramsA.size + bigramsB.size - intersection;
    if (union === 0) return 0;

    return intersection / union;
}

/**
 * Check imported transactions against existing transactions for duplicates.
 * 
 * Detection strategy:
 * - Exact match: same date + same amount + similar vendor = very high confidence
 * - Near match: same date + same amount = moderate confidence
 * - Fuzzy match: date within 1 day + same amount + similar vendor = moderate confidence
 * 
 * This handles the case where users import overlapping date ranges
 * (e.g., "last 30 days" CSV every week).
 */
export function detectDuplicates(
    imported: MappedTransaction[],
    existing: ExistingTransaction[],
    options?: {
        /** Account ID to scope duplicate detection (null = check all) */
        accountId?: string | null;
        /** Date tolerance in days for fuzzy matching (default: 1) */
        dateTolerance?: number;
        /** Minimum confidence to flag as duplicate (default: 0.7) */
        confidenceThreshold?: number;
    }
): DuplicateResult[] {
    const dateTolerance = options?.dateTolerance ?? 1;
    const confidenceThreshold = options?.confidenceThreshold ?? 0.7;

    // Filter existing transactions by account if specified
    const scopedExisting = options?.accountId
        ? existing.filter(t => t.account_id === options.accountId)
        : existing;

    // Build a lookup by date for faster searching
    const byDate = new Map<string, ExistingTransaction[]>();
    for (const tx of scopedExisting) {
        const dateKey = tx.date;
        if (!byDate.has(dateKey)) byDate.set(dateKey, []);
        byDate.get(dateKey)!.push(tx);
    }

    // Get nearby dates for fuzzy matching.
    // Uses pure date-only arithmetic to avoid UTC vs. local-time shifts that
    // occur when mixing new Date('YYYY-MM-DD') (UTC) with getDate/setDate (local).
    const getNearbyDates = (dateStr: string): string[] => {
        const dates: string[] = [dateStr];
        const [year, month, day] = dateStr.split('-').map(Number);
        for (let d = 1; d <= dateTolerance; d++) {
            const before = new Date(Date.UTC(year, month - 1, day - d));
            dates.push(before.toISOString().split('T')[0]);

            const after = new Date(Date.UTC(year, month - 1, day + d));
            dates.push(after.toISOString().split('T')[0]);
        }
        return dates;
    };

    // Track which existing transactions have already been matched
    // This prevents a single existing transaction from matching multiple imports
    const matchedExistingIds = new Set<string>();

    return imported.map(imp => {
        let bestMatch: ExistingTransaction | undefined;
        let bestConfidence = 0;
        let bestReason = '';

        const nearbyDates = getNearbyDates(imp.date);
        const normalizedImportVendor = normalizeVendor(imp.vendor);

        for (const checkDate of nearbyDates) {
            const candidates = byDate.get(checkDate) || [];

            for (const existing of candidates) {
                if (matchedExistingIds.has(existing.id)) continue;

                // Amount must match exactly (or very close for floating point)
                const amountMatch = Math.abs(existing.amount - imp.amount) < 0.01;
                if (!amountMatch) continue;

                const normalizedExistingVendor = normalizeVendor(existing.vendor);
                const vendorSim = stringSimilarity(normalizedImportVendor, normalizedExistingVendor);
                const isExactDate = checkDate === imp.date;

                let confidence = 0;
                let reason = '';

                if (isExactDate && vendorSim >= 0.6) {
                    // Same date + same amount + similar vendor = very likely duplicate
                    confidence = 0.7 + (vendorSim * 0.3);
                    reason = `Same date, amount, and similar vendor (${Math.round(vendorSim * 100)}% match)`;
                } else if (isExactDate) {
                    // Same date + same amount but different vendor
                    // This is trickier - could be legitimate different transactions
                    confidence = 0.5;
                    reason = `Same date and amount, different vendor`;
                } else if (vendorSim >= 0.6) {
                    // Near date + same amount + similar vendor
                    confidence = 0.4 + (vendorSim * 0.2);
                    reason = `Similar date (within ${dateTolerance}d), same amount, similar vendor`;
                }

                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestMatch = existing;
                    bestReason = reason;
                }
            }
        }

        if (bestMatch && bestConfidence >= confidenceThreshold) {
            matchedExistingIds.add(bestMatch.id);
        }

        return {
            imported: imp,
            isDuplicate: bestConfidence >= confidenceThreshold,
            confidence: bestConfidence,
            matchedTransaction: bestMatch,
            reason: bestReason || undefined,
        };
    });
}

/**
 * Also detect duplicates within the imported set itself.
 * This catches cases where the CSV has duplicate rows.
 */
export function detectInternalDuplicates(transactions: MappedTransaction[]): Set<number> {
    const duplicateIndices = new Set<number>();
    const seen = new Map<string, number>();

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        // Create a fingerprint: date + amount + normalized vendor
        const key = `${tx.date}|${tx.amount.toFixed(2)}|${normalizeVendor(tx.vendor)}`;

        if (seen.has(key)) {
            duplicateIndices.add(i);
        } else {
            seen.set(key, i);
        }
    }

    return duplicateIndices;
}
