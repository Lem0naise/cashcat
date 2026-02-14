import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getCachedUserId } from './useAuthUserId';

type Account = Database['public']['Tables']['accounts']['Row'];

// Create account mutation
export const useCreateAccount = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        networkMode: 'offlineFirst',
        mutationFn: async (params: {
            name: string;
            type: string;
            startingBalance: number;
            isFirstAccount: boolean;
        }) => {
            const userId = getCachedUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data: newAccount, error } = await supabase
                .from('accounts')
                .insert({
                    name: params.name,
                    type: params.type,
                    user_id: userId,
                    is_active: true,
                    is_default: params.isFirstAccount,
                })
                .select()
                .single();

            if (error) throw error;

            // Create starting balance transaction
            const { error: transError } = await supabase
                .from('transactions')
                .insert({
                    amount: params.startingBalance,
                    type: 'starting',
                    date: new Date().toISOString().split('T')[0],
                    vendor: 'Starting Balance',
                    account_id: newAccount.id,
                    created_at: new Date().toISOString(),
                    user_id: userId,
                });

            if (transError) throw transError;
            return newAccount;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
};

// Update account mutation
export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        networkMode: 'offlineFirst',
        mutationFn: async ({ id, updates }: {
            id: string;
            updates: { name?: string; type?: string; is_active?: boolean; is_default?: boolean };
        }) => {
            const { data, error } = await supabase
                .from('accounts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['accounts'] });
            const previous = queryClient.getQueryData<Account[]>(['accounts']);
            queryClient.setQueryData<Account[]>(['accounts'], (old) =>
                old?.map((a) => (a.id === id ? { ...a, ...updates } : a)) || []
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['accounts'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
    });
};

// Delete account mutation
export const useDeleteAccount = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        networkMode: 'offlineFirst',
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['accounts'] });
            const previous = queryClient.getQueryData<Account[]>(['accounts']);
            queryClient.setQueryData<Account[]>(['accounts'], (old) =>
                old?.filter((a) => a.id !== id) || []
            );
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['accounts'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
};

// Set default account mutation
export const useSetDefaultAccount = () => {
    const queryClient = useQueryClient();
    const supabase = createClientComponentClient<Database>();

    return useMutation({
        networkMode: 'offlineFirst',
        mutationFn: async (accountId: string) => {
            const userId = getCachedUserId();
            if (!userId) throw new Error('Not authenticated');

            // Unset all defaults
            const { error: updateAllError } = await supabase
                .from('accounts')
                .update({ is_default: false })
                .eq('user_id', userId);

            if (updateAllError) throw updateAllError;

            // Set new default
            const { error: setDefaultError } = await supabase
                .from('accounts')
                .update({ is_default: true })
                .eq('id', accountId);

            if (setDefaultError) throw setDefaultError;
        },
        onMutate: async (accountId) => {
            await queryClient.cancelQueries({ queryKey: ['accounts'] });
            const previous = queryClient.getQueryData<Account[]>(['accounts']);
            queryClient.setQueryData<Account[]>(['accounts'], (old) =>
                old?.map((a) => ({ ...a, is_default: a.id === accountId })) || []
            );
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['accounts'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
    });
};
