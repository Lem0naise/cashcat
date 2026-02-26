'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAccounts } from '@/app/hooks/useAccounts';
import { useCategories } from '@/app/hooks/useCategories';
import { useGroups } from '@/app/hooks/useGroups';
import { useTransactions, TransactionWithDetails } from '@/app/hooks/useTransactions';
import { createClient } from '@/app/utils/supabase';
import { getCachedUserId } from '@/app/hooks/useAuthUserId';
import { useQueryClient } from '@tanstack/react-query';

import { parseCSV, detectDelimiter, readFileAsText } from '@/app/utils/csv-parser';
import {
    IMPORT_PRESETS,
    detectFormat,
    autoMapHeaders,
    applyMappings,
    type ImportFormatPreset,
    type ColumnMapping,
    type CashCatField,
    type MappedTransaction,
} from '@/app/utils/import-formats';
import {
    detectDuplicates,
    detectInternalDuplicates,
    type DuplicateResult,
    type ExistingTransaction,
} from '@/app/utils/duplicate-detection';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'column-mapping' | 'account-mapping' | 'category-mapping' | 'review';

type AccountMapping = {
    csvAccountName: string;
    cashcatAccountId: string | null;
    createNew: boolean;
};

type GroupMapping = {
    csvGroupName: string;
    cashcatGroupId: string | null;
    createNew: boolean;
};

type CategoryMapping = {
    csvCategoryName: string;
    csvGroupName: string;
    cashcatCategoryId: string | null;
    cashcatGroupId: string | null;
    createNew: boolean;
};

type ImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CASHCAT_FIELDS: { value: CashCatField; label: string }[] = [
    { value: 'date', label: 'Date' },
    { value: 'vendor', label: 'Vendor / Payee' },
    { value: 'amount', label: 'Amount (single column)' },
    { value: 'outflow', label: 'Outflow / Debit' },
    { value: 'inflow', label: 'Inflow / Credit' },
    { value: 'description', label: 'Description / Memo' },
    { value: 'category', label: 'Category' },
    { value: 'category_group', label: 'Category Group' },
    { value: 'account', label: 'Account' },
    { value: 'ignore', label: 'Ignore' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
    // ── Data hooks ──
    const { data: accounts = [] } = useAccounts();
    const { data: categories = [] } = useCategories();
    const { data: groups = [] } = useGroups();
    const { data: existingTransactions = [] } = useTransactions();
    const queryClient = useQueryClient();

    // ── State ──
    const [step, setStep] = useState<ImportStep>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Parsed CSV data
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);

    // Format detection
    const [detectedPreset, setDetectedPreset] = useState<ImportFormatPreset | null>(null);
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

    // Multi-account mapping (YNAB)
    const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);

    // Category/Group mapping (YNAB)
    const [groupMappings, setGroupMappings] = useState<GroupMapping[]>([]);
    const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);

    // Parsed transactions & duplicates
    const [mappedTransactions, setMappedTransactions] = useState<MappedTransaction[]>([]);
    const [parseErrors, setParseErrors] = useState<{ rowIndex: number; message: string }[]>([]);
    const [duplicateResults, setDuplicateResults] = useState<DuplicateResult[]>([]);
    const [internalDuplicates, setInternalDuplicates] = useState<Set<number>>(new Set());

    // Selection state for review
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    // Import progress
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

    // ── Reset on open ──
    useEffect(() => {
        if (isOpen) {
            setStep('upload');
            setIsDragging(false);
            setFileName('');
            setCsvHeaders([]);
            setCsvRows([]);
            setDetectedPreset(null);
            setColumnMappings([]);
            setAccountMappings([]);
            setGroupMappings([]);
            setCategoryMappings([]);
            setMappedTransactions([]);
            setParseErrors([]);
            setDuplicateResults([]);
            setInternalDuplicates(new Set());
            setSelectedRows(new Set());
            setIsImporting(false);
            setImportProgress({ done: 0, total: 0 });
        }
    }, [isOpen]);

    // ── File handling ──
    const handleFile = useCallback(async (file: File) => {
        if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
            toast.error('Please upload a CSV file');
            return;
        }

        setFileName(file.name);

        try {
            const text = await readFileAsText(file);
            const delimiter = detectDelimiter(text);
            const parsed = parseCSV(text, delimiter);

            if (parsed.headers.length === 0) {
                toast.error('CSV file appears to be empty');
                return;
            }

            setCsvHeaders(parsed.headers);
            setCsvRows(parsed.rows);

            // Try to auto-detect format
            const preset = detectFormat(parsed.headers);
            setDetectedPreset(preset);

            if (preset) {
                // Use preset mappings
                setColumnMappings(preset.mappings);
                toast.success(`Detected ${preset.name} format`);

                // For recognized formats, we can skip column mapping
                processWithMappings(parsed.headers, parsed.rows, preset.mappings, preset);
            } else {
                // Auto-map what we can and show column mapping step
                const autoMapped = autoMapHeaders(parsed.headers);
                setColumnMappings(autoMapped);

                // Check if auto-mapping found required fields
                const hasDate = autoMapped.some(m => m.cashcatField === 'date');
                const hasAmount = autoMapped.some(m => m.cashcatField === 'amount') ||
                    (autoMapped.some(m => m.cashcatField === 'outflow') || autoMapped.some(m => m.cashcatField === 'inflow'));
                const hasVendor = autoMapped.some(m => m.cashcatField === 'vendor');

                if (hasDate && hasAmount && hasVendor) {
                    toast.success('Auto-mapped columns. Please verify the mappings.');
                } else {
                    toast('Please map the CSV columns to CashCat fields', { icon: 'i' });
                }

                setStep('column-mapping');
            }
        } catch (err) {
            console.error('Error parsing CSV:', err);
            toast.error('Failed to parse CSV file');
        }
    }, []);

    // ── Process mapped data ──
    const processWithMappings = useCallback((
        headers: string[],
        rows: string[][],
        mappings: ColumnMapping[],
        preset: ImportFormatPreset | null,
    ) => {
        const result = applyMappings(headers, rows, mappings, {
            startingBalanceVendor: preset?.startingBalanceVendor,
        });

        setMappedTransactions(result.transactions);
        setParseErrors(result.errors);

        const isMultiAccount = preset?.multiAccount || mappings.some(m => m.cashcatField === 'account');
        const hasCategories = mappings.some(m => m.cashcatField === 'category');
        const hasGroups = mappings.some(m => m.cashcatField === 'category_group');

        // Determine which accounts appear in the CSV
        if (isMultiAccount) {
            const csvAccountNames = [...new Set(result.transactions.map(t => t.accountName).filter(Boolean))];
            const newAccountMappings: AccountMapping[] = csvAccountNames.map(name => {
                // Try to find a matching CashCat account
                const match = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
                return {
                    csvAccountName: name,
                    cashcatAccountId: match?.id || null,
                    createNew: !match,
                };
            });
            setAccountMappings(newAccountMappings);
        }

        // Determine which groups appear in the CSV
        if (hasGroups) {
            const csvGroupNames = [...new Set(result.transactions.map(t => t.categoryGroupName).filter(Boolean))];
            const newGroupMappings: GroupMapping[] = csvGroupNames.map(name => {
                const match = groups.find(g => g.name.toLowerCase() === name.toLowerCase());
                return {
                    csvGroupName: name,
                    cashcatGroupId: match?.id || null,
                    createNew: !match,
                };
            });
            setGroupMappings(newGroupMappings);
        }

        // Determine which categories appear in the CSV
        if (hasCategories) {
            const csvCategories = [...new Map(
                result.transactions
                    .filter(t => t.categoryName)
                    .map(t => [`${t.categoryGroupName}|||${t.categoryName}`, { name: t.categoryName, group: t.categoryGroupName }])
            ).values()];

            const newCategoryMappings: CategoryMapping[] = csvCategories.map(({ name, group }) => {
                const match = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
                return {
                    csvCategoryName: name,
                    csvGroupName: group,
                    cashcatCategoryId: match?.id || null,
                    cashcatGroupId: match?.group || null,
                    createNew: !match,
                };
            });
            setCategoryMappings(newCategoryMappings);
        }

        // Decide which step to go to next
        if (isMultiAccount) {
            setStep('account-mapping');
        } else if (hasCategories || hasGroups) {
            setStep('category-mapping');
        } else {
            // Go straight to review
            runDuplicateDetection(result.transactions);
            setStep('review');
        }
    }, [accounts, categories, groups]);

    // ── Run duplicate detection ──
    const runDuplicateDetection = useCallback((transactions: MappedTransaction[]) => {
        const existing: ExistingTransaction[] = existingTransactions.map(t => ({
            id: t.id,
            date: t.date,
            amount: t.amount,
            vendor: t.vendors?.name || t.vendor || '',
            description: t.description,
            account_id: t.account_id,
        }));

        const results = detectDuplicates(transactions, existing);
        setDuplicateResults(results);

        const internal = detectInternalDuplicates(transactions);
        setInternalDuplicates(internal);

        // Pre-select all non-duplicate rows
        const selected = new Set<number>();
        results.forEach((r, i) => {
            if (!r.isDuplicate && !internal.has(i)) {
                selected.add(i);
            }
        });
        setSelectedRows(selected);
    }, [existingTransactions]);

    // ── Column mapping confirmation ──
    const confirmColumnMappings = useCallback(() => {
        // Validate we have the minimum required mappings
        const hasDate = columnMappings.some(m => m.cashcatField === 'date');
        const hasAmount = columnMappings.some(m => m.cashcatField === 'amount') ||
            (columnMappings.some(m => m.cashcatField === 'outflow') || columnMappings.some(m => m.cashcatField === 'inflow'));
        const hasVendor = columnMappings.some(m => m.cashcatField === 'vendor');

        if (!hasDate) {
            toast.error('Please map a column to "Date"');
            return;
        }
        if (!hasAmount) {
            toast.error('Please map a column to "Amount" or "Outflow"/"Inflow"');
            return;
        }
        if (!hasVendor) {
            toast.error('Please map a column to "Vendor / Payee"');
            return;
        }

        processWithMappings(csvHeaders, csvRows, columnMappings, detectedPreset);
    }, [csvHeaders, csvRows, columnMappings, detectedPreset, processWithMappings]);

    // ── Account mapping confirmation ──
    const confirmAccountMappings = useCallback(() => {
        const unmapped = accountMappings.filter(m => !m.cashcatAccountId && !m.createNew);
        if (unmapped.length > 0) {
            toast.error(`Please map all accounts or mark them to be created`);
            return;
        }

        const hasCategories = columnMappings.some(m => m.cashcatField === 'category');
        const hasGroups = columnMappings.some(m => m.cashcatField === 'category_group');

        if (hasCategories || hasGroups) {
            setStep('category-mapping');
        } else {
            runDuplicateDetection(mappedTransactions);
            setStep('review');
        }
    }, [accountMappings, columnMappings, mappedTransactions, runDuplicateDetection]);

    // ── Category mapping confirmation ──
    const confirmCategoryMappings = useCallback(() => {
        runDuplicateDetection(mappedTransactions);
        setStep('review');
    }, [mappedTransactions, runDuplicateDetection]);

    // ── Toggle row selection ──
    const toggleRow = useCallback((index: number) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        const all = new Set<number>();
        mappedTransactions.forEach((_, i) => all.add(i));
        setSelectedRows(all);
    }, [mappedTransactions]);

    const selectNone = useCallback(() => {
        setSelectedRows(new Set());
    }, []);

    const selectNonDuplicates = useCallback(() => {
        const selected = new Set<number>();
        duplicateResults.forEach((r, i) => {
            if (!r.isDuplicate && !internalDuplicates.has(i)) {
                selected.add(i);
            }
        });
        setSelectedRows(selected);
    }, [duplicateResults, internalDuplicates]);

    // ── Import execution ──
    const executeImport = useCallback(async () => {
        const supabase = createClient();
        const userId = getCachedUserId();
        if (!userId) {
            toast.error('Not authenticated');
            return;
        }

        const toImport = mappedTransactions.filter((_, i) => selectedRows.has(i));
        if (toImport.length === 0) {
            toast.error('No transactions selected for import');
            return;
        }

        setIsImporting(true);
        setImportProgress({ done: 0, total: toImport.length });

        try {
            // First, create any new accounts if needed
            const accountIdMap = new Map<string, string>();

            for (const mapping of accountMappings) {
                if (mapping.createNew && mapping.csvAccountName) {
                    const { data: newAccount, error } = await supabase
                        .from('accounts')
                        .insert({
                            name: mapping.csvAccountName,
                            type: 'checking',
                            user_id: userId,
                            is_active: true,
                            is_default: false,
                        })
                        .select()
                        .single();

                    if (error) throw error;
                    accountIdMap.set(mapping.csvAccountName, newAccount.id);
                } else if (mapping.cashcatAccountId) {
                    accountIdMap.set(mapping.csvAccountName, mapping.cashcatAccountId);
                }
            }

            // Create any new groups if needed
            const groupIdMap = new Map<string, string>();

            for (const mapping of groupMappings) {
                if (mapping.createNew && mapping.csvGroupName) {
                    const { data: newGroup, error } = await supabase
                        .from('groups')
                        .insert({
                            name: mapping.csvGroupName,
                            user_id: userId,
                        })
                        .select()
                        .single();

                    if (error) throw error;
                    groupIdMap.set(mapping.csvGroupName, newGroup.id);
                } else if (mapping.cashcatGroupId) {
                    groupIdMap.set(mapping.csvGroupName, mapping.cashcatGroupId);
                }
            }

            // Create any new categories if needed
            const categoryIdMap = new Map<string, string>();

            for (const mapping of categoryMappings) {
                if (mapping.createNew && mapping.csvCategoryName) {
                    // Determine which group this category belongs to
                    let groupId = groupIdMap.get(mapping.csvGroupName) || mapping.cashcatGroupId;

                    // If no group mapping exists, create or find a default group
                    if (!groupId) {
                        const groupName = mapping.csvGroupName || 'Imported';
                        const existingGroup = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
                        if (existingGroup) {
                            groupId = existingGroup.id;
                        } else {
                            const { data: newGroup, error } = await supabase
                                .from('groups')
                                .insert({
                                    name: groupName,
                                    user_id: userId,
                                })
                                .select()
                                .single();

                            if (error) throw error;
                            groupId = newGroup.id;
                            groupIdMap.set(groupName, newGroup.id);
                        }
                    }

                    const { data: newCategory, error } = await supabase
                        .from('categories')
                        .insert({
                            name: mapping.csvCategoryName,
                            group: groupId,
                            user_id: userId,
                            timeframe: { type: 'monthly' },
                        })
                        .select()
                        .single();

                    if (error) throw error;
                    categoryIdMap.set(`${mapping.csvGroupName}|||${mapping.csvCategoryName}`, newCategory.id);
                } else if (mapping.cashcatCategoryId) {
                    categoryIdMap.set(`${mapping.csvGroupName}|||${mapping.csvCategoryName}`, mapping.cashcatCategoryId);
                }
            }

            // Get default account (fallback)
            const defaultAccount = accounts.find(a => a.is_default) || accounts[0];

            // Import transactions in batches
            const batchSize = 50;
            let done = 0;

            for (let i = 0; i < toImport.length; i += batchSize) {
                const batch = toImport.slice(i, i + batchSize);

                const inserts = batch.map(tx => {
                    // Resolve account ID
                    let accountId: string | undefined;
                    if (tx.accountName) {
                        accountId = accountIdMap.get(tx.accountName);
                    }
                    if (!accountId) {
                        accountId = defaultAccount?.id;
                    }

                    // Resolve category ID
                    let categoryId: string | undefined;
                    if (tx.categoryName) {
                        categoryId = categoryIdMap.get(`${tx.categoryGroupName}|||${tx.categoryName}`);
                    }

                    // Determine type
                    let type = 'payment';
                    if (tx.isStartingBalance) {
                        type = 'starting';
                    } else if (tx.amount > 0) {
                        type = 'income';
                    }

                    return {
                        amount: tx.amount,
                        type,
                        date: tx.date,
                        vendor: tx.vendor,
                        description: tx.description || undefined,
                        account_id: accountId,
                        category_id: categoryId || undefined,
                        user_id: userId,
                    };
                });

                const { error } = await supabase
                    .from('transactions')
                    .insert(inserts);

                if (error) throw error;

                done += batch.length;
                setImportProgress({ done, total: toImport.length });
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['vendors'] });

            toast.success(`Successfully imported ${toImport.length} transactions`);
            onImportComplete();
            onClose();
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Failed to import transactions. Please try again.');
        } finally {
            setIsImporting(false);
        }
    }, [mappedTransactions, selectedRows, accountMappings, groupMappings, categoryMappings, accounts, groups, queryClient, onImportComplete, onClose]);

    // ── Drag & drop handlers ──
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    // ── Stats for review step ──
    const reviewStats = useMemo(() => {
        if (duplicateResults.length === 0) return null;

        const duplicates = duplicateResults.filter(r => r.isDuplicate).length;
        const internalDups = internalDuplicates.size;
        const selected = selectedRows.size;
        const total = mappedTransactions.length;
        const totalAmount = mappedTransactions
            .filter((_, i) => selectedRows.has(i))
            .reduce((sum, t) => sum + t.amount, 0);

        return { duplicates, internalDups, selected, total, totalAmount };
    }, [duplicateResults, internalDuplicates, selectedRows, mappedTransactions]);

    if (!isOpen) return null;

    // ── Render helpers ──
    const renderStepIndicator = () => {
        const steps: { key: ImportStep; label: string }[] = [
            { key: 'upload', label: 'Upload' },
            { key: 'column-mapping', label: 'Map Columns' },
            { key: 'account-mapping', label: 'Accounts' },
            { key: 'category-mapping', label: 'Categories' },
            { key: 'review', label: 'Review' },
        ];

        const currentIndex = steps.findIndex(s => s.key === step);

        return (
            <div className="flex items-center gap-1 px-6 py-3 border-b border-white/10 bg-[#0d0d0d] overflow-x-auto">
                {steps.map((s, i) => {
                    const isActive = s.key === step;
                    const isPast = i < currentIndex;
                    const isClickable = isPast;

                    return (
                        <div key={s.key} className="flex items-center">
                            {i > 0 && (
                                <div className={`w-4 md:w-8 h-px mx-0.5 ${isPast ? 'bg-green/60' : 'bg-white/10'}`} />
                            )}
                            <button
                                onClick={() => isClickable && setStep(s.key)}
                                disabled={!isClickable}
                                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-green/20 text-green font-medium'
                                    : isPast
                                        ? 'bg-white/5 text-white/60 hover:bg-white/10 cursor-pointer'
                                        : 'bg-white/[.02] text-white/20'
                                    }`}
                            >
                                {s.label}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ─── Step: Upload ─────────────────────────────────────────────────────────
    const renderUpload = () => (
        <div className="p-6 flex-1 flex flex-col items-center justify-center gap-6">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-green bg-green/10 scale-[1.02]'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/[.02]'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                    className="hidden"
                />

                <svg className="mx-auto mb-4 opacity-40" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 11L12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 16.7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V16.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                <p className="text-white/80 text-lg font-medium mb-2">
                    {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
                </p>
                <p className="text-white/40 text-sm">
                    or click to browse
                </p>
            </div>

            <div className="text-center space-y-2 max-w-lg">
                <p className="text-white/40 text-xs">
                    The importer will auto-detect the format or ask you to map columns.
                </p>

                {/* Preset list */}
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {IMPORT_PRESETS.map(p => (
                        <span key={p.id} className="text-xs px-2 py-1 bg-white/5 rounded-full text-white/30">
                            {p.name}
                        </span>
                    ))}
                    <span className="text-xs px-2 py-1 bg-white/5 rounded-full text-white/30">
                        + Custom
                    </span>
                </div>
            </div>
        </div>
    );

    // ─── Step: Column Mapping ─────────────────────────────────────────────────
    const renderColumnMapping = () => (
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-1">Map CSV Columns</h3>
                <p className="text-white/50 text-sm">
                    We couldn&apos;t fully recognise this CSV format. Please tell us what each column represents.
                </p>
            </div>

            {/* Preview of first few rows */}
            <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-white/5">
                            {csvHeaders.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium text-white/70 whitespace-nowrap border-b border-white/10">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {csvRows.slice(0, 3).map((row, ri) => (
                            <tr key={ri} className="border-b border-white/5">
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-1.5 text-white/50 whitespace-nowrap max-w-[200px] truncate">
                                        {cell || <span className="text-white/20 italic">empty</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mapping controls */}
            <div className="space-y-3">
                {columnMappings.map((mapping, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/[.02] rounded-lg p-3 border border-white/5">
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-white/80 truncate block">
                                {mapping.csvHeader}
                            </span>
                            <span className="text-xs text-white/30">
                                e.g. {csvRows[0]?.[i] || '—'}
                            </span>
                        </div>
                        <svg className="opacity-30 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <select
                            value={mapping.cashcatField}
                            onChange={(e) => {
                                const newMappings = [...columnMappings];
                                newMappings[i] = { ...mapping, cashcatField: e.target.value as CashCatField };
                                setColumnMappings(newMappings);
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green focus:outline-none transition-colors min-w-[180px]"
                        >
                            {CASHCAT_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );

    // ─── Step: Account Mapping ────────────────────────────────────────────────
    const renderAccountMapping = () => (
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-1">Map Accounts</h3>
                <p className="text-white/50 text-sm">
                    Your CSV contains transactions from multiple accounts. Map each one to an existing CashCat account or create a new one.
                </p>
            </div>

            <div className="space-y-3">
                {accountMappings.map((mapping, i) => {
                    const txCount = mappedTransactions.filter(t => t.accountName === mapping.csvAccountName).length;

                    return (
                        <div key={i} className="bg-white/[.02] rounded-lg p-4 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-medium text-white/90">{mapping.csvAccountName}</span>
                                    <span className="text-xs text-white/30 ml-2">{txCount} transactions</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`account-${i}`}
                                        checked={!mapping.createNew}
                                        onChange={() => {
                                            const next = [...accountMappings];
                                            next[i] = { ...mapping, createNew: false };
                                            setAccountMappings(next);
                                        }}
                                        className="accent-green"
                                    />
                                    <span className="text-sm text-white/70">Link to existing</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`account-${i}`}
                                        checked={mapping.createNew}
                                        onChange={() => {
                                            const next = [...accountMappings];
                                            next[i] = { ...mapping, createNew: true, cashcatAccountId: null };
                                            setAccountMappings(next);
                                        }}
                                        className="accent-green"
                                    />
                                    <span className="text-sm text-white/70">Create new</span>
                                </label>
                            </div>

                            {!mapping.createNew && (
                                <select
                                    value={mapping.cashcatAccountId || ''}
                                    onChange={(e) => {
                                        const next = [...accountMappings];
                                        next[i] = { ...mapping, cashcatAccountId: e.target.value || null };
                                        setAccountMappings(next);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green focus:outline-none transition-colors"
                                >
                                    <option value="">Select an account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ─── Step: Category/Group Mapping ─────────────────────────────────────────
    const renderCategoryMapping = () => (
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-1">Map Categories & Groups</h3>
                <p className="text-white/50 text-sm">
                    Map imported categories and groups to your existing CashCat categories, or create new ones.
                </p>
            </div>

            {/* Groups */}
            {groupMappings.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white/60">Groups</h4>
                    {groupMappings.map((mapping, i) => (
                        <div key={i} className="bg-white/[.02] rounded-lg p-3 border border-white/5 flex items-center gap-3">
                            <span className="text-sm text-white/80 flex-1 min-w-0 truncate">{mapping.csvGroupName}</span>
                            <svg className="opacity-30 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex items-center gap-2 min-w-0">
                                <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={mapping.createNew}
                                        onChange={(e) => {
                                            const next = [...groupMappings];
                                            next[i] = { ...mapping, createNew: e.target.checked, cashcatGroupId: e.target.checked ? null : mapping.cashcatGroupId };
                                            setGroupMappings(next);
                                        }}
                                        className="accent-green"
                                    />
                                    <span className="text-xs text-white/50">New</span>
                                </label>
                                {!mapping.createNew && (
                                    <select
                                        value={mapping.cashcatGroupId || ''}
                                        onChange={(e) => {
                                            const next = [...groupMappings];
                                            next[i] = { ...mapping, cashcatGroupId: e.target.value || null };
                                            setGroupMappings(next);
                                        }}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-green focus:outline-none min-w-[140px]"
                                    >
                                        <option value="">Select group...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Categories */}
            {categoryMappings.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white/60">Categories</h4>
                        <span className="text-xs text-white/30">{categoryMappings.length} categories</span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                        {categoryMappings.map((mapping, i) => (
                            <div key={i} className="bg-white/[.02] rounded-lg p-3 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm text-white/80 truncate block">{mapping.csvCategoryName}</span>
                                        {mapping.csvGroupName && (
                                            <span className="text-xs text-white/30">{mapping.csvGroupName}</span>
                                        )}
                                    </div>
                                    <svg className="opacity-30 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={mapping.createNew}
                                                onChange={(e) => {
                                                    const next = [...categoryMappings];
                                                    next[i] = { ...mapping, createNew: e.target.checked, cashcatCategoryId: e.target.checked ? null : mapping.cashcatCategoryId };
                                                    setCategoryMappings(next);
                                                }}
                                                className="accent-green"
                                            />
                                            <span className="text-xs text-white/50">New</span>
                                        </label>
                                        {!mapping.createNew && (
                                            <select
                                                value={mapping.cashcatCategoryId || ''}
                                                onChange={(e) => {
                                                    const next = [...categoryMappings];
                                                    next[i] = { ...mapping, cashcatCategoryId: e.target.value || null };
                                                    setCategoryMappings(next);
                                                }}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-green focus:outline-none min-w-[140px]"
                                            >
                                                <option value="">Select category...</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.groups?.name || 'No group'})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // ─── Step: Review & Import ────────────────────────────────────────────────
    const renderReview = () => (
        <div className="flex-1 overflow-hidden flex flex-col">
            {/* Stats bar */}
            {reviewStats && (
                <div className="px-6 py-3 border-b border-white/10 bg-[#0d0d0d] flex items-center gap-4 flex-wrap text-xs">
                    <span className="text-white/50">
                        <span className="text-white font-medium">{reviewStats.selected}</span> / {reviewStats.total} selected
                    </span>
                    {reviewStats.duplicates > 0 && (
                        <span className="text-yellow-400/80">
                            {reviewStats.duplicates} potential duplicates
                        </span>
                    )}
                    {reviewStats.internalDups > 0 && (
                        <span className="text-orange-400/80">
                            {reviewStats.internalDups} internal duplicates
                        </span>
                    )}
                    {parseErrors.length > 0 && (
                        <span className="text-reddy/80">
                            {parseErrors.length} rows with errors
                        </span>
                    )}
                    <div className="flex-1" />
                    <div className="flex gap-2">
                        <button onClick={selectAll} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/60 transition-colors">
                            All
                        </button>
                        <button onClick={selectNone} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/60 transition-colors">
                            None
                        </button>
                        <button onClick={selectNonDuplicates} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/60 transition-colors">
                            Non-duplicates
                        </button>
                    </div>
                </div>
            )}

            {/* Transaction list */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
                <div className="space-y-1">
                    {duplicateResults.length > 0 ? (
                        duplicateResults.map((result, i) => {
                            const tx = result.imported;
                            const isSelected = selectedRows.has(i);
                            const isInternalDup = internalDuplicates.has(i);

                            return (
                                <div
                                    key={i}
                                    onClick={() => toggleRow(i)}
                                    className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors ${isSelected
                                        ? 'bg-white/[.05] hover:bg-white/[.08]'
                                        : 'bg-white/[.01] hover:bg-white/[.03] opacity-50'
                                        } ${result.isDuplicate ? 'border-l-2 border-yellow-500/50' : ''
                                        } ${isInternalDup ? 'border-l-2 border-orange-500/50' : ''
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-green border-green' : 'border-white/20'
                                        }`}>
                                        {isSelected && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                                <path d="M5 13l4 4L19 7" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <span className="text-xs text-white/40 w-20 flex-shrink-0 tabular-nums">
                                        {tx.date}
                                    </span>

                                    {/* Vendor */}
                                    <span className="text-sm text-white/80 flex-1 min-w-0 truncate">
                                        {tx.vendor}
                                    </span>

                                    {/* Category */}
                                    {tx.categoryName && (
                                        <span className="text-xs text-white/30 hidden md:block max-w-[120px] truncate">
                                            {tx.categoryName}
                                        </span>
                                    )}

                                    {/* Account */}
                                    {tx.accountName && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40 hidden md:block max-w-[100px] truncate">
                                            {tx.accountName}
                                        </span>
                                    )}

                                    {/* Amount */}
                                    <span className={`text-sm font-medium tabular-nums flex-shrink-0 ${tx.amount < 0 ? 'text-reddy' : 'text-green'
                                        }`}>
                                        {tx.amount < 0 ? '-' : '+'}
                                        {Math.abs(tx.amount).toFixed(2)}
                                    </span>

                                    {/* Duplicate badge */}
                                    {result.isDuplicate && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex-shrink-0 hidden md:block" title={result.reason}>
                                            DUP
                                        </span>
                                    )}
                                    {isInternalDup && !result.isDuplicate && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 flex-shrink-0 hidden md:block">
                                            REPEAT
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        mappedTransactions.map((tx, i) => (
                            <div
                                key={i}
                                onClick={() => toggleRow(i)}
                                className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors ${selectedRows.has(i)
                                    ? 'bg-white/[.05] hover:bg-white/[.08]'
                                    : 'bg-white/[.01] hover:bg-white/[.03] opacity-50'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${selectedRows.has(i) ? 'bg-green border-green' : 'border-white/20'
                                    }`}>
                                    {selectedRows.has(i) && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 13l4 4L19 7" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs text-white/40 w-20 flex-shrink-0 tabular-nums">{tx.date}</span>
                                <span className="text-sm text-white/80 flex-1 min-w-0 truncate">{tx.vendor}</span>
                                <span className={`text-sm font-medium tabular-nums flex-shrink-0 ${tx.amount < 0 ? 'text-reddy' : 'text-green'}`}>
                                    {tx.amount < 0 ? '-' : '+'}
                                    {Math.abs(tx.amount).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Errors section */}
                {parseErrors.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <h4 className="text-sm font-medium text-reddy/80">Skipped Rows ({parseErrors.length})</h4>
                        <div className="space-y-1 max-h-[150px] overflow-y-auto">
                            {parseErrors.map((err, i) => (
                                <div key={i} className="text-xs text-white/40 bg-reddy/5 rounded px-3 py-1.5 border border-reddy/10">
                                    Row {err.rowIndex}: {err.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // ─── Footer buttons ───────────────────────────────────────────────────────
    const renderFooter = () => {
        if (step === 'upload') return null;

        return (
            <div className="p-4 md:p-6 border-t border-white/10 bg-[#151515] flex items-center justify-between gap-3">
                <button
                    onClick={() => {
                        if (step === 'column-mapping') setStep('upload');
                        else if (step === 'account-mapping') setStep('column-mapping');
                        else if (step === 'category-mapping') {
                            const isMultiAccount = columnMappings.some(m => m.cashcatField === 'account');
                            setStep(isMultiAccount ? 'account-mapping' : 'column-mapping');
                        }
                        else if (step === 'review') {
                            const hasCategories = columnMappings.some(m => m.cashcatField === 'category');
                            const hasGroups = columnMappings.some(m => m.cashcatField === 'category_group');
                            const isMultiAccount = columnMappings.some(m => m.cashcatField === 'account');
                            if (hasCategories || hasGroups) setStep('category-mapping');
                            else if (isMultiAccount) setStep('account-mapping');
                            else setStep('column-mapping');
                        }
                    }}
                    className="px-4 py-2.5 rounded-lg font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
                >
                    Back
                </button>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-lg font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                        Cancel
                    </button>

                    {step === 'column-mapping' && (
                        <button
                            onClick={confirmColumnMappings}
                            className="px-6 py-2.5 rounded-lg font-bold text-black bg-green hover:bg-green-dark transition-colors text-sm"
                        >
                            Continue
                        </button>
                    )}

                    {step === 'account-mapping' && (
                        <button
                            onClick={confirmAccountMappings}
                            className="px-6 py-2.5 rounded-lg font-bold text-black bg-green hover:bg-green-dark transition-colors text-sm"
                        >
                            Continue
                        </button>
                    )}

                    {step === 'category-mapping' && (
                        <button
                            onClick={confirmCategoryMappings}
                            className="px-6 py-2.5 rounded-lg font-bold text-black bg-green hover:bg-green-dark transition-colors text-sm"
                        >
                            Continue
                        </button>
                    )}

                    {step === 'review' && (
                        <button
                            onClick={executeImport}
                            disabled={isImporting || selectedRows.size === 0}
                            className="px-6 py-2.5 rounded-lg font-bold text-black bg-green hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            {isImporting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Importing {importProgress.done}/{importProgress.total}...
                                </>
                            ) : (
                                <>
                                    Import {selectedRows.size} Transaction{selectedRows.size !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ─── Main render ──────────────────────────────────────────────────────────
    return (
        <div className="font-[family-name:var(--font-suse)] fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
            <div className="bg-[#111] border border-white/10 md:rounded-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl overflow-hidden flex flex-col shadow-2xl animate-[fadeIn_0.2s_ease-out]">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-[#151515] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 13L12 16L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 16.7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V16.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <h2 className="text-xl font-bold text-white">Import Transactions</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white">
                        <Image src="/plus.svg" alt="Close" width={20} height={20} className="rotate-45 invert" />
                    </button>
                </div>

                {/* Step indicator */}
                {step !== 'upload' && renderStepIndicator()}

                {/* Step content */}
                {step === 'upload' && renderUpload()}
                {step === 'column-mapping' && renderColumnMapping()}
                {step === 'account-mapping' && renderAccountMapping()}
                {step === 'category-mapping' && renderCategoryMapping()}
                {step === 'review' && renderReview()}

                {/* Footer */}
                {renderFooter()}
            </div>
        </div>
    );
}
