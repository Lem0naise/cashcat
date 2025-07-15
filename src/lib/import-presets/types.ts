export interface ImportPreset {
    name: string;
    displayName: string;
    columns: {
        date: string;
        amount?: string;
        inflow?: string;
        outflow?: string;
        payee: string;
        memo?: string;
        description?: string;
        category?: string;
    };
    dateFormat: string;
    delimiter: string;
    hasHeader: boolean;
    transform?: (row: any) => {
        amount: number;
        vendor: string;
        description: string;
        date: string;
        type: 'payment' | 'income';
    };
}

export interface ParsedTransaction {
    amount: number;
    vendor: string;
    description: string;
    date: string;
    type: 'payment' | 'income';
    category_id?: string;
}

export interface VendorCategorization {
    vendor: string;
    category_id: string;
    transactionCount: number;
}
