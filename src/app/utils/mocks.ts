import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export const mockTransactions: Transaction[] = [
    {
        id: '1',
        user_id: 'mock-user-id',
        amount: -25.50,
        date: '2025-05-11',
        vendor: 'Tesco',
        category_id: 'Food',
        description: 'Weekly groceries',
        created_at: '2025-05-11T10:00:00.000Z'
    },
    {
        id: '2',
        user_id: 'mock-user-id',
        amount: -45.00,
        date: '2025-05-10',
        vendor: 'Shell',
        category_id: 'Transport',
        description: 'Fuel',
        created_at: '2025-05-10T15:30:00.000Z'
    },
    {
        id: '3',
        user_id: 'mock-user-id',
        amount: 2500.00,
        date: '2025-05-01',
        vendor: 'Salary',
        category_id: 'Income',
        description: 'Monthly salary',
        created_at: '2025-05-01T09:00:00.000Z'
    }
];

export const mockUser = {
    id: 'mock-user-id',
    email: 'mock@example.com',
    user_metadata: {
        name: 'Mock User'
    }
};

export const isDevelopment = process.env.NODE_ENV === 'development';

// Mock Supabase-like functions
export const mockSupabase = {
    auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithOAuth: async () => ({ data: { user: mockUser }, error: null }),
    },
    from: (table: string) => ({
        select: () => ({
            eq: () => ({
                order: () => Promise.resolve({ data: mockTransactions, error: null })
            })
        }),
        insert: (data: any) => {
            // Simulate inserting new transaction
            const newTransaction = {
                ...data,
                id: String(mockTransactions.length + 1),
                created_at: new Date().toISOString(),
            };
            mockTransactions.push(newTransaction);
            return Promise.resolve({ data: newTransaction, error: null });
        },
        update: (data: any) => ({
            eq: (column: string, value: string) => {
                const index = mockTransactions.findIndex(t => t.id === value);
                if (index !== -1) {
                    mockTransactions[index] = {
                        ...mockTransactions[index],
                        ...data,
                    };
                }
                return Promise.resolve({ data: mockTransactions[index], error: null });
            }
        }),
        delete : () => ({
            eq: (column: string, value: string) => {
                const index = mockTransactions.findIndex(t => t.id === value);
                if (index !== -1) {
                    mockTransactions.splice(index, 1);
                }
                return Promise.resolve({ data: mockTransactions, error: null });
            }
        })
    })
};