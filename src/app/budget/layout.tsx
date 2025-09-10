import { TransactionsProvider } from './loading-transactions-context';

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransactionsProvider>
      {children}
    </TransactionsProvider>
  );
}