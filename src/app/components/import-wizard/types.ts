// ─── CSV Import Wizard Types ─────────────────────────────────────────────────

export type DetectedFormat = 'ynab' | 'starling' | 'custom';

export type ColumnMapping = {
    date: number;
    vendor: number;
    amount: number;          // Single signed amount column (Starling/custom)
    inflow?: number;         // YNAB only
    outflow?: number;        // YNAB only
    description?: number;
    category?: number;
};

export type ParsedTransaction = {
    index: number;           // Original row index for reference
    date: string;            // YYYY-MM-DD
    vendor: string;
    amount: number;          // Signed: positive = inflow, negative = outflow
    description: string;
    csvCategory: string;     // Raw category from CSV (empty if none)
    isStartingBalance: boolean;
    assignedCategoryId: string | null;  // Set during mapping step
    isDuplicate: boolean;
    includeAnyway: boolean;  // User override for duplicates
};

export type CategoryAction =
    | { type: 'merge'; targetCategoryId: string; targetCategoryName: string }
    | { type: 'create'; name: string; groupId: string; groupName: string }
    | { type: 'skip' };

export type WizardStep = 'upload' | 'format' | 'account' | 'categories' | 'review';

export type ImportWizardState = {
    step: WizardStep;

    // Step 1 output
    rawFile: File | null;
    rawRows: string[][];
    headers: string[];

    // Step 2 output
    detectedFormat: DetectedFormat;
    columnMapping: ColumnMapping;
    dateFormat: DateFormatOption;

    // Step 3 output
    targetAccountId: string | null;
    createNewAccount: { name: string; type: string } | null;

    // Step 4 output
    parsedTransactions: ParsedTransaction[];
    vendorCategoryRules: Record<string, string>; // vendor name (normalized) → category_id
    categoryActions: Record<string, CategoryAction>; // csv category name → action

    // Step 5
    isCommitting: boolean;
    commitProgress: number;
    commitTotal: number;
    commitError: string | null;
    commitDone: boolean;
};

export type DateFormatOption = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD-MM-YYYY' | 'auto';

export type ImportWizardAction =
    | { type: 'SET_FILE'; file: File; headers: string[]; rows: string[][] }
    | { type: 'SET_FORMAT'; format: DetectedFormat; mapping: ColumnMapping }
    | { type: 'SET_DATE_FORMAT'; dateFormat: DateFormatOption }
    | { type: 'UPDATE_MAPPING'; mapping: Partial<ColumnMapping> }
    | { type: 'SET_ACCOUNT'; accountId: string }
    | { type: 'SET_CREATE_ACCOUNT'; account: { name: string; type: string } | null }
    | { type: 'SET_PARSED_TRANSACTIONS'; transactions: ParsedTransaction[] }
    | { type: 'SET_CATEGORY_ACTION'; csvCategory: string; action: CategoryAction }
    | { type: 'SET_VENDOR_RULE'; vendor: string; categoryId: string }
    | { type: 'APPLY_VENDOR_RULES' }
    | { type: 'SET_TRANSACTION_CATEGORY'; index: number; categoryId: string }
    | { type: 'TOGGLE_DUPLICATE_INCLUDE'; index: number }
    | { type: 'MARK_DUPLICATES'; duplicateIndices: Set<number> }
    | { type: 'GO_TO_STEP'; step: WizardStep }
    | { type: 'COMMIT_START' }
    | { type: 'COMMIT_PROGRESS'; progress: number; total: number }
    | { type: 'COMMIT_ERROR'; error: string }
    | { type: 'COMMIT_DONE' }
    | { type: 'RESET' };

// Existing data types for matching
export type ExistingCategory = {
    id: string;
    name: string;
    group: string;
    groupName: string;
};

export type ExistingAccount = {
    id: string;
    name: string;
    type: string;
    is_active: boolean | null;
    is_default: boolean;
};

export type ExistingTransaction = {
    date: string;
    vendor: string;
    amount: number;
};

export type ExistingGroup = {
    id: string;
    name: string;
};
