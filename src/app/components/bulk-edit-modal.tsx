'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useCategories } from '../hooks/useCategories';
import { useVendors } from '../hooks/useVendors';
import { useTransactions, type TransactionWithDetails } from '../hooks/useTransactions';
import {
    useBulkUpdateTransactions,
    useBulkDeleteTransactions,
    useSetVendorCategory,
    useBulkReassignVendor,
} from '../hooks/useBulkTransactionMutations';
import { formatCurrency } from './charts/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BulkEditModalProps = {
    isOpen: boolean;
    onClose: () => void;
    /** Optional pre-selection of transaction IDs (e.g. opened from a right-click action) */
    initialSelection?: string[];
    /** When true, the select view only shows uncategorised payment transactions */
    filterUncategorised?: boolean;
};

type View =
    | 'select'                // Step 1: choose transactions
    | 'actions'               // Step 2: choose what to do with the selection
    | 'set-category'          // bulk set same category on all selected
    | 'set-vendor'            // bulk reassign vendor on selected
    | 'categorise-by-vendor'  // walk through selected transactions vendor-by-vendor
    | 'vendor-category'       // set category for ALL transactions from a vendor (entire history)
    | 'delete-confirm';       // confirm bulk delete

type CategoryWithGroup = {
    id: string;
    name: string;
    groups: { name: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Group categories by their group name for display
function groupCategories(cats: CategoryWithGroup[]) {
    const map = new Map<string, CategoryWithGroup[]>();
    for (const c of cats) {
        const g = c.groups?.name ?? 'Uncategorised';
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(c);
    }
    return map;
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export default function BulkEditModal({ isOpen, onClose, initialSelection, filterUncategorised }: BulkEditModalProps) {
    const { data: allTransactions = [] } = useTransactions();
    const { data: categories = [] } = useCategories();
    const { data: vendors = [] } = useVendors();

    const bulkUpdateMutation = useBulkUpdateTransactions();
    const bulkDeleteMutation = useBulkDeleteTransactions();
    const setVendorCategoryMutation = useSetVendorCategory();
    const bulkReassignVendorMutation = useBulkReassignVendor();

    // ── View / selection state ────────────────────────────────────────────────
    const [view, setView] = useState<View>('select');
    const [isClosing, setIsClosing] = useState(false);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Category picker state (used in set-category and vendor-category views)
    const [catSearch, setCatSearch] = useState('');
    const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null);

    // Vendor picker state (set-vendor view)
    const [vendorSearch, setVendorSearch] = useState('');
    const [pickedVendorId, setPickedVendorId] = useState<string | null>(null);

    // Vendor-category view: which vendor are we acting on? (entire-history mode)
    const [vendorCatTarget, setVendorCatTarget] = useState<{
        vendorName: string;
        vendorId: string | null;
        txCount: number;
    } | null>(null);
    const [vendorCatSearch, setVendorCatSearch] = useState('');
    const [pickedVendorCatCategoryId, setPickedVendorCatCategoryId] = useState<string | null>(null);

    // Categorise-by-vendor queue: walk through selected transactions vendor-by-vendor
    const [vendorQueueIndex, setVendorQueueIndex] = useState(0);
    const [vendorQueueCatSearch, setVendorQueueCatSearch] = useState('');
    const [vendorQueuePickedCatId, setVendorQueuePickedCatId] = useState<string | null>(null);

    // ── Derived data ──────────────────────────────────────────────────────────

    // Only regular (non-starting) transactions
    const userTransactions = useMemo(
        () => allTransactions.filter(t => t.type !== 'starting'),
        [allTransactions]
    );

    // When filterUncategorised is active, restrict the visible list
    const displayTransactions = useMemo(
        () => filterUncategorised
            ? userTransactions.filter(t => t.type === 'payment' && !t.category_id)
            : userTransactions,
        [userTransactions, filterUncategorised]
    );

    const filteredTransactions = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return displayTransactions;
        return displayTransactions.filter(t => {
            const vendor = t.vendors?.name || t.vendor || '';
            const cat = t.categories?.name || '';
            const desc = t.description || '';
            const amount = Math.abs(t.amount).toString();
            return (
                vendor.toLowerCase().includes(q) ||
                cat.toLowerCase().includes(q) ||
                desc.toLowerCase().includes(q) ||
                amount.includes(q) ||
                t.date.includes(q)
            );
        });
    }, [userTransactions, searchQuery]);

    const selectedTransactions = useMemo(
        () => userTransactions.filter(t => selectedIds.has(t.id)),
        [userTransactions, selectedIds]
    );

    // Transaction count per vendor (for vendor-category view)
    const txCountByVendor = useMemo(() => {
        const map = new Map<string, { count: number; vendorId: string | null }>();
        for (const t of userTransactions) {
            const name = t.vendors?.name || t.vendor || '';
            if (!name) continue;
            const existing = map.get(name);
            map.set(name, {
                count: (existing?.count ?? 0) + 1,
                vendorId: t.vendors?.id ?? t.vendor_id ?? null,
            });
        }
        return map;
    }, [userTransactions]);

    // Sorted vendor list for vendor-category view (entire history counts)
    const vendorList = useMemo(
        () =>
            [...txCountByVendor.entries()]
                .map(([name, { count, vendorId }]) => ({ name, count, vendorId }))
                .sort((a, b) => b.count - a.count),
        [txCountByVendor]
    );

    // Vendor queue for categorise-by-vendor: distinct vendors in the current selection, in order
    const vendorQueue = useMemo(() => {
        const seen = new Map<string, { vendorId: string | null; ids: string[] }>();
        for (const t of selectedTransactions) {
            const name = t.vendors?.name || t.vendor || '(No vendor)';
            const vendorId = t.vendors?.id ?? t.vendor_id ?? null;
            if (!seen.has(name)) seen.set(name, { vendorId, ids: [] });
            seen.get(name)!.ids.push(t.id);
        }
        return [...seen.entries()].map(([name, { vendorId, ids }]) => ({ name, vendorId, ids }));
    }, [selectedTransactions]);

    // Grouped categories for pickers
    const groupedCategories = useMemo(() => groupCategories(categories as CategoryWithGroup[]), [categories]);

    const filteredGroupedCategories = useMemo(() => {
        const q = catSearch.toLowerCase().trim();
        if (!q) return groupedCategories;
        const out = new Map<string, CategoryWithGroup[]>();
        for (const [g, cats] of groupedCategories) {
            const filtered = cats.filter(c => c.name.toLowerCase().includes(q) || g.toLowerCase().includes(q));
            if (filtered.length) out.set(g, filtered);
        }
        return out;
    }, [groupedCategories, catSearch]);

    const filteredGroupedCategoriesVendorCat = useMemo(() => {
        const q = vendorCatSearch.toLowerCase().trim();
        if (!q) return groupedCategories;
        const out = new Map<string, CategoryWithGroup[]>();
        for (const [g, cats] of groupedCategories) {
            const filtered = cats.filter(c => c.name.toLowerCase().includes(q) || g.toLowerCase().includes(q));
            if (filtered.length) out.set(g, filtered);
        }
        return out;
    }, [groupedCategories, vendorCatSearch]);

    // Filtered vendors for vendor-reassign picker
    const filteredVendors = useMemo(() => {
        const q = vendorSearch.toLowerCase().trim();
        return q ? vendors.filter(v => v.name.toLowerCase().includes(q)) : vendors;
    }, [vendors, vendorSearch]);

    // ── Effects ───────────────────────────────────────────────────────────────

    // Apply initial selection when modal opens
    useEffect(() => {
        if (isOpen && initialSelection && initialSelection.length > 0) {
            setSelectedIds(new Set(initialSelection));
            setView('actions');
        } else if (isOpen && filterUncategorised) {
            // Pre-select all uncategorised payment transactions
            const ids = allTransactions
                .filter(t => t.type === 'payment' && !t.category_id)
                .map(t => t.id);
            setSelectedIds(new Set(ids));
            if (ids.length > 0) setView('actions');
        }
    }, [isOpen, initialSelection, filterUncategorised]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setView('select');
            setSelectedIds(new Set());
            setSearchQuery('');
            setCatSearch('');
            setPickedCategoryId(null);
            setVendorSearch('');
            setPickedVendorId(null);
            setVendorCatTarget(null);
            setVendorCatSearch('');
            setPickedVendorCatCategoryId(null);
            setVendorQueueIndex(0);
            setVendorQueueCatSearch('');
            setVendorQueuePickedCatId(null);
        }
    }, [isOpen]);

    // Body scroll lock
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => { setIsClosing(false); onClose(); }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const goBack = () => {
        if (view === 'actions') setView('select');
        else if (view === 'categorise-by-vendor') {
            setVendorQueueIndex(0);
            setVendorQueueCatSearch('');
            setVendorQueuePickedCatId(null);
            setView('actions');
        } else if (view === 'vendor-category') setView('actions');
        else setView('actions');
        setCatSearch('');
        setPickedCategoryId(null);
        setVendorSearch('');
        setPickedVendorId(null);
        setVendorCatSearch('');
        setPickedVendorCatCategoryId(null);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    const clearAll = () => setSelectedIds(new Set());

    const invertSelection = () => {
        setSelectedIds(new Set(filteredTransactions.filter(t => !selectedIds.has(t.id)).map(t => t.id)));
    };

    // Select all transactions from a specific vendor
    const selectByVendor = (vendorName: string) => {
        const ids = userTransactions
            .filter(t => (t.vendors?.name || t.vendor) === vendorName)
            .map(t => t.id);
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
    };

    // Select all transactions with a specific category
    const selectByCategory = (categoryId: string) => {
        const ids = userTransactions
            .filter(t => t.category_id === categoryId)
            .map(t => t.id);
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
    };

    // ── Bulk Actions ──────────────────────────────────────────────────────────

    const handleBulkSetCategory = () => {
        if (!pickedCategoryId || selectedIds.size === 0) return;
        const ids = [...selectedIds];
        toast.promise(
            bulkUpdateMutation.mutateAsync({ ids, updates: { category_id: pickedCategoryId } }),
            {
                loading: `Updating ${ids.length} transaction${ids.length !== 1 ? 's' : ''}…`,
                success: `Updated ${ids.length} transaction${ids.length !== 1 ? 's' : ''}`,
                error: 'Failed to update transactions',
            }
        ).then(() => {
            setPickedCategoryId(null);
            setCatSearch('');
            setView('actions');
        }).catch(() => { });
    };

    const handleBulkReassignVendor = () => {
        if (!pickedVendorId || selectedIds.size === 0) return;
        const vendor = vendors.find(v => v.id === pickedVendorId);
        if (!vendor) return;
        const ids = [...selectedIds];
        toast.promise(
            bulkReassignVendorMutation.mutateAsync({ ids, vendorId: vendor.id, vendorName: vendor.name }),
            {
                loading: `Updating ${ids.length} transaction${ids.length !== 1 ? 's' : ''}…`,
                success: `Updated ${ids.length} transaction${ids.length !== 1 ? 's' : ''}`,
                error: 'Failed to update transactions',
            }
        ).then(() => {
            setPickedVendorId(null);
            setVendorSearch('');
            setView('actions');
        }).catch(() => { });
    };

    const handleBulkDelete = () => {
        const ids = [...selectedIds];
        toast.promise(
            bulkDeleteMutation.mutateAsync(ids),
            {
                loading: `Deleting ${ids.length} transaction${ids.length !== 1 ? 's' : ''}…`,
                success: `Deleted ${ids.length} transaction${ids.length !== 1 ? 's' : ''}`,
                error: 'Failed to delete transactions',
            }
        ).then(() => {
            setSelectedIds(new Set());
            setView('select');
        }).catch(() => { });
    };

    const handleSetVendorCategory = () => {
        if (!vendorCatTarget || !pickedVendorCatCategoryId) return;
        toast.promise(
            setVendorCategoryMutation.mutateAsync({
                vendorName: vendorCatTarget.vendorName,
                vendorId: vendorCatTarget.vendorId,
                categoryId: pickedVendorCatCategoryId,
            }),
            {
                loading: `Updating ${vendorCatTarget.txCount} transaction${vendorCatTarget.txCount !== 1 ? 's' : ''}…`,
                success: `All "${vendorCatTarget.vendorName}" transactions recategorised`,
                error: 'Failed to update transactions',
            }
        ).then(() => {
            setVendorCatTarget(null);
            setPickedVendorCatCategoryId(null);
            setVendorCatSearch('');
            setView('actions');
        }).catch(() => { });
    };

    // Vendor queue: apply category to current vendor's selected transactions, advance to next
    const handleVendorQueueApply = () => {
        if (!vendorQueuePickedCatId || vendorQueue.length === 0) return;
        const current = vendorQueue[vendorQueueIndex];
        const isLast = vendorQueueIndex >= vendorQueue.length - 1;
        toast.promise(
            bulkUpdateMutation.mutateAsync({ ids: current.ids, updates: { category_id: vendorQueuePickedCatId } }),
            {
                loading: `Categorising ${current.ids.length} "${current.name}" transaction${current.ids.length !== 1 ? 's' : ''}…`,
                success: `"${current.name}" categorised`,
                error: 'Failed to update',
            }
        ).then(() => {
            setVendorQueuePickedCatId(null);
            setVendorQueueCatSearch('');
            if (isLast) {
                setVendorQueueIndex(0);
                setView('actions');
            } else {
                setVendorQueueIndex(i => i + 1);
            }
        }).catch(() => { });
    };

    const handleVendorQueueSkip = () => {
        const isLast = vendorQueueIndex >= vendorQueue.length - 1;
        setVendorQueuePickedCatId(null);
        setVendorQueueCatSearch('');
        if (isLast) {
            setVendorQueueIndex(0);
            setView('actions');
        } else {
            setVendorQueueIndex(i => i + 1);
        }
    };

    // ── Title helper ──────────────────────────────────────────────────────────
    const title = {
        select: 'Bulk Edit',
        actions: `${selectedIds.size} Selected`,
        'set-category': 'Set Category',
        'set-vendor': 'Reassign Vendor',
        'categorise-by-vendor': 'Categorise by Vendor',
        'vendor-category': 'Set Vendor Category',
        'delete-confirm': 'Delete Transactions',
    }[view];

    const showBack = view !== 'select';

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-[#111] md:bg-white/[.03] md:rounded-lg border-b-4 border-b-green/60 w-full md:max-w-2xl min-h-[100dvh] md:min-h-0 flex flex-col ${isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'}`}
            >
                {/* ── Header ── */}
                <div className="flex justify-between items-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 border-b border-white/[.12] flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {showBack && (
                            <button
                                onClick={goBack}
                                className="p-1.5 hover:bg-white/[.06] rounded-lg transition-colors mr-1"
                                aria-label="Back"
                            >
                                <Image src="/chevron-left.svg" alt="Back" width={18} height={18} className="opacity-70" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold">{title}</h2>
                            {view === 'select' && userTransactions.length > 0 && (
                                <p className="text-xs text-white/40 mt-0.5">
                                    {selectedIds.size} of {displayTransactions.length} selected
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/[.05] rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <Image src="/plus.svg" alt="Close" width={16} height={16} className="opacity-80 invert rotate-45" />
                    </button>
                </div>

                {/* ── SELECT VIEW ───────────────────────────────────────────── */}
                {view === 'select' && (
                    <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                        {/* Uncategorised filter notice */}
                        {filterUncategorised && (
                            <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex-shrink-0">
                                Showing only uncategorised payment transactions
                            </div>
                        )}
                        {/* Toolbar */}
                        <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search transactions…"
                                    className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                />
                                <Image src="/magnify.svg" alt="" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert" />
                            </div>
                        </div>

                        {/* Quick-select bar */}
                        <div className="flex items-center gap-2 px-3 pb-2 flex-wrap flex-shrink-0">
                            <button onClick={selectAll} className="text-xs px-2.5 py-1 rounded-md bg-white/[.07] hover:bg-white/[.12] transition-colors text-white/70">
                                All
                            </button>
                            <button onClick={clearAll} className="text-xs px-2.5 py-1 rounded-md bg-white/[.07] hover:bg-white/[.12] transition-colors text-white/70">
                                None
                            </button>
                            <button onClick={invertSelection} className="text-xs px-2.5 py-1 rounded-md bg-white/[.07] hover:bg-white/[.12] transition-colors text-white/70">
                                Invert
                            </button>
                            <span className="text-white/20 text-xs">|</span>
                            <span className="text-xs text-white/40">Select by:</span>
                            {/* Vendor quick-select dropdown */}
                            <VendorQuickSelect
                                vendorList={vendorList}
                                onSelect={selectByVendor}
                            />
                            {/* Category quick-select dropdown */}
                            <CategoryQuickSelect
                                categories={categories as CategoryWithGroup[]}
                                onSelect={selectByCategory}
                            />
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
                            {filteredTransactions.length === 0 ? (
                                <div className="text-center text-white/40 py-12 text-sm">
                                    {displayTransactions.length === 0
                                        ? (filterUncategorised ? 'No uncategorised transactions.' : 'No transactions yet.')
                                        : 'No matches.'}
                                </div>
                            ) : (
                                filteredTransactions.map(t => (
                                    <SelectableTransactionRow
                                        key={t.id}
                                        transaction={t}
                                        selected={selectedIds.has(t.id)}
                                        onToggle={() => toggleSelect(t.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/[.12] flex gap-3 flex-shrink-0">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={selectedIds.size === 0}
                                onClick={() => setView('actions')}
                                className="flex-1 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-40 text-sm"
                            >
                                Continue ({selectedIds.size})
                            </button>
                        </div>
                    </div>
                )}

                {/* ── ACTIONS VIEW ──────────────────────────────────────────── */}
                {view === 'actions' && (
                    <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                        {/* Selection summary */}
                        <div className="px-4 py-3 bg-white/[.03] border-b border-white/[.08] flex-shrink-0">
                            <p className="text-xs text-white/50 mb-1">Selected transactions</p>
                            <div className="flex gap-4 text-sm">
                                <span className="text-white/80 font-medium">{selectedIds.size} items</span>
                                <span className={`font-semibold tabular-nums ${selectedTransactions.reduce((s, t) => s + t.amount, 0) < 0 ? 'text-reddy' : 'text-green'}`}>
                                    {formatCurrency(selectedTransactions.reduce((s, t) => s + t.amount, 0))}
                                </span>
                            </div>
                            <button
                                onClick={() => setView('select')}
                                className="text-xs text-green/70 hover:text-green mt-1 transition-colors"
                            >
                                Edit selection →
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                            {/* ── Action: Set Category ── */}
                            <ActionButton
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>}
                                label="Set Category"
                                description={`Assign a single category to all ${selectedIds.size} transactions`}
                                onClick={() => { setCatSearch(''); setPickedCategoryId(null); setView('set-category'); }}
                            />

                            {/* ── Action: Reassign Vendor ── */}
                            <ActionButton
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                                label="Reassign Vendor"
                                description={`Change the vendor for all ${selectedIds.size} selected transactions`}
                                onClick={() => { setVendorSearch(''); setPickedVendorId(null); setView('set-vendor'); }}
                            />

                            {/* ── Action: Categorise by vendor (scoped to selection) ── */}
                            <ActionButton
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /><polyline points="16 3 21 8 16 13" /><line x1="21" y1="8" x2="9" y2="8" /></svg>}
                                label="Categorise by Vendor"
                                description={`Go through the ${[...new Set(selectedTransactions.map(t => t.vendors?.name || t.vendor || ''))].filter(Boolean).length || selectedIds.size} vendor${[...new Set(selectedTransactions.map(t => t.vendors?.name || t.vendor || ''))].filter(Boolean).length !== 1 ? 's' : ''} in your selection and assign each a category`}
                                onClick={() => { setVendorQueueIndex(0); setVendorQueueCatSearch(''); setVendorQueuePickedCatId(null); setView('categorise-by-vendor'); }}
                            />

                            {/* ── Action: Apply category to entire history by vendor ── */}
                            <ActionButton
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>}
                                label="Apply to Entire History by Vendor"
                                description="Set a category for every transaction from a vendor — across your whole transaction history"
                                onClick={() => { setVendorCatTarget(null); setVendorCatSearch(''); setPickedVendorCatCategoryId(null); setView('vendor-category'); }}
                            />

                            {/* ── Action: Delete ── */}
                            <ActionButton
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>}
                                label="Delete Selected"
                                description={`Permanently delete all ${selectedIds.size} selected transactions`}
                                danger
                                onClick={() => setView('delete-confirm')}
                            />
                        </div>
                    </div>
                )}

                {/* ── SET CATEGORY VIEW ─────────────────────────────────────── */}
                {view === 'set-category' && (
                    <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                        <div className="px-3 pt-3 pb-2 flex-shrink-0">
                            <p className="text-xs text-white/50 mb-2 px-1">
                                Assign a category to <strong className="text-white/80">{selectedIds.size}</strong> selected transaction{selectedIds.size !== 1 ? 's' : ''}.
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={catSearch}
                                    onChange={e => setCatSearch(e.target.value)}
                                    placeholder="Search categories…"
                                    className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                />
                                <Image src="/magnify.svg" alt="" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert" />
                            </div>
                        </div>
                        <CategoryPicker
                            groupedCategories={filteredGroupedCategories}
                            selected={pickedCategoryId}
                            onSelect={setPickedCategoryId}
                        />
                        <div className="p-4 border-t border-white/[.12] flex gap-3 flex-shrink-0">
                            <button onClick={goBack} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Back</button>
                            <button
                                onClick={handleBulkSetCategory}
                                disabled={!pickedCategoryId || bulkUpdateMutation.isPending}
                                className="flex-1 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-40 text-sm"
                            >
                                {bulkUpdateMutation.isPending ? 'Saving…' : 'Apply'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SET VENDOR VIEW ───────────────────────────────────────── */}
                {view === 'set-vendor' && (
                    <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                        <div className="px-3 pt-3 pb-2 flex-shrink-0">
                            <p className="text-xs text-white/50 mb-2 px-1">
                                Reassign vendor on <strong className="text-white/80">{selectedIds.size}</strong> transaction{selectedIds.size !== 1 ? 's' : ''}.
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={vendorSearch}
                                    onChange={e => setVendorSearch(e.target.value)}
                                    placeholder="Search vendors…"
                                    className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                />
                                <Image src="/magnify.svg" alt="" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
                            {filteredVendors.length === 0 ? (
                                <p className="text-center text-white/40 py-8 text-sm">No vendors found.</p>
                            ) : filteredVendors.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setPickedVendorId(v.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors border ${pickedVendorId === v.id
                                        ? 'bg-green/10 border-green/40 text-white'
                                        : 'bg-white/[.03] border-white/[.08] text-white/70 hover:bg-white/[.07]'}`}
                                >
                                    <span className="font-medium">{v.name}</span>
                                    {pickedVendorId === v.id && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/[.12] flex gap-3 flex-shrink-0">
                            <button onClick={goBack} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Back</button>
                            <button
                                onClick={handleBulkReassignVendor}
                                disabled={!pickedVendorId || bulkReassignVendorMutation.isPending}
                                className="flex-1 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-40 text-sm"
                            >
                                {bulkReassignVendorMutation.isPending ? 'Saving…' : 'Apply'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── CATEGORISE BY VENDOR VIEW ─────────────────────────────── */}
                {view === 'categorise-by-vendor' && (() => {
                    if (vendorQueue.length === 0) {
                        return (
                            <div className="flex flex-col flex-1 items-center justify-center p-8 gap-4">
                                <p className="text-white/50 text-sm text-center">No vendors found in your selection.</p>
                                <button onClick={goBack} className="px-4 py-2 bg-white/[.07] rounded-lg text-sm text-white/70">Back</button>
                            </div>
                        );
                    }
                    const current = vendorQueue[Math.min(vendorQueueIndex, vendorQueue.length - 1)];
                    const progress = `${Math.min(vendorQueueIndex, vendorQueue.length - 1) + 1} of ${vendorQueue.length}`;
                    const filteredCats = (() => {
                        const q = vendorQueueCatSearch.toLowerCase().trim();
                        if (!q) return groupedCategories;
                        const out = new Map<string, CategoryWithGroup[]>();
                        for (const [g, cats] of groupedCategories) {
                            const f = cats.filter(c => c.name.toLowerCase().includes(q) || g.toLowerCase().includes(q));
                            if (f.length) out.set(g, f);
                        }
                        return out;
                    })();
                    return (
                        <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                            {/* Progress bar */}
                            <div className="flex-shrink-0 px-4 pt-3 pb-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-white/40">{progress} vendors</span>
                                    <span className="text-xs text-white/40">{current.ids.length} transaction{current.ids.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/[.08] overflow-hidden">
                                    <div
                                        className="h-full bg-green rounded-full transition-all duration-300"
                                        style={{ width: `${((Math.min(vendorQueueIndex, vendorQueue.length - 1)) / vendorQueue.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                            {/* Vendor card */}
                            <div className="flex-shrink-0 mx-4 mt-3 p-3 bg-white/[.05] rounded-lg border border-white/[.10]">
                                <p className="text-xs text-white/40 mb-0.5">Vendor</p>
                                <p className="font-semibold text-white text-base">{current.name}</p>
                                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                                    {current.ids.map(id => {
                                        const tx = selectedTransactions.find(t => t.id === id);
                                        if (!tx) return null;
                                        return (
                                            <div key={id} className="flex items-center justify-between text-xs text-white/50">
                                                <span>{formatDate(tx.date)}</span>
                                                <span className={`tabular-nums font-medium ${tx.amount < 0 ? 'text-reddy/80' : 'text-green/80'}`}>{formatCurrency(tx.amount)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Category search */}
                            <div className="flex-shrink-0 px-4 pt-3 pb-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={vendorQueueCatSearch}
                                        onChange={e => { setVendorQueueCatSearch(e.target.value); setVendorQueuePickedCatId(null); }}
                                        placeholder="Search categories…"
                                        className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                    />
                                    <Image src="/magnify.svg" alt="" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert" />
                                </div>
                            </div>
                            <CategoryPicker
                                groupedCategories={filteredCats}
                                selected={vendorQueuePickedCatId}
                                onSelect={setVendorQueuePickedCatId}
                            />
                            <div className="p-4 border-t border-white/[.12] flex gap-3 flex-shrink-0">
                                <button
                                    onClick={handleVendorQueueSkip}
                                    className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleVendorQueueApply}
                                    disabled={!vendorQueuePickedCatId || bulkUpdateMutation.isPending}
                                    className="flex-2 px-6 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-40 text-sm"
                                >
                                    {bulkUpdateMutation.isPending ? 'Saving…' : vendorQueueIndex >= vendorQueue.length - 1 ? 'Apply & Finish' : 'Apply & Next →'}
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* ── VENDOR-CATEGORY VIEW ──────────────────────────────────── */}
                {view === 'vendor-category' && (
                    <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                        {!vendorCatTarget ? (
                            // Step 1: pick vendor
                            <>
                                <div className="px-3 pt-3 pb-2 flex-shrink-0">
                                    <p className="text-xs text-white/50 mb-2 px-1">
                                        Choose a vendor — its category will be applied to every matching transaction in your history.
                                    </p>
                                </div>
                                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
                                    {vendorList.map(v => (
                                        <button
                                            key={v.name}
                                            onClick={() => setVendorCatTarget({ vendorName: v.name, vendorId: v.vendorId, txCount: v.count })}
                                            className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between bg-white/[.03] border border-white/[.08] text-white/70 hover:bg-white/[.07] transition-colors"
                                        >
                                            <span className="font-medium truncate">{v.name}</span>
                                            <span className="text-xs text-white/40 flex-shrink-0 ml-2">{v.count} tx</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            // Step 2: pick category for chosen vendor
                            <>
                                <div className="px-3 pt-3 pb-2 flex-shrink-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button
                                            onClick={() => { setVendorCatTarget(null); setPickedVendorCatCategoryId(null); }}
                                            className="text-xs text-green/70 hover:text-green transition-colors"
                                        >
                                            ← Change vendor
                                        </button>
                                    </div>
                                    <div className="p-2.5 bg-white/[.05] rounded-lg border border-white/[.10] mb-2">
                                        <p className="text-xs text-white/40">Vendor</p>
                                        <p className="font-semibold text-white/90 text-sm">{vendorCatTarget.vendorName}</p>
                                        <p className="text-xs text-white/40 mt-0.5">{vendorCatTarget.txCount} transaction{vendorCatTarget.txCount !== 1 ? 's' : ''} will be updated</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={vendorCatSearch}
                                            onChange={e => setVendorCatSearch(e.target.value)}
                                            placeholder="Search categories…"
                                            className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                        />
                                        <Image src="/magnify.svg" alt="" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert" />
                                    </div>
                                </div>
                                <CategoryPicker
                                    groupedCategories={filteredGroupedCategoriesVendorCat}
                                    selected={pickedVendorCatCategoryId}
                                    onSelect={setPickedVendorCatCategoryId}
                                />
                                <div className="p-4 border-t border-white/[.12] flex gap-3 flex-shrink-0">
                                    <button onClick={goBack} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Back</button>
                                    <button
                                        onClick={handleSetVendorCategory}
                                        disabled={!pickedVendorCatCategoryId || setVendorCategoryMutation.isPending}
                                        className="flex-1 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-40 text-sm"
                                    >
                                        {setVendorCategoryMutation.isPending ? 'Saving…' : 'Apply to All'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── DELETE CONFIRM VIEW ───────────────────────────────────── */}
                {view === 'delete-confirm' && (
                    <div className="flex flex-col flex-1 min-h-0 md:max-h-[80vh]">
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
                            <div className="p-4 bg-reddy/10 border border-reddy/20 rounded-lg">
                                <p className="text-sm font-medium text-reddy mb-1">This action cannot be undone</p>
                                <p className="text-sm text-white/60">
                                    <strong className="text-white/80">{selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}</strong> will be permanently deleted.
                                </p>
                                <p className="text-sm text-white/50 mt-2 tabular-nums">
                                    Total: <span className={selectedTransactions.reduce((s, t) => s + t.amount, 0) < 0 ? 'text-reddy' : 'text-green'}>
                                        {formatCurrency(selectedTransactions.reduce((s, t) => s + t.amount, 0))}
                                    </span>
                                </p>
                            </div>
                            {/* Preview */}
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                {selectedTransactions.slice(0, 20).map(t => (
                                    <div key={t.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[.03] text-sm">
                                        <span className="text-white/70 truncate">{t.vendors?.name || t.vendor || '—'}</span>
                                        <span className={`tabular-nums font-medium flex-shrink-0 ml-2 ${t.amount < 0 ? 'text-reddy' : 'text-green'}`}>
                                            {formatCurrency(t.amount)}
                                        </span>
                                    </div>
                                ))}
                                {selectedIds.size > 20 && (
                                    <p className="text-xs text-white/30 text-center py-1">…and {selectedIds.size - 20} more</p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/[.12] flex gap-3 flex-shrink-0">
                            <button onClick={goBack} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Cancel</button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteMutation.isPending}
                                className="flex-1 py-3 bg-reddy text-white rounded-lg font-medium hover:bg-old-reddy transition-colors disabled:opacity-50 text-sm"
                            >
                                {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedIds.size}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectableTransactionRow({
    transaction,
    selected,
    onToggle,
}: {
    transaction: TransactionWithDetails;
    selected: boolean;
    onToggle: () => void;
}) {
    const vendorName = transaction.vendors?.name || transaction.vendor || '—';
    const catName = transaction.categories?.name ?? null;

    return (
        <button
            onClick={onToggle}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${selected
                ? 'bg-green/8 border-green/30'
                : 'bg-white/[.02] border-white/[.06] hover:bg-white/[.05]'}`}
        >
            {/* Checkbox */}
            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected ? 'bg-green border-green' : 'border-white/30'}`}>
                {selected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white/85 truncate">{vendorName}</span>
                    <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${transaction.amount < 0 ? 'text-reddy' : 'text-green'}`}>
                        {formatCurrency(transaction.amount)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-white/35">{formatDate(transaction.date)}</span>
                    {catName && (
                        <>
                            <span className="text-white/20 text-xs">·</span>
                            <span className="text-xs text-white/40 truncate">{catName}</span>
                        </>
                    )}
                    {transaction.description && (
                        <>
                            <span className="text-white/20 text-xs">·</span>
                            <span className="text-xs text-white/35 truncate">{transaction.description}</span>
                        </>
                    )}
                </div>
            </div>
        </button>
    );
}

function CategoryPicker({
    groupedCategories,
    selected,
    onSelect,
}: {
    groupedCategories: Map<string, CategoryWithGroup[]>;
    selected: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
            {groupedCategories.size === 0 ? (
                <p className="text-center text-white/40 py-8 text-sm">No categories found.</p>
            ) : (
                [...groupedCategories.entries()].map(([group, cats]) => (
                    <div key={group} className="mb-3">
                        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1 mb-1">{group}</p>
                        <div className="space-y-1">
                            {cats.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => onSelect(c.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors border ${selected === c.id
                                        ? 'bg-green/10 border-green/40 text-white'
                                        : 'bg-white/[.03] border-white/[.08] text-white/70 hover:bg-white/[.07]'}`}
                                >
                                    <span className="font-medium">{c.name}</span>
                                    {selected === c.id && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function ActionButton({
    icon,
    label,
    description,
    danger = false,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3.5 rounded-lg border flex items-start gap-3 transition-colors ${danger
                ? 'bg-reddy/5 border-reddy/20 hover:bg-reddy/10'
                : 'bg-white/[.03] border-white/[.08] hover:bg-white/[.07]'}`}
        >
            <span className={`mt-0.5 flex-shrink-0 ${danger ? 'text-reddy/70' : 'text-white/50'}`}>{icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${danger ? 'text-reddy' : 'text-white/90'}`}>{label}</p>
                <p className="text-xs text-white/40 mt-0.5">{description}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 mt-0.5 ${danger ? 'text-reddy/50' : 'text-white/20'}`}><path d="M9 18l6-6-6-6" /></svg>
        </button>
    );
}

// Small inline dropdowns for quick-select toolbar
function VendorQuickSelect({
    vendorList,
    onSelect,
}: {
    vendorList: { name: string; count: number }[];
    onSelect: (name: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="text-xs px-2.5 py-1 rounded-md bg-white/[.07] hover:bg-white/[.12] transition-colors text-white/70 flex items-center gap-1"
            >
                Vendor
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-[#1c1c1c] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
                    {vendorList.slice(0, 30).map(v => (
                        <button
                            key={v.name}
                            onClick={() => { onSelect(v.name); setOpen(false); }}
                            className="w-full text-left px-3 py-2 flex items-center justify-between text-sm hover:bg-white/5 transition-colors"
                        >
                            <span className="text-white/80 truncate">{v.name}</span>
                            <span className="text-white/30 text-xs flex-shrink-0 ml-2">{v.count}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function CategoryQuickSelect({
    categories,
    onSelect,
}: {
    categories: CategoryWithGroup[];
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="text-xs px-2.5 py-1 rounded-md bg-white/[.07] hover:bg-white/[.12] transition-colors text-white/70 flex items-center gap-1"
            >
                Category
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-[#1c1c1c] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => { onSelect(c.id); setOpen(false); }}
                            className="w-full text-left px-3 py-2 flex items-center justify-between text-sm hover:bg-white/5 transition-colors"
                        >
                            <span className="text-white/80 truncate">{c.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
