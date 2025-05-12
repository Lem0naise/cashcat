import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export const mockTransactions: Transaction[] = [

  {
    "id": "1",
    "user_id": "mock-user-id",
    "amount": -19.07,
    "date": "2025-04-30",
    "vendor": "Salary",
    "category_id": "Misc",
    "description": "Fuel",
    "created_at": "2025-04-30T09:25:00Z"
  },
  {
    "id": "2",
    "user_id": "mock-user-id",
    "amount": -108.67,
    "date": "2025-04-09",
    "vendor": "Netflix",
    "category_id": "Shopping",
    "description": "Subscription",
    "created_at": "2025-04-09T14:17:00Z"
  },
  {
    "id": "3",
    "user_id": "mock-user-id",
    "amount": -10.42,
    "date": "2025-04-16",
    "vendor": "Deliveroo",
    "category_id": "Misc",
    "description": "Online shopping",
    "created_at": "2025-04-16T17:37:00Z"
  },
  {
    "id": "4",
    "user_id": "mock-user-id",
    "amount": -18.74,
    "date": "2025-04-09",
    "vendor": "Salary",
    "category_id": "Misc",
    "description": "Pharmacy",
    "created_at": "2025-04-09T09:36:00Z"
  },
  {
    "id": "5",
    "user_id": "mock-user-id",
    "amount": -26.28,
    "date": "2025-05-05",
    "vendor": "Shell",
    "category_id": "Health",
    "description": "Weekly groceries",
    "created_at": "2025-05-05T06:20:00Z"
  },
  {
    "id": "6",
    "user_id": "mock-user-id",
    "amount": 2495.60,
    "date": "2025-04-28",
    "vendor": "Salary",
    "category_id": "Income",
    "description": "Monthly salary",
    "created_at": "2025-04-28T08:00:00Z"
  },
  {
    "id": "7",
    "user_id": "mock-user-id",
    "amount": -7.99,
    "date": "2025-04-30",
    "vendor": "Spotify",
    "category_id": "Entertainment",
    "description": "Music subscription",
    "created_at": "2025-04-30T12:00:00Z"
  },
  {
    "id": "8",
    "user_id": "mock-user-id",
    "amount": -2.50,
    "date": "2025-05-01",
    "vendor": "Costa",
    "category_id": "Food",
    "description": "Coffee",
    "created_at": "2025-05-01T09:10:00Z"
  },
  {
    "id": "9",
    "user_id": "mock-user-id",
    "amount": -12.00,
    "date": "2025-04-18",
    "vendor": "Amazon",
    "category_id": "Shopping",
    "description": "Books",
    "created_at": "2025-04-18T11:32:00Z"
  },
  {
    "id": "10",
    "user_id": "mock-user-id",
    "amount": -30.00,
    "date": "2025-05-08",
    "vendor": "Uber",
    "category_id": "Transport",
    "description": "Taxi to meeting",
    "created_at": "2025-05-08T19:25:00Z"
  },
  {
    "id": "11",
    "user_id": "mock-user-id",
    "amount": -75.00,
    "date": "2025-04-15",
    "vendor": "NHS",
    "category_id": "Health",
    "description": "Dental appointment",
    "created_at": "2025-04-15T10:15:00Z"
  },
  {
    "id": "12",
    "user_id": "mock-user-id",
    "amount": -13.37,
    "date": "2025-05-02",
    "vendor": "Greggs",
    "category_id": "Food",
    "description": "Lunch",
    "created_at": "2025-05-02T13:45:00Z"
  },
  {
    "id": "13",
    "user_id": "mock-user-id",
    "amount": -200.00,
    "date": "2025-04-25",
    "vendor": "HMRC",
    "category_id": "Bills",
    "description": "Tax payment",
    "created_at": "2025-04-25T07:10:00Z"
  },
  {
    "id": "14",
    "user_id": "mock-user-id",
    "amount": -15.00,
    "date": "2025-04-26",
    "vendor": "Vue Cinema",
    "category_id": "Entertainment",
    "description": "Movie night",
    "created_at": "2025-04-26T20:00:00Z"
  },
  {
    "id": "15",
    "user_id": "mock-user-id",
    "amount": -22.50,
    "date": "2025-04-17",
    "vendor": "Zara",
    "category_id": "Shopping",
    "description": "T-shirt",
    "created_at": "2025-04-17T16:20:00Z"
  },
  {
    "id": "16",
    "user_id": "mock-user-id",
    "amount": -60.00,
    "date": "2025-05-03",
    "vendor": "Trainline",
    "category_id": "Transport",
    "description": "Return train tickets",
    "created_at": "2025-05-03T07:45:00Z"
  },
  {
    "id": "17",
    "user_id": "mock-user-id",
    "amount": -35.99,
    "date": "2025-05-07",
    "vendor": "Asda",
    "category_id": "Food",
    "description": "Groceries",
    "created_at": "2025-05-07T18:10:00Z"
  },
  {
    "id": "18",
    "user_id": "mock-user-id",
    "amount": -49.99,
    "date": "2025-04-20",
    "vendor": "Currys",
    "category_id": "Shopping",
    "description": "Headphones",
    "created_at": "2025-04-20T14:50:00Z"
  },
  {
    "id": "19",
    "user_id": "mock-user-id",
    "amount": -11.49,
    "date": "2025-04-27",
    "vendor": "Pret",
    "category_id": "Food",
    "description": "Breakfast",
    "created_at": "2025-04-27T08:30:00Z"
  },
  {
    "id": "20",
    "user_id": "mock-user-id",
    "amount": 200.00,
    "date": "2025-04-12",
    "vendor": "Refund",
    "category_id": "Income",
    "description": "Returned item",
    "created_at": "2025-04-12T15:00:00Z"
  },
  {
    "id": "21",
    "user_id": "mock-user-id",
    "amount": -5.00,
    "date": "2025-04-19",
    "vendor": "PayByPhone",
    "category_id": "Transport",
    "description": "Parking",
    "created_at": "2025-04-19T13:45:00Z"
  },
  {
    "id": "22",
    "user_id": "mock-user-id",
    "amount": -140.00,
    "date": "2025-04-14",
    "vendor": "O2",
    "category_id": "Bills",
    "description": "Phone bill",
    "created_at": "2025-04-14T09:00:00Z"
  },
  {
    "id": "23",
    "user_id": "mock-user-id",
    "amount": -50.00,
    "date": "2025-05-04",
    "vendor": "Thames Water",
    "category_id": "Bills",
    "description": "Water bill",
    "created_at": "2025-05-04T10:10:00Z"
  },
  {
    "id": "24",
    "user_id": "mock-user-id",
    "amount": -9.99,
    "date": "2025-04-22",
    "vendor": "Disney+",
    "category_id": "Entertainment",
    "description": "Streaming subscription",
    "created_at": "2025-04-22T22:00:00Z"
  },
  {
    "id": "25",
    "user_id": "mock-user-id",
    "amount": 100.00,
    "date": "2025-05-06",
    "vendor": "Gift",
    "category_id": "Income",
    "description": "Birthday money",
    "created_at": "2025-05-06T14:00:00Z"
  },
  {
    "id": "26",
    "user_id": "mock-user-id",
    "amount": -8.80,
    "date": "2025-04-11",
    "vendor": "Subway",
    "category_id": "Food",
    "description": "Quick bite",
    "created_at": "2025-04-11T13:00:00Z"
  },
  {
    "id": "27",
    "user_id": "mock-user-id",
    "amount": -150.00,
    "date": "2025-04-21",
    "vendor": "British Gas",
    "category_id": "Bills",
    "description": "Gas bill",
    "created_at": "2025-04-21T08:40:00Z"
  },
  {
    "id": "28",
    "user_id": "mock-user-id",
    "amount": -10.00,
    "date": "2025-05-09",
    "vendor": "Charity",
    "category_id": "Misc",
    "description": "Donation",
    "created_at": "2025-05-09T12:00:00Z"
  },
  {
    "id": "29",
    "user_id": "mock-user-id",
    "amount": -45.00,
    "date": "2025-05-10",
    "vendor": "Shell",
    "category_id": "Transport",
    "description": "Fuel",
    "created_at": "2025-05-10T15:30:00Z"
  },
  {
    "id": "30",
    "user_id": "mock-user-id",
    "amount": -25.50,
    "date": "2025-05-11",
    "vendor": "Tesco",
    "category_id": "Food",
    "description": "Weekly groceries",
    "created_at": "2025-05-11T10:00:00Z"
  },
    {
    "id": "31",
    "user_id": "mock-user-id",
    "amount": -19.99,
    "date": "2025-05-11",
    "vendor": "Costa",
    "category_id": "Food",
    "description": "",
    "created_at": "2025-05-11T12:00:00Z"
  },
    {
    "id": "32",
    "user_id": "mock-user-id",
    "amount": -5.50,
    "date": "2025-05-11",
    "vendor": "Nisa",
    "category_id": "Food",
    "description": "Coffee",
    "created_at": "2025-05-11T13:00:00Z"
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