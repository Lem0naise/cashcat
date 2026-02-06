import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database, TransferWithAccounts } from '@/types/supabase';

// Fetch all transfers for the current user
const fetchTransfers = async (): Promise<TransferWithAccounts[]> => {
    const supabase = createClientComponentClient<Database>();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('transfers')
        .select(`
            *,
            from_account:accounts!transfers_from_account_id_fkey (
                id,
                name,
                type
            ),
            to_account:accounts!transfers_to_account_id_fkey (
                id,
                name,
                type
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as any[]) || [];
};

// Custom hook for fetching transfers
export const useTransfers = () => {
    return useQuery({
        queryKey: ['transfers'],
        queryFn: fetchTransfers,
    });
};

// Create transfer mutation
export const useCreateTransfer = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        mutationFn: async (transferData: {
            from_account_id: string;
            to_account_id: string;
            amount: number;
            date: string;
            description?: string;
        }) => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('transfers')
                .insert({
                    ...transferData,
                    user_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
        },
    });
};

// Update transfer mutation
export const useUpdateTransfer = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        mutationFn: async ({ id, updates }: {
            id: string;
            updates: {
                from_account_id?: string;
                to_account_id?: string;
                amount?: number;
                date?: string;
                description?: string;
            };
        }) => {
            const { data, error } = await supabase
                .from('transfers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
        },
    });
};

// Delete transfer mutation
export const useDeleteTransfer = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('transfers')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
        },
    });
};
