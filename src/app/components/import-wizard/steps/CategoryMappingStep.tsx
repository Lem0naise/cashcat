'use client';

import { useMemo, useState } from 'react';
import Dropdown from '../../dropdown';
import GroupedDropdown from '../../grouped-dropdown';
import type {
    ParsedTransaction,
    CategoryAction,
    ExistingCategory,
    ExistingGroup,
} from '../types';
import { normalizeVendor } from '../utils/csv-parser';

interface CategoryMappingStepProps {
    parsedTransactions: ParsedTransaction[];
    existingCategories: ExistingCategory[];
    existingGroups: ExistingGroup[];
    categoryActions: Record<string, CategoryAction>;
    vendorCategoryRules: Record<string, string>;
    onCategoryAction: (csvCategory: string, action: CategoryAction) => void;
    onVendorRule: (vendor: string, categoryId: string) => void;
    isOnboarding?: boolean;
}

type ViewMode = 'categories' | 'vendors';

export default function CategoryMappingStep({
    parsedTransactions,
    existingCategories,
    existingGroups,
    categoryActions,
    vendorCategoryRules,
    onCategoryAction,
    onVendorRule,
    isOnboarding = false,
}: CategoryMappingStepProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('vendors');
    const [newGroupNames, setNewGroupNames] = useState<Record<string, string>>({});

    // Get unique CSV categories
    const csvCategories = useMemo(() => {
        const catCounts = new Map<string, number>();
        for (const tx of parsedTransactions) {
            if (tx.csvCategory && !tx.isStartingBalance) {
                catCounts.set(tx.csvCategory, (catCounts.get(tx.csvCategory) || 0) + 1);
            }
        }
        return Array.from(catCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [parsedTransactions]);

    // Get unique vendors with counts
    const uniqueVendors = useMemo(() => {
        const vendorCounts = new Map<string, { original: string; count: number }>();
        for (const tx of parsedTransactions) {
            if (tx.isStartingBalance) continue;
            const normalized = normalizeVendor(tx.vendor);
            const existing = vendorCounts.get(normalized);
            if (existing) {
                existing.count++;
            } else {
                vendorCounts.set(normalized, { original: tx.vendor, count: 1 });
            }
        }
        return Array.from(vendorCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([normalized, { original, count }]) => ({ normalized, original, count }));
    }, [parsedTransactions]);

    // Build category options for dropdowns
    const categoryOptions = useMemo(() => {
        return existingCategories.map(cat => ({
            value: cat.id,
            label: cat.name,
            group: cat.groupName,
        }));
    }, [existingCategories]);

    const groupOptions = useMemo(() => {
        return [
            ...existingGroups.map(g => ({ value: g.id, label: g.name })),
            { value: 'new:', label: '+ Create New Group' },
        ];
    }, [existingGroups]);

    // Stats
    const totalTx = parsedTransactions.filter(tx => !tx.isStartingBalance).length;
    const categorizedTx = parsedTransactions.filter(tx => !tx.isStartingBalance && tx.assignedCategoryId).length;

    const hasCsvCategories = csvCategories.length > 0;

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-semibold text-white">Categorize Transactions</h3>
                <p className="text-sm text-white/50 mt-0.5">
                    {hasCsvCategories
                        ? 'Map CSV categories to your CashCat categories, or assign by vendor'
                        : 'Assign categories to your transactions by vendor name'
                    }
                </p>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[.03] border border-white/[.06]">
                <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/50">{categorizedTx} / {totalTx} categorized</span>
                        <span className="text-green">{totalTx > 0 ? Math.round((categorizedTx / totalTx) * 100) : 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-green transition-all duration-300"
                            style={{ width: `${totalTx > 0 ? (categorizedTx / totalTx) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* View mode tabs */}
            {hasCsvCategories && (
                <div className="flex rounded-lg bg-white/[.03] border border-white/[.06] p-0.5">
                    <button
                        onClick={() => setViewMode('vendors')}
                        className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                            viewMode === 'vendors' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
                        }`}
                    >
                        By Vendor
                    </button>
                    <button
                        onClick={() => setViewMode('categories')}
                        className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                            viewMode === 'categories' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
                        }`}
                    >
                        By CSV Category
                    </button>
                </div>
            )}

            {/* Category mapping view */}
            {viewMode === 'categories' && hasCsvCategories && (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {csvCategories.map(({ name, count }) => {
                        const action = categoryActions[name];
                        const actionType = action?.type || (isOnboarding ? 'create' : 'skip');

                        return (
                            <CategoryRow
                                key={name}
                                csvCategoryName={name}
                                count={count}
                                action={action}
                                actionType={actionType}
                                existingCategories={existingCategories}
                                categoryOptions={categoryOptions}
                                groupOptions={groupOptions}
                                newGroupNames={newGroupNames}
                                onAction={(act) => onCategoryAction(name, act)}
                                onNewGroupName={(catName, groupName) =>
                                    setNewGroupNames(prev => ({ ...prev, [catName]: groupName }))
                                }
                            />
                        );
                    })}
                </div>
            )}

            {/* Vendor mapping view */}
            {(viewMode === 'vendors' || !hasCsvCategories) && (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    <p className="text-xs text-white/40 mb-1">
                        Assign a category to a vendor — all transactions from that vendor will be auto-categorized.
                    </p>
                    {uniqueVendors.map(({ normalized, original, count }) => {
                        const currentRuleId = vendorCategoryRules[normalized] || '';

                        return (
                            <div key={normalized} className="flex items-center gap-3 p-3 rounded-lg bg-white/[.02] border border-white/[.06] hover:bg-white/[.04] transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{original}</p>
                                    <p className="text-xs text-white/40">{count} transaction{count > 1 ? 's' : ''}</p>
                                </div>
                                <div className="w-48 shrink-0">
                                    <GroupedDropdown
                                        options={categoryOptions}
                                        value={currentRuleId}
                                        onChange={(val) => onVendorRule(original, val)}
                                        placeholder="Category..."
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tip */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[.03] border border-white/[.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green/50 mt-0.5 shrink-0">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
                <p className="text-xs text-white/40">
                    You don&apos;t have to categorize everything now. Uncategorized transactions can be categorized later from the transactions page.
                </p>
            </div>
        </div>
    );
}

// ─── Sub-component: Category Row ─────────────────────────────────────────────

interface CategoryRowProps {
    csvCategoryName: string;
    count: number;
    action: CategoryAction | undefined;
    actionType: string;
    existingCategories: ExistingCategory[];
    categoryOptions: { value: string; label: string; group: string }[];
    groupOptions: { value: string; label: string }[];
    newGroupNames: Record<string, string>;
    onAction: (action: CategoryAction) => void;
    onNewGroupName: (catName: string, groupName: string) => void;
}

function CategoryRow({
    csvCategoryName,
    count,
    action,
    actionType,
    existingCategories,
    categoryOptions,
    groupOptions,
    newGroupNames,
    onAction,
    onNewGroupName,
}: CategoryRowProps) {
    const [mode, setMode] = useState<'merge' | 'create' | 'skip'>(
        actionType as 'merge' | 'create' | 'skip'
    );

    const handleModeChange = (newMode: string) => {
        const m = newMode as 'merge' | 'create' | 'skip';
        setMode(m);
        if (m === 'skip') {
            onAction({ type: 'skip' });
        } else if (m === 'create') {
            const defaultGroup = groupOptions.length > 1 ? groupOptions[0].value : 'new:';
            onAction({
                type: 'create',
                name: csvCategoryName,
                groupId: defaultGroup,
                groupName: defaultGroup === 'new:' ? 'Imported' : groupOptions[0]?.label || 'Imported',
            });
        }
    };

    return (
        <div className="p-3 rounded-lg bg-white/[.02] border border-white/[.06] space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{csvCategoryName}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                        {count}
                    </span>
                </div>
                <Dropdown
                    options={[
                        { value: 'merge', label: 'Merge with existing' },
                        { value: 'create', label: 'Create new' },
                        { value: 'skip', label: 'Leave uncategorized' },
                    ]}
                    value={mode}
                    onChange={handleModeChange}
                    className="w-44"
                />
            </div>

            {mode === 'merge' && (
                <GroupedDropdown
                    options={categoryOptions}
                    value={action?.type === 'merge' ? action.targetCategoryId : ''}
                    onChange={(val) => {
                        const cat = existingCategories.find(c => c.id === val);
                        if (cat) {
                            onAction({ type: 'merge', targetCategoryId: val, targetCategoryName: cat.name });
                        }
                    }}
                    placeholder="Select CashCat category..."
                />
            )}

            {mode === 'create' && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={action?.type === 'create' ? action.name : csvCategoryName}
                        onChange={(e) => {
                            const groupId = action?.type === 'create' ? action.groupId : groupOptions[0]?.value || 'new:';
                            const groupName = action?.type === 'create' ? action.groupName : groupOptions[0]?.label || 'Imported';
                            onAction({ type: 'create', name: e.target.value, groupId, groupName });
                        }}
                        className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 focus:border-green focus:outline-none text-sm text-white"
                        placeholder="Category name"
                    />
                    <div className="w-40">
                        <Dropdown
                            options={groupOptions}
                            value={action?.type === 'create' ? action.groupId : ''}
                            onChange={(val) => {
                                if (val === 'new:') {
                                    const groupName = newGroupNames[csvCategoryName] || 'Imported';
                                    onAction({
                                        type: 'create',
                                        name: action?.type === 'create' ? action.name : csvCategoryName,
                                        groupId: `new:${groupName}`,
                                        groupName,
                                    });
                                } else {
                                    const group = groupOptions.find(g => g.value === val);
                                    onAction({
                                        type: 'create',
                                        name: action?.type === 'create' ? action.name : csvCategoryName,
                                        groupId: val,
                                        groupName: group?.label || '',
                                    });
                                }
                            }}
                            placeholder="Group..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
