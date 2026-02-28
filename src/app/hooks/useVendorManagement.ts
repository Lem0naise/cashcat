import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import { getCachedUserId } from './useAuthUserId';
import type { Database } from '@/types/supabase';

type Vendor = Database['public']['Tables']['vendors']['Row'];

/**
 * Rename a vendor (updates both the vendors table name and all transaction.vendor text fields).
 */
const renameVendor = async ({ vendorId, newName }: { vendorId: string; newName: string }) => {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    // 1. Update the vendors table
    const { error: vendorError } = await supabase
        .from('vendors')
        .update({ name: newName })
        .eq('id', vendorId)
        .eq('user_id', userId);
    if (vendorError) throw vendorError;

    // 2. Update the raw vendor text on all associated transactions
    const { error: txError } = await supabase
        .from('transactions')
        .update({ vendor: newName })
        .eq('vendor_id', vendorId)
        .eq('user_id', userId);
    if (txError) throw txError;
};

/**
 * Merge sourceVendorId into targetVendorId.
 * All transactions that reference the source (by vendor_id OR by vendor text) are
 * re-pointed to the target, then the source vendor row is deleted.
 */
const mergeVendors = async ({
    sourceVendorId,
    targetVendorId,
    sourceVendorName,
    targetVendorName,
}: {
    sourceVendorId: string;
    targetVendorId: string;
    sourceVendorName: string;
    targetVendorName: string;
}) => {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    // Re-point transactions linked by FK
    const { error: fkError } = await supabase
        .from('transactions')
        .update({ vendor_id: targetVendorId, vendor: targetVendorName })
        .eq('vendor_id', sourceVendorId)
        .eq('user_id', userId);
    if (fkError) throw fkError;

    // Re-point transactions linked only by text (vendor_id is null)
    const { error: textError } = await supabase
        .from('transactions')
        .update({ vendor: targetVendorName })
        .eq('vendor', sourceVendorName)
        .is('vendor_id', null)
        .eq('user_id', userId);
    if (textError) throw textError;

    // Delete the source vendor row
    const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', sourceVendorId)
        .eq('user_id', userId);
    if (deleteError) throw deleteError;
};

/**
 * Delete a vendor and optionally clear vendor_id from its transactions (keeps the raw text).
 */
const deleteVendor = async ({ vendorId }: { vendorId: string }) => {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    // Null out vendor_id on linked transactions (keeps the raw vendor text)
    const { error: txError } = await supabase
        .from('transactions')
        .update({ vendor_id: null })
        .eq('vendor_id', vendorId)
        .eq('user_id', userId);
    if (txError) throw txError;

    // Delete the vendor row
    const { error: vendorError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId)
        .eq('user_id', userId);
    if (vendorError) throw vendorError;
};

/**
 * Delete all vendors that have no linked transactions (vendor_id FK).
 * "Orphan" vendors — they exist in the vendors table but no transaction points to them.
 */
const pruneOrphanVendors = async ({ vendorIds }: { vendorIds: string[] }) => {
    if (vendorIds.length === 0) return;
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('vendors')
        .delete()
        .in('id', vendorIds)
        .eq('user_id', userId);
    if (error) throw error;
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

const invalidationKeys = ['vendors', 'transactions'] as const;

export const useRenameVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: renameVendor,
        onSettled: () => {
            invalidationKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        },
    });
};

export const useMergeVendors = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: mergeVendors,
        onSettled: () => {
            invalidationKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        },
    });
};

export const useDeleteVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteVendor,
        onSettled: () => {
            invalidationKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        },
    });
};

export const usePruneOrphanVendors = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pruneOrphanVendors,
        onSettled: () => {
            invalidationKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        },
    });
};
