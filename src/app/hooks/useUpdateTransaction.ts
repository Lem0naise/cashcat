import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionUpdate = Partial<Database['public']['Tables']['transactions']['Update']>;

interface UpdateTransactionParams {
    id: string;
    updates: TransactionUpdate;
}

// Update an existing transaction
const updateTransaction = async ({ id, updates }: UpdateTransactionParams): Promise<Transaction> => {
    const supabase = createClientComponentClient<Database>();

    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Custom hook for updating transactions with optimistic updates
export const useUpdateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ['updateTransaction'],
        mutationFn: updateTransaction,
        networkMode: 'offlineFirst',

        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['transactions'] });

            const previousTransactions = queryClient.getQueryData<Transaction[]>(['transactions']);

            // Optimistically update
            queryClient.setQueryData<Transaction[]>(['transactions'], (old) =>
                old?.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)) || []
            );

            return { previousTransactions };
        },

        onError: (err, _variables, context) => {
            console.log("Mutation error: " + err)
            if (context?.previousTransactions) {
                queryClient.setQueryData(['transactions'], context.previousTransactions);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
};
