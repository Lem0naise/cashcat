import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { transactionsDb } from '../utils/dbSync';
import { useSupabaseClient } from '@/app/hooks/useSupabaseClient';
import type { Transaction } from '../utils/transactions';

type TransactionsContextType = {
  transactions: Transaction[];
  loading: boolean;
  syncTransactions: () => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabaseClient();

  const loadFromIndexedDb = useCallback(async () => {
    setLoading(true);
    const txs = await transactionsDb.transactions.toArray();
    setTransactions(txs);
    setLoading(false);
  }, []);

  const syncTransactions = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);
    if (!error && data) {
      await transactionsDb.transactions.clear();
      await transactionsDb.transactions.bulkAdd(data);
      setTransactions(data);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadFromIndexedDb();
  }, [loadFromIndexedDb]);

  return (
    <TransactionsContext.Provider value={{ transactions, loading, syncTransactions }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}