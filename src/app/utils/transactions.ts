import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../../types/supabase';

export type NewTransaction = {
    amount: number;
    type: string;  // 'payment' | 'income' | 'starting'
    date: string;
    vendor: string;
    description?: string;
    category_id?: string | null;  // Required if type === 'payment'
};

export type Transaction = Omit<NewTransaction, 'category_id'> & {
    id: string;
    user_id: string;
    created_at: string;
    category_id: string | null;
};

export async function submitTransaction(
    transaction: NewTransaction
): Promise<void> {
    const supabase = createClientComponentClient<Database>();
    const {data: {user}, error: userError} = await supabase.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");

    const {error} = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        vendor: transaction.vendor,
        description: transaction.description || null,
        category_id: transaction.category_id || null,
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
    const supabase = createClientComponentClient<Database>();
    const {data: {user}, error: userError} = await supabase.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");

    const {error} = await supabase
        .from('transactions')
        .update({
            amount: transaction.amount,
            type: transaction.type,
            date: transaction.date,
            vendor: transaction.vendor,
            description: transaction.description || null,
            category_id: transaction.category_id || null
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
}

export async function deleteTransaction(id: string): Promise<void> {
    const supabase = createClientComponentClient<Database>();
    const {data: {user}, error: userError} = await supabase.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");

    const {error} = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}
