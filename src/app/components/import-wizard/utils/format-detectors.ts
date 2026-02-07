// ─── CSV Format Detection ────────────────────────────────────────────────────
// Detects YNAB, Starling, or custom CSV formats from headers.

import type { ColumnMapping, DetectedFormat } from '../types';

type DetectionResult = {
    format: DetectedFormat;
    mapping: ColumnMapping;
    confidence: number; // 0-1
};

/**
 * Detect the CSV format from headers and return the best mapping.
 */
export function detectFormat(headers: string[]): DetectionResult {
    const normalized = headers.map(h => h.toLowerCase().trim());

    const ynab = detectYNAB(normalized, headers);
    if (ynab && ynab.confidence >= 0.8) return ynab;

    const starling = detectStarling(normalized, headers);
    if (starling && starling.confidence >= 0.8) return starling;

    // Try generic detection
    const generic = detectGeneric(normalized, headers);
    if (generic && generic.confidence >= 0.5) return generic;

    // Fall back to custom with best-guess mapping
    return {
        format: 'custom',
        mapping: buildBestGuessMapping(normalized),
        confidence: 0,
    };
}

/**
 * Detect YNAB format.
 * Required columns: Date, Payee, Inflow, Outflow
 * Optional: Category, Memo
 */
function detectYNAB(normalized: string[], original: string[]): DetectionResult | null {
    const dateIdx = findColumn(normalized, ['date']);
    const payeeIdx = findColumn(normalized, ['payee']);
    const inflowIdx = findColumn(normalized, ['inflow']);
    const outflowIdx = findColumn(normalized, ['outflow']);

    if (dateIdx === -1 || payeeIdx === -1 || inflowIdx === -1 || outflowIdx === -1) {
        return null;
    }

    const memoIdx = findColumn(normalized, ['memo', 'notes']);
    const categoryIdx = findColumn(normalized, ['category', 'category group/category', 'category group']);

    return {
        format: 'ynab',
        mapping: {
            date: dateIdx,
            vendor: payeeIdx,
            amount: -1, // YNAB uses inflow/outflow
            inflow: inflowIdx,
            outflow: outflowIdx,
            description: memoIdx !== -1 ? memoIdx : undefined,
            category: categoryIdx !== -1 ? categoryIdx : undefined,
        },
        confidence: 0.95,
    };
}

/**
 * Detect Starling Bank format.
 * Required columns: Date, Counter Party, Amount (GBP)
 * Optional: Reference, Spending Category
 */
function detectStarling(normalized: string[], original: string[]): DetectionResult | null {
    const dateIdx = findColumn(normalized, ['date']);
    const counterPartyIdx = findColumn(normalized, ['counter party', 'counterparty']);
    const amountIdx = normalized.findIndex(h =>
        h.includes('amount') && (h.includes('gbp') || h.includes('eur') || h.includes('usd'))
    );

    if (dateIdx === -1 || counterPartyIdx === -1 || amountIdx === -1) {
        // Try looser match for Starling-like formats
        if (dateIdx === -1 || counterPartyIdx === -1) return null;
        const looseAmountIdx = findColumn(normalized, ['amount']);
        if (looseAmountIdx === -1) return null;

        const refIdx = findColumn(normalized, ['reference', 'ref', 'memo']);
        const categoryIdx = findColumn(normalized, ['spending category', 'category']);

        return {
            format: 'starling',
            mapping: {
                date: dateIdx,
                vendor: counterPartyIdx,
                amount: looseAmountIdx,
                description: refIdx !== -1 ? refIdx : undefined,
                category: categoryIdx !== -1 ? categoryIdx : undefined,
            },
            confidence: 0.7,
        };
    }

    const refIdx = findColumn(normalized, ['reference', 'ref', 'memo']);
    const categoryIdx = findColumn(normalized, ['spending category', 'category']);

    return {
        format: 'starling',
        mapping: {
            date: dateIdx,
            vendor: counterPartyIdx,
            amount: amountIdx,
            description: refIdx !== -1 ? refIdx : undefined,
            category: categoryIdx !== -1 ? categoryIdx : undefined,
        },
        confidence: 0.9,
    };
}

/**
 * Try to detect a generic CSV with common column names.
 */
function detectGeneric(normalized: string[], original: string[]): DetectionResult | null {
    const dateIdx = findColumn(normalized, ['date', 'transaction date', 'trans date', 'posting date', 'value date']);
    const amountIdx = findColumn(normalized, ['amount', 'value', 'debit/credit', 'transaction amount']);

    if (dateIdx === -1 || amountIdx === -1) return null;

    const vendorIdx = findColumn(normalized, [
        'description', 'payee', 'vendor', 'merchant', 'name', 'counter party',
        'counterparty', 'transaction description', 'details', 'narrative',
    ]);
    const descIdx = findColumn(normalized, ['memo', 'notes', 'reference', 'ref', 'additional info']);
    const categoryIdx = findColumn(normalized, ['category', 'spending category', 'type']);

    // If we can't find a vendor column, use the first text-like column that isn't date or amount
    const finalVendorIdx = vendorIdx !== -1 ? vendorIdx : findFirstUnused(normalized, [dateIdx, amountIdx, descIdx, categoryIdx]);

    if (finalVendorIdx === -1) return null;

    return {
        format: 'custom',
        mapping: {
            date: dateIdx,
            vendor: finalVendorIdx,
            amount: amountIdx,
            description: descIdx !== -1 ? descIdx : undefined,
            category: categoryIdx !== -1 ? categoryIdx : undefined,
        },
        confidence: 0.6,
    };
}

function buildBestGuessMapping(normalized: string[]): ColumnMapping {
    return {
        date: Math.max(0, findColumn(normalized, ['date']) !== -1 ? findColumn(normalized, ['date']) : 0),
        vendor: Math.max(0, findColumn(normalized, ['description', 'payee', 'vendor', 'name']) !== -1
            ? findColumn(normalized, ['description', 'payee', 'vendor', 'name']) : 1),
        amount: Math.max(0, findColumn(normalized, ['amount', 'value']) !== -1
            ? findColumn(normalized, ['amount', 'value']) : 2),
    };
}

function findColumn(normalized: string[], candidates: string[]): number {
    for (const candidate of candidates) {
        const idx = normalized.findIndex(h => h === candidate);
        if (idx !== -1) return idx;
    }
    // Partial match
    for (const candidate of candidates) {
        const idx = normalized.findIndex(h => h.includes(candidate));
        if (idx !== -1) return idx;
    }
    return -1;
}

function findFirstUnused(normalized: string[], usedIndices: (number | undefined)[]): number {
    const used = new Set(usedIndices.filter((i): i is number => i !== undefined && i !== -1));
    for (let i = 0; i < normalized.length; i++) {
        if (!used.has(i)) return i;
    }
    return -1;
}
