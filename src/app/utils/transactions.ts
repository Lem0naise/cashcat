import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../../types/supabase';

export type NewTransaction = {
    amount: number;
    date: string;
    vendor: string;
    description?: string;
    category_id: string;
};

export type Transaction = NewTransaction & {
    id: string;
    user_id: string;
    created_at: string;
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
        date: transaction.date,
        vendor: transaction.vendor,
        description: transaction.description,
        category_id: transaction.category_id,
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
            date: transaction.date,
            vendor: transaction.vendor,
            description: transaction.description || null,
            category_id: transaction.category_id
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
