// Lunch Flow API Client
// Server-side only — never import this from client components

const LUNCHFLOW_BASE_URL = 'https://lunchflow.app/api/v1';

// --- Types ---

export type LFAccount = {
    id: number;
    name: string;
    institution_name: string;
    institution_logo: string;
    provider: string;
    currency: string;
    status: 'ACTIVE' | string;
};

export type LFAccountsResponse = {
    accounts: LFAccount[];
    total: number;
};

export type LFTransaction = {
    id: string;
    accountId: number;
    amount: number;
    currency: string;
    date: string;
    merchant: string;
    description: string;
    isPending: boolean;
};

export type LFTransactionsResponse = {
    transactions: LFTransaction[];
    total: number;
};

export type LFBalance = {
    amount: number;
    currency: string;
};

export type LFBalanceResponse = {
    balance: LFBalance;
};

// --- API Functions ---

async function lfFetch<T>(apiKey: string, path: string): Promise<T> {
    const res = await fetch(`${LUNCHFLOW_BASE_URL}${path}`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`Lunch Flow API error (${res.status}): ${text}`);
    }

    return res.json();
}

export async function fetchLunchFlowAccounts(apiKey: string): Promise<LFAccountsResponse> {
    return lfFetch<LFAccountsResponse>(apiKey, '/accounts');
}

export async function fetchLunchFlowTransactions(apiKey: string, accountId: number): Promise<LFTransactionsResponse> {
    return lfFetch<LFTransactionsResponse>(apiKey, `/accounts/${accountId}/transactions`);
}

export async function fetchLunchFlowBalance(apiKey: string, accountId: number): Promise<LFBalanceResponse> {
    return lfFetch<LFBalanceResponse>(apiKey, `/accounts/${accountId}/balance`);
}
