import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type Vendor = Database['public']['Tables']['vendors']['Row'];

export const mockVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'Salary',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v2',
    name: 'Netflix',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v3',
    name: 'Deliveroo',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v4',
    name: 'Shell',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v5',
    name: 'Spotify',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v6',
    name: 'Costa',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v7',
    name: 'Amazon',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v8',
    name: 'Uber',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v9',
    name: 'NHS',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v10',
    name: 'Greggs',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v11',
    name: 'HMRC',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v12',
    name: 'Vue Cinema',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v13',
    name: 'Zara',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v14',
    name: 'Trainline',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v15',
    name: 'Asda',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v16',
    name: 'Currys',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v17',
    name: 'Pret',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v18',
    name: 'Refund',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v19',
    name: 'PayByPhone',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v20',
    name: 'O2',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v21',
    name: 'Thames Water',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v22',
    name: 'Disney+',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v23',
    name: 'Gift',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v24',
    name: 'Subway',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v25',
    name: 'British Gas',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v26',
    name: 'Charity',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v27',
    name: 'Tesco',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'v28',
    name: 'Nisa',
    user_id: 'mock-user-id',
    created_at: '2025-01-01T00:00:00Z'
  }
];

// Helper function to get vendor ID by name
const getVendorId = (name: string): string => {
  const vendor = mockVendors.find(v => v.name === name);
  if (!vendor) {
    // Create a new vendor if it doesn't exist
    const newVendor: Vendor = {
      id: `v${mockVendors.length + 1}`,
      name,
      user_id: "mock-user-id",
      created_at: new Date().toISOString()
    };
    mockVendors.push(newVendor);
    return newVendor.id;
  }
  return vendor.id;
};

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 1500,
    date: '2024-01-01',
    description: 'Monthly salary',
    category_id: '1',
    user_id: 'mock-user-id',
    vendor: 'Salary',
    vendor_id: getVendorId('Salary'),
        type: 'payment',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    amount: -25,
    date: '2024-01-02',
    description: 'Food delivery',
    category_id: '2',
    user_id: 'mock-user-id',
    vendor: 'Deliveroo',
    vendor_id: getVendorId('Deliveroo'),
        type: 'payment',
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    amount: -50,
    date: '2024-01-03',
    description: 'Petrol',
    category_id: '3',
    user_id: 'mock-user-id',
    vendor: 'Shell',
        type: 'payment',
    vendor_id: getVendorId('Shell'),
    created_at: '2024-01-03T00:00:00Z'
  },
  {
    id: '4',
    amount: -15,
    date: '2024-01-04',
    description: 'Music subscription',
    category_id: '4',
    user_id: 'mock-user-id',
    vendor: 'Spotify',
    type: 'payment',
    vendor_id: getVendorId('Spotify'),
    created_at: '2024-01-04T00:00:00Z'
  },
  {
    id: '5',
        type: 'payment',
    amount: -30,
    date: '2024-01-05',
    description: 'Monthly plan',
    category_id: '5',
    user_id: 'mock-user-id',
    vendor: 'Netflix',
    vendor_id: getVendorId('Netflix'),
    created_at: '2024-01-05T00:00:00Z'
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

// Update mock Supabase to handle vendors
export const mockSupabase = {
    auth: {
        getUser: () => Promise.resolve({
            data: { user: mockUser },
            error: null
        }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: (_event: string, callback: (event: any, session: any) => void) => {
            callback('SIGNED_IN', { user: mockUser });
            return { data: { subscription: { unsubscribe: () => {} } } };
        }
    },
    from: (table: string) => ({
        select: (query?: string) => ({
            eq: (column: string, value: string) => {
                if (table === 'transactions') {
                    return Promise.resolve({
                        data: mockTransactions.filter(t => t[column as keyof typeof t] === value),
                        error: null
                    });
                } else if (table === 'categories') {
                    return Promise.resolve({
                        data: [],
                        error: null
                    });
                } else if (table === 'vendors') {
                    return Promise.resolve({
                        data: mockVendors.filter(v => v[column as keyof typeof v] === value),
                        error: null
                    });
                }
                return Promise.resolve({ data: [], error: null });
            },
            ilike: (column: string, value: string) => {
                if (table === 'vendors') {
                    return Promise.resolve({
                        data: mockVendors.filter(v => 
                            v[column as keyof typeof v]?.toString().toLowerCase().includes(value.toLowerCase().replace(/%/g, ''))
                        ),
                        error: null
                    });
                }
                return Promise.resolve({ data: [], error: null });
            },
            order: (column: string, { ascending = true } = {}) => {
                if (table === 'transactions') {
                    const sortedTransactions = [...mockTransactions].sort((a, b) => {
                        const aValue = a[column as keyof typeof a];
                        const bValue = b[column as keyof typeof b];
                        if (typeof aValue === 'string' && typeof bValue === 'string') {
                            return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                        }
                        return 0;
                    });
                    return Promise.resolve({ data: sortedTransactions, error: null });
                }
                return Promise.resolve({ data: [], error: null });
            }
        }),
        insert: (data: any) => {
            if (table === 'vendors') {
                const newVendor = {
                    ...data,
                    id: `v${mockVendors.length + 1}`,
                    user_id: mockUser.id,
                    created_at: new Date().toISOString(),
                };
                mockVendors.push(newVendor);
                return Promise.resolve({ data: newVendor, error: null });
            }
            
            // Handle transaction insert
            const newTransaction = {
                ...data,
                id: String(mockTransactions.length + 1),
                created_at: new Date().toISOString(),
                vendor_id: data.vendor_id || getVendorId(data.vendor)
            };
            mockTransactions.push(newTransaction);
            return Promise.resolve({ data: newTransaction, error: null });
        },
        update: (data: any) => ({
            eq: (column: string, value: string) => {
                if (table === 'vendors') {
                    const index = mockVendors.findIndex(v => v.id === value);
                    if (index !== -1) {
                        mockVendors[index] = { ...mockVendors[index], ...data };
                        return Promise.resolve({ data: mockVendors[index], error: null });
                    }
                } else if (table === 'transactions') {
                    const index = mockTransactions.findIndex(t => t.id === value);
                    if (index !== -1) {
                        mockTransactions[index] = { ...mockTransactions[index], ...data };
                        return Promise.resolve({ data: mockTransactions[index], error: null });
                    }
                }
                return Promise.resolve({ data: null, error: 'Not found' });
            }
        }),
        delete: () => ({
            eq: (column: string, value: string) => {
                if (table === 'transactions') {
                    const index = mockTransactions.findIndex(t => t.id === value);
                    if (index !== -1) {
                        mockTransactions.splice(index, 1);
                        return Promise.resolve({ data: null, error: null });
                    }
                }
                return Promise.resolve({ data: null, error: 'Not found' });
            }
        })
    })
};