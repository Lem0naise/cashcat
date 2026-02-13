// Vendor Matching Engine
// Fuzzy-matches Lunch Flow merchant names to existing CashCat vendors
// and stores learned mappings for future imports.

import { SupabaseClient } from '@supabase/supabase-js';

// Common noise words/suffixes in bank transaction merchant names
const NOISE_PATTERNS = [
    /\bBANK\s*PAYMENT\b/i,
    /\bCARD\s*PAYMENT\b/i,
    /\bDIRECT\s*DEBIT\b/i,
    /\bSTANDING\s*ORDER\b/i,
    /\bFASTER\s*PAYMENT\b/i,
    /\bONLINE\s*PAYMENT\b/i,
    /\bCONTACTLESS\b/i,
    /\bPAYMENT\s*TO\b/i,
    /\bPAYMENT\s*FROM\b/i,
    /\bREF\s*[:.]?\s*\S+/i,
    /\bVIA\s+\w+/i,
    /\b(LTD|LIMITED|PLC|INC|LLC|CO)\b\.?/i,
    /\b(GB|UK|US)\b/i,
    /\d{2}\/\d{2}\/?\d{0,4}/,  // Date patterns
    /\*+\d+/,                    // Card number fragments like *1234
    /\s{2,}/g,                   // Multiple spaces
];

export type ExistingVendor = {
    id: string;
    name: string;
};

export type VendorMapping = {
    id: string;
    user_id: string;
    lunchflow_name: string;
    vendor_id: string;
    created_at: string;
};

/**
 * Normalize a raw merchant name by removing noise words, trimming, and title-casing.
 */
export function normalizeVendorName(raw: string): string {
    let name = raw.trim();

    for (const pattern of NOISE_PATTERNS) {
        name = name.replace(pattern, '');
    }

    // Collapse whitespace and trim
    name = name.replace(/\s+/g, ' ').trim();

    // Title case
    name = name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return name || raw.trim(); // Fallback to original if nothing left
}

/**
 * Calculate similarity ratio between two strings (0.0 to 1.0).
 * Uses a simple normalized inclusion + Levenshtein-like approach.
 */
export function stringSimilarity(a: string, b: string): number {
    const la = a.toLowerCase();
    const lb = b.toLowerCase();

    // Exact match
    if (la === lb) return 1.0;

    // One contains the other
    if (la.includes(lb) || lb.includes(la)) {
        const shorter = Math.min(la.length, lb.length);
        const longer = Math.max(la.length, lb.length);
        return shorter / longer;
    }

    // Levenshtein distance
    const dist = levenshteinDistance(la, lb);
    const maxLen = Math.max(la.length, lb.length);
    if (maxLen === 0) return 1.0;

    return 1.0 - dist / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[m][n];
}

const MATCH_THRESHOLD = 0.7; // 70% similarity = auto-match

/**
 * Find the best matching vendor from a list.
 * Returns the vendor and similarity score, or null if no good match.
 */
export function findBestVendorMatch(
    normalizedName: string,
    existingVendors: ExistingVendor[]
): { vendor: ExistingVendor; score: number } | null {
    let bestMatch: { vendor: ExistingVendor; score: number } | null = null;

    for (const vendor of existingVendors) {
        const score = stringSimilarity(normalizedName, vendor.name);
        if (score >= MATCH_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { vendor, score };
        }
    }

    return bestMatch;
}

/**
 * Full pipeline: check stored mapping → fuzzy match → create new vendor.
 * Returns the vendor_id and vendor name to use.
 */
export async function getOrCreateVendorMapping(
    userId: string,
    lfMerchantName: string,
    existingVendors: ExistingVendor[],
    supabase: SupabaseClient
): Promise<{ vendorId: string; vendorName: string; isNew: boolean }> {

    // 1. Check for stored mapping
    const { data: existingMapping } = await supabase
        .from('vendor_mappings')
        .select('vendor_id')
        .eq('user_id', userId)
        .eq('lunchflow_name', lfMerchantName)
        .single();

    if (existingMapping) {
        const matchedVendor = existingVendors.find(v => v.id === existingMapping.vendor_id);
        if (matchedVendor) {
            return { vendorId: matchedVendor.id, vendorName: matchedVendor.name, isNew: false };
        }
    }

    // 2. Try fuzzy match
    const normalized = normalizeVendorName(lfMerchantName);
    const fuzzyMatch = findBestVendorMatch(normalized, existingVendors);

    if (fuzzyMatch) {
        // Store the mapping for future use
        await supabase
            .from('vendor_mappings')
            .insert({
                user_id: userId,
                lunchflow_name: lfMerchantName,
                vendor_id: fuzzyMatch.vendor.id,
            })
            .select()
            .single();

        return { vendorId: fuzzyMatch.vendor.id, vendorName: fuzzyMatch.vendor.name, isNew: false };
    }

    // 3. Create new vendor
    const { data: newVendor, error } = await supabase
        .from('vendors')
        .insert({
            name: normalized,
            user_id: userId,
        })
        .select('id, name')
        .single();

    if (error || !newVendor) {
        // Fallback: use the raw name without a vendor_id
        console.error('Failed to create vendor:', error);
        return { vendorId: '', vendorName: normalized, isNew: true };
    }

    // Store the mapping
    await supabase
        .from('vendor_mappings')
        .insert({
            user_id: userId,
            lunchflow_name: lfMerchantName,
            vendor_id: newVendor.id,
        })
        .select()
        .single();

    return { vendorId: newVendor.id, vendorName: newVendor.name, isNew: true };
}
