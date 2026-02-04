import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';

// Define the extended transaction type with joins
export type TransactionWithDetails = Database['public']['Tables']['transactions']['Row'] & {
    categories: {
        id: string;
        name: string;
        group: string;
    } | null;
    vendors: {
        id: string;
        name: string;
    } | null;
    accounts: {
        id: string;
        name: string;
        type: string;
    } | null;
};

// Fetch all transactions for the current user
const fetchTransactions = async (): Promise<TransactionWithDetails[]> => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error('Not authenticated');

    // Fetch all transactions in batches to handle large datasets
    let allTransactions: TransactionWithDetails[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                categories (
                    id,
                    name,
                    group
                ),
                vendors (
                    id,
                    name
                ),
                accounts (
                    id,
                    name,
                    type
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, from + batchSize - 1);

        if (error) throw error;

        // Cast the data because Supabase types might be slightly off with deep joins
        const batch = (data as any[]) || [];
        allTransactions = [...allTransactions, ...batch];
        hasMore = batch.length === batchSize;
        from += batchSize;
    }

    return allTransactions;
};

// Custom hook for transactions - used across all pages
export const useTransactions = () => {
    return useQuery({
        queryKey: ['transactions'],
        queryFn: fetchTransactions,
    });
};
