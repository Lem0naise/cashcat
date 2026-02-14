import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];

// Delete a transaction
const deleteTransaction = async (id: string): Promise<void> => {
    const supabase = createClientComponentClient<Database>();

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Custom hook for deleting transactions with optimistic updates
export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTransaction,
        networkMode: 'offlineFirst',

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['transactions'] });

            const previousTransactions = queryClient.getQueryData<Transaction[]>(['transactions']);

            // Optimistically remove
            queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
                old?.filter((tx) => tx.id !== id) || []
            );

            return { previousTransactions };
        },

        onError: (_err, _id, context) => {
            if (context?.previousTransactions) {
                queryClient.setQueryData(['transactions'], context.previousTransactions);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
};
