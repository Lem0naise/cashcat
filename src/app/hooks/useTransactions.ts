import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase';
import type { Database } from '@/types/supabase';
import { useAuthUserId } from './useAuthUserId';

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

// Fetch all transactions for a given user
const fetchTransactions = async (userId: string): Promise<TransactionWithDetails[]> => {
    const supabase = createClient();

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
            .eq('user_id', userId)
            .order('date', { ascending: false })
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
    const userId = useAuthUserId();
    return useQuery({
        queryKey: ['transactions'],
        queryFn: () => fetchTransactions(userId!),
        enabled: !!userId,
    });
};
