import { createClient } from '@/app/utils/supabase';
import { Database } from '@/types/supabase';
import { getCachedUserId } from '../hooks/useAuthUserId';

export type NewTransaction = {
    amount: number;
    type: string;  // 'payment' | 'income' | 'starting'
    date: string;
    vendor: string;
    account_id: string;
    description?: string;
    category_id?: string | null;  // Required if type === 'payment'
};

export type Transaction = Omit<NewTransaction, 'category_id'> & {
    id: string;
    user_id: string;
    created_at: string;
    account_id: string;
    category_id: string | null;
};

export async function submitTransaction(
    transaction: NewTransaction
): Promise<void> {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error("User not authenticated");


    const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        account_id: transaction.account_id,
        vendor: transaction.vendor,
        description: transaction.description || undefined,
        category_id: transaction.category_id || undefined,
        created_at: new Date().toISOString(),
    });

    if (error) {
        console.error('Error submitting transaction:', error);
        throw error;
    }
}

export async function updateTransaction(
    id: string,
    transaction: NewTransaction
): Promise<void> {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('transactions')
        .update({
            amount: transaction.amount,
            type: transaction.type,
            date: transaction.date,
            vendor: transaction.vendor,
            account_id: transaction.account_id,
            description: transaction.description || null,
            category_id: transaction.category_id || undefined
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
}

export async function deleteTransaction(id: string): Promise<void> {
    const supabase = createClient();
    const userId = getCachedUserId();
    if (!userId) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}
