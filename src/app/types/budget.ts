export type Group = {
    id: string;
    created_at: string;
    user_id: string;
    name: string;
}

export type Category = {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
    assigned: number | null;
    goal: number | null;
    group: string | null;
    timeframe: {
        type: 'monthly' | 'yearly' | 'once';
        start_date?: string;
        end_date?: string;
    } | null;
}

export type RolloverCalculation = {
    categoryId: string;
    month: string;
    assigned: number;
    spent: number;
    rolloverFromPrevious: number;
    available: number;
};

export type MoneyInputValue = string;
