import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import { getCachedUserId } from './useAuthUserId';
import type { Database } from '@/types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionUpdate = Partial<Database['public']['Tables']['transactions']['Update']>;

// ─── Bulk update (set same field(s) on many transactions) ─────────────────────

interface BulkUpdateParams {
    ids: string[];
    updates: TransactionUpdate;
}

const bulkUpdateTransactions = async ({ ids, updates }: BulkUpdateParams): Promise<void> => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('transactions')
        .update(updates)
        .in('id', ids)
        .eq('user_id', userId);

    if (error) throw error;
};

// ─── Bulk delete ──────────────────────────────────────────────────────────────

const bulkDeleteTransactions = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids)
        .eq('user_id', userId);

    if (error) throw error;
};

// ─── Set category for all transactions from a given vendor ────────────────────

interface SetVendorCategoryParams {
    /** Raw vendor name (text field on transaction) */
    vendorName: string;
    /** vendor_id FK (may be null for text-only vendors) */
    vendorId: string | null;
    categoryId: string;
}

const setVendorCategory = async ({
    vendorName,
    vendorId,
    categoryId,
}: SetVendorCategoryParams): Promise<void> => {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    // Update by vendor_id FK when available
    if (vendorId) {
        const { error } = await supabase
            .from('transactions')
            .update({ category_id: categoryId })
            .eq('vendor_id', vendorId)
            .eq('user_id', userId);
        if (error) throw error;
    }

    // Also update by text for transactions that share the name but have no FK
    const { error: textError } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('vendor', vendorName)
        .is('vendor_id', null)
        .eq('user_id', userId);
    if (textError) throw textError;
};

// ─── Bulk reassign vendor (change vendor on selected transactions) ─────────────

interface BulkReassignVendorParams {
    ids: string[];
    vendorId: string | null;
    vendorName: string;
}

const bulkReassignVendor = async ({
    ids,
    vendorId,
    vendorName,
}: BulkReassignVendorParams): Promise<void> => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('transactions')
        .update({ vendor_id: vendorId, vendor: vendorName })
        .in('id', ids)
        .eq('user_id', userId);

    if (error) throw error;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
};

export const useBulkUpdateTransactions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkUpdateTransactions,
        onMutate: async ({ ids, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['transactions'] });
            const prev = queryClient.getQueryData<Transaction[]>(['transactions']);
            queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
                old?.map((tx) => (ids.includes(tx.id) ? { ...tx, ...updates } : tx)) ?? []
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['transactions'], ctx.prev);
        },
        onSettled: () => invalidate(queryClient),
    });
};

export const useBulkDeleteTransactions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkDeleteTransactions,
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['transactions'] });
            const prev = queryClient.getQueryData<Transaction[]>(['transactions']);
            queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
                old?.filter((tx) => !ids.includes(tx.id)) ?? []
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['transactions'], ctx.prev);
        },
        onSettled: () => invalidate(queryClient),
    });
};

export const useSetVendorCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setVendorCategory,
        onSettled: () => invalidate(queryClient),
    });
};

export const useBulkReassignVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkReassignVendor,
        onMutate: async ({ ids, vendorId, vendorName }) => {
            await queryClient.cancelQueries({ queryKey: ['transactions'] });
            const prev = queryClient.getQueryData<Transaction[]>(['transactions']);
            queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
                old?.map((tx) =>
                    ids.includes(tx.id) ? { ...tx, vendor_id: vendorId, vendor: vendorName } : tx
                ) ?? []
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['transactions'], ctx.prev);
        },
        onSettled: () => invalidate(queryClient),
    });
};
