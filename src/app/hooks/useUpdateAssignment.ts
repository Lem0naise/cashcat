import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';

type Assignment = Database['public']['Tables']['assignments']['Row'];

interface UpdateAssignmentParams {
    categoryId: string;
    month: string;
    assigned: number;
}

// Upsert an assignment (create or update)
const updateAssignment = async ({ categoryId, month, assigned }: UpdateAssignmentParams): Promise<Assignment> => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('assignments')
        .upsert({
            category_id: categoryId,
            month: month,
            assigned: assigned,
            user_id: user.id,
        }, { onConflict: 'category_id,month' })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Custom hook for updating assignments with optimistic updates
export const useUpdateAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateAssignment,

        onMutate: async ({ categoryId, month, assigned }) => {
            await queryClient.cancelQueries({ queryKey: ['assignments'] });

            const previousAssignments = queryClient.getQueryData<Assignment[]>(['assignments']);

            // Optimistically update or add
            queryClient.setQueryData<Assignment[]>(['assignments'], (old) => {
                const existing = old?.find(
                    (a) => a.category_id === categoryId && a.month === month
                );

                if (existing) {
                    return old?.map((a) =>
                        a.category_id === categoryId && a.month === month
                            ? { ...a, assigned }
                            : a
                    ) || [];
                } else {
                    return [
                        ...(old || []),
                        {
                            id: `temp-${Date.now()}`,
                            category_id: categoryId,
                            month,
                            assigned,
                            user_id: '',
                            created_at: new Date().toISOString(),
                        } as Assignment,
                    ];
                }
            });

            return { previousAssignments };
        },

        onError: (_err, _variables, context) => {
            if (context?.previousAssignments) {
                queryClient.setQueryData(['assignments'], context.previousAssignments);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
        },
    });
};
