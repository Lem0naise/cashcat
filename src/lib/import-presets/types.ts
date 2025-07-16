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
        account?: string;
        categoryGroup?: string;
    };
    dateFormat: string;
    delimiter: string;
    hasHeader: boolean;
    // Indicates this service has its own category/account system
    isEnhancedService?: boolean;
    transform?: (row: any) => {
        amount: number;
        vendor: string;
        description: string;
        date: string;
        type: 'payment' | 'income';
        // Enhanced service data
        sourceAccount?: string;
        sourceCategory?: string;
        sourceCategoryGroup?: string;
    };
}

export interface ParsedTransaction {
    amount: number;
    vendor: string;
    description: string;
    date: string;
    type: 'payment' | 'income';
    category_id?: string;
    // Enhanced service data
    sourceAccount?: string;
    sourceCategory?: string;
    sourceCategoryGroup?: string;
}

// New types for enhanced import mapping
export interface SourceAccount {
    name: string;
    transactionCount: number;
}

export interface SourceCategoryGroup {
    name: string;
    categories: SourceCategory[];
}

export interface SourceCategory {
    name: string;
    groupName: string;
    transactionCount: number;
}

export interface AccountMapping {
    sourceAccount: string;
    targetAccountId: string;
    shouldCreateNew?: boolean;
    newAccountName?: string;
    newAccountType?: string;
    startingBalance?: string;
}

export interface CategoryGroupMapping {
    sourceCategoryGroup: string;
    targetGroupId: string;
    shouldCreateNew?: boolean;
    newGroupName?: string;
}

export interface CategoryMapping {
    sourceCategory: string;
    sourceCategoryGroup: string;
    targetCategoryId: string;
    shouldCreateNew?: boolean;
    newCategoryName?: string;
    newCategoryGoal?: string;
    targetGroupId?: string; // For new categories
}

export interface EnhancedImportData {
    sourceAccounts: SourceAccount[];
    sourceCategoryGroups: SourceCategoryGroup[];
    accountMappings: AccountMapping[];
    categoryGroupMappings: CategoryGroupMapping[];
    categoryMappings: CategoryMapping[];
}

export interface VendorCategorization {
    vendor: string;
    category_id: string;
    transactionCount: number;
}
