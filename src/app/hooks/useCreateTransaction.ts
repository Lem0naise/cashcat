import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getCachedUserId } from './useAuthUserId';

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

// Create a new transaction
const createTransaction = async (newTransaction: TransactionInsert): Promise<Transaction> => {
    const supabase = createClientComponentClient<Database>();
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('transactions')
        .insert({ ...newTransaction, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Custom hook for creating transactions with optimistic updates
export const useCreateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTransaction,
        networkMode: 'offlineFirst',

        // Optimistic update - immediately add to cache
        onMutate: async (newTransaction) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['transactions'] });

            // Snapshot the previous value
            const previousTransactions = queryClient.getQueryData<Transaction[]>(['transactions']);

            // Optimistically update to the new value
            queryClient.setQueryData<Transaction[]>(['transactions'], (old) => [
                {
                    ...newTransaction,
                    id: `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                } as Transaction,
                ...(old || []),
            ]);

            return { previousTransactions };
        },

        // Rollback on error
        onError: (_err, _newTransaction, context) => {
            if (context?.previousTransactions) {
                queryClient.setQueryData(['transactions'], context.previousTransactions);
            }
        },

        // Always refetch after mutation settles
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
};
