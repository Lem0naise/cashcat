'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useVendors } from '../hooks/useVendors';
import { useTransactions } from '../hooks/useTransactions';
import {
    useRenameVendor,
    useMergeVendors,
    useDeleteVendor,
    usePruneOrphanVendors,
} from '../hooks/useVendorManagement';

type VendorManagerModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type View = 'list' | 'rename' | 'merge' | 'delete';

/**
 * Transaction types that represent system-generated / internal entries.
 * Vendors whose transactions are exclusively these types should be hidden from
 * the management UI — they are internal bookkeeping entries, not real payees.
 */
const SYSTEM_TRANSACTION_TYPES = new Set(['starting']);

/** Bigram similarity — same logic as duplicate-detection.ts */
function stringSimilarity(a: string, b: string): number {
    const la = a.toLowerCase().trim();
    const lb = b.toLowerCase().trim();
    if (la === lb) return 1;
    if (!la || !lb) return 0;
    if (la.includes(lb) || lb.includes(la)) {
        return Math.min(la.length, lb.length) / Math.max(la.length, lb.length);
    }
    const getBigrams = (s: string) => {
        const set = new Set<string>();
        for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
        return set;
    };
    const ba = getBigrams(la);
    const bb = getBigrams(lb);
    let intersection = 0;
    for (const b of ba) { if (bb.has(b)) intersection++; }
    const union = ba.size + bb.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

/** Group pairs of vendors that look similar (score >= threshold). */
function findSimilarPairs(names: string[], threshold = 0.65) {
    const pairs: Array<{ a: string; b: string; score: number }> = [];
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            // Skip only if the names are byte-for-byte identical (already the same vendor)
            if (names[i] === names[j]) continue;
            const score = stringSimilarity(names[i], names[j]);
            if (score >= threshold) {
                pairs.push({ a: names[i], b: names[j], score });
            }
        }
    }
    return pairs.sort((x, y) => y.score - x.score);
}

export default function VendorManagerModal({ isOpen, onClose }: VendorManagerModalProps) {
    const { data: vendors = [] } = useVendors();
    const { data: transactions = [] } = useTransactions();

    const renameMutation = useRenameVendor();
    const mergeMutation = useMergeVendors();
    const deleteMutation = useDeleteVendor();
    const pruneMutation = usePruneOrphanVendors();

    const [view, setView] = useState<View>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // Rename state
    const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

    // Merge state
    const [mergeSource, setMergeSource] = useState<{ id: string; name: string } | null>(null);
    const [mergeTarget, setMergeTarget] = useState<{ id: string; name: string } | null>(null);
    const [mergeSearchQuery, setMergeSearchQuery] = useState('');

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Tab state within list view
    const [tab, setTab] = useState<'all' | 'similar' | 'orphans'>('all');

    // --- Derived data ---

    /** How many transactions reference each vendor (by text field) */
    const txCountByName = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const t of transactions) {
            if (t.type === 'starting') continue;
            const name = t.vendor || '';
            if (name) counts[name] = (counts[name] || 0) + 1;
        }
        return counts;
    }, [transactions]);

    /**
     * Set of vendor IDs that are exclusively linked to system transaction types
     * (e.g. type='starting'). These are hidden from all management UI.
     */
    const systemVendorIds = useMemo(() => {
        const ids = new Set<string>();
        for (const vendor of vendors) {
            const vendorTxs = transactions.filter(
                t => t.vendor_id === vendor.id || t.vendor === vendor.name
            );
            if (vendorTxs.length > 0 && vendorTxs.every(t => SYSTEM_TRANSACTION_TYPES.has(t.type ?? ''))) {
                ids.add(vendor.id);
            }
        }
        return ids;
    }, [vendors, transactions]);

    /** All vendors excluding system/internal ones — the working set for the UI */
    const userVendors = useMemo(
        () => vendors.filter(v => !systemVendorIds.has(v.id)),
        [vendors, systemVendorIds]
    );

    /** Vendors with zero linked transactions */
    const orphanVendors = useMemo(
        () => userVendors.filter(v => !(txCountByName[v.name] > 0)),
        [userVendors, txCountByName]
    );

    /** Pairs of vendors with similar names */
    const similarPairs = useMemo(
        () => findSimilarPairs([...new Set(userVendors.map(v => v.name))]),
        [userVendors]
    );

    const filteredVendors = useMemo(() => {
        const base = tab === 'orphans' ? orphanVendors : userVendors;
        const q = searchQuery.toLowerCase().trim();
        return q ? base.filter(v => v.name.toLowerCase().includes(q)) : base;
    }, [userVendors, orphanVendors, searchQuery, tab]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setView('list');
            setSearchQuery('');
            setRenameTarget(null);
            setRenameValue('');
            setMergeSource(null);
            setMergeTarget(null);
            setDeleteTarget(null);
            setDeleteConfirm(false);
            setTab('all');
        }
    }, [isOpen]);

    // Focus rename input when entering rename view
    useEffect(() => {
        if (view === 'rename') {
            setTimeout(() => renameInputRef.current?.focus(), 50);
        }
    }, [view]);

    // Body scroll lock
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => { setIsClosing(false); onClose(); }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const goList = () => {
        setView('list');
        setRenameTarget(null);
        setMergeSource(null);
        setMergeTarget(null);
        setDeleteTarget(null);
        setDeleteConfirm(false);
    };

    // ── Actions ──────────────────────────────────────────────────────────────

    const handleRenameSubmit = () => {
        if (!renameTarget || !renameValue.trim()) return;
        if (renameValue.trim() === renameTarget.name) { goList(); return; }
        toast.promise(
            renameMutation.mutateAsync({ vendorId: renameTarget.id, newName: renameValue.trim() }),
            { loading: 'Renaming…', success: 'Vendor renamed', error: 'Failed to rename vendor' }
        ).then(goList).catch(() => { });
    };

    const handleMergeConfirm = () => {
        if (!mergeSource || !mergeTarget) return;
        toast.promise(
            mergeMutation.mutateAsync({
                sourceVendorId: mergeSource.id,
                targetVendorId: mergeTarget.id,
                sourceVendorName: mergeSource.name,
                targetVendorName: mergeTarget.name,
            }),
            {
                loading: `Merging "${mergeSource.name}" into "${mergeTarget.name}"…`,
                success: 'Vendors merged',
                error: 'Failed to merge vendors',
            }
        ).then(goList).catch(() => { });
    };

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return;
        if (!deleteConfirm) { setDeleteConfirm(true); return; }
        toast.promise(
            deleteMutation.mutateAsync({ vendorId: deleteTarget.id }),
            { loading: 'Deleting…', success: 'Vendor deleted', error: 'Failed to delete vendor' }
        ).then(goList).catch(() => { });
    };

    const handlePruneOrphans = () => {
        if (orphanVendors.length === 0) return;
        toast.promise(
            pruneMutation.mutateAsync({ vendorIds: orphanVendors.map(v => v.id) }),
            {
                loading: `Pruning ${orphanVendors.length} unused vendor${orphanVendors.length !== 1 ? 's' : ''}…`,
                success: `Removed ${orphanVendors.length} unused vendor${orphanVendors.length !== 1 ? 's' : ''}`,
                error: 'Failed to prune vendors',
            }
        ).catch(() => { });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-[#111] md:bg-white/[.03] md:rounded-lg border-b-4 border-b-green/60 w-full md:max-w-lg min-h-[100dvh] md:min-h-0 ${isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'}`}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 border-b border-white/[.12]">
                    <div className="flex items-center gap-2">
                        {view !== 'list' && (
                            <button
                                onClick={goList}
                                className="p-1.5 hover:bg-white/[.06] rounded-lg transition-colors mr-1"
                                aria-label="Back"
                            >
                                <Image src="/chevron-left.svg" alt="Back" width={18} height={18} className="opacity-70" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold">
                            {view === 'list' && 'Manage Vendors'}
                            {view === 'rename' && `Rename Vendor`}
                            {view === 'merge' && 'Merge Vendors'}
                            {view === 'delete' && 'Delete Vendor'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/[.05] rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <Image src="/plus.svg" alt="Close" width={16} height={16} className="opacity-80 invert rotate-45" />
                    </button>
                </div>

                {/* ── LIST VIEW ─────────────────────────────────────────── */}
                {view === 'list' && (
                    <div className="flex flex-col h-[calc(100dvh-5rem)] md:max-h-[70vh]">
                        {/* Tabs */}
                        <div className="flex gap-1 p-3 border-b border-white/[.08]">
                            {(['all', 'similar', 'orphans'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${tab === t ? 'bg-white/[.1] text-white' : 'text-white/50 hover:text-white/70'}`}
                                >
                                    {t}
                                    {t === 'similar' && similarPairs.length > 0 && (
                                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                                            {similarPairs.length}
                                        </span>
                                    )}
                                    {t === 'orphans' && orphanVendors.length > 0 && (
                                        <span className="bg-white/10 text-white/50 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                                            {orphanVendors.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search (all / orphans tabs only) */}
                        {tab !== 'similar' && (
                            <div className="px-3 pt-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search vendors…"
                                        className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                    />
                                    <Image
                                        src="/magnify.svg"
                                        alt=""
                                        width={14}
                                        height={14}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {/* ── SIMILAR TAB ── */}
                            {tab === 'similar' && (
                                <>
                                    {similarPairs.length === 0 ? (
                                        <div className="text-center text-white/40 py-12 text-sm">
                                            No similar vendor names detected.
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xs text-white/40 px-1 pb-2">
                                                These pairs may be duplicates. Select one to merge or rename.
                                            </p>
                                            {similarPairs.map(({ a, b, score }) => {
                                                const vendorA = userVendors.find(v => v.name === a);
                                                const vendorB = userVendors.find(v => v.name === b);
                                                return (
                                                    <div
                                                        key={`${a}|${b}`}
                                                        className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 mb-2"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-sm text-white/90 truncate">{a}</span>
                                                                <span className="text-white/30 text-xs">vs</span>
                                                                <span className="font-medium text-sm text-white/90 truncate">{b}</span>
                                                            </div>
                                                            <div className="text-xs text-yellow-400/70 mt-0.5">
                                                                {Math.round(score * 100)}% similar
                                                                {' · '}{txCountByName[a] ?? 0} + {txCountByName[b] ?? 0} transactions
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 flex-shrink-0">
                                                            {vendorA && (
                                                                <button
                                                                    onClick={() => {
                                                                        setMergeSource(vendorA);
                                                                        setMergeTarget(vendorB ?? null);
                                                                        setView('merge');
                                                                    }}
                                                                    className="px-2 py-1 text-xs rounded-md bg-white/[.07] hover:bg-white/[.12] transition-colors"
                                                                >
                                                                    Merge
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </>
                            )}

                            {/* ── ORPHANS TAB ── */}
                            {tab === 'orphans' && (
                                <>
                                    {filteredVendors.length === 0 ? (
                                        <div className="text-center text-white/40 py-12 text-sm">
                                            {orphanVendors.length === 0 ? 'No unused vendors.' : 'No matches.'}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between px-1 pb-2">
                                                <p className="text-xs text-white/40">
                                                    {orphanVendors.length} vendor{orphanVendors.length !== 1 ? 's' : ''} with no transactions.
                                                </p>
                                                {orphanVendors.length > 0 && (
                                                    <button
                                                        onClick={handlePruneOrphans}
                                                        disabled={pruneMutation.isPending}
                                                        className="text-xs px-2.5 py-1 rounded-md bg-reddy/20 text-reddy hover:bg-reddy/30 transition-colors disabled:opacity-50"
                                                    >
                                                        Prune all
                                                    </button>
                                                )}
                                            </div>
                                            {filteredVendors.map(vendor => (
                                                <VendorRow
                                                    key={vendor.id}
                                                    name={vendor.name}
                                                    txCount={txCountByName[vendor.name] ?? 0}
                                                    onRename={() => { setRenameTarget({ id: vendor.id, name: vendor.name }); setRenameValue(vendor.name); setView('rename'); }}
                                                    onMerge={() => { setMergeSource({ id: vendor.id, name: vendor.name }); setView('merge'); }}
                                                    onDelete={() => { setDeleteTarget({ id: vendor.id, name: vendor.name }); setDeleteConfirm(false); setView('delete'); }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </>
                            )}

                            {/* ── ALL TAB ── */}
                            {tab === 'all' && (
                                <>
                                    {filteredVendors.length === 0 ? (
                                        <div className="text-center text-white/40 py-12 text-sm">
                                            {userVendors.length === 0 ? 'No vendors yet.' : 'No matches.'}
                                        </div>
                                    ) : (
                                        filteredVendors.map(vendor => (
                                            <VendorRow
                                                key={vendor.id}
                                                name={vendor.name}
                                                txCount={txCountByName[vendor.name] ?? 0}
                                                onRename={() => { setRenameTarget({ id: vendor.id, name: vendor.name }); setRenameValue(vendor.name); setView('rename'); }}
                                                onMerge={() => { setMergeSource({ id: vendor.id, name: vendor.name }); setView('merge'); }}
                                                onDelete={() => { setDeleteTarget({ id: vendor.id, name: vendor.name }); setDeleteConfirm(false); setView('delete'); }}
                                            />
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ── RENAME VIEW ───────────────────────────────────────── */}
                {view === 'rename' && renameTarget && (
                    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-auto">
                        <div className="flex-1 p-4 space-y-4">
                            <p className="text-sm text-white/50">
                                Renaming <span className="font-semibold text-white/80">"{renameTarget.name}"</span> will update all linked transactions.
                            </p>
                            <div>
                                <label className="block text-sm text-white/50 mb-1">New name</label>
                                <input
                                    ref={renameInputRef}
                                    type="text"
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); }}
                                    className="w-full p-2.5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                    placeholder={renameTarget.name}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/[.12] flex gap-3">
                            <button onClick={goList} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Cancel</button>
                            <button
                                onClick={handleRenameSubmit}
                                disabled={!renameValue.trim() || renameMutation.isPending}
                                className="flex-1 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-50 text-sm"
                            >
                                {renameMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── MERGE VIEW ────────────────────────────────────────── */}
                {view === 'merge' && mergeSource && (
                    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-auto">
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {/* Direction picker — only shown when both sides are pre-populated (from similar tab) */}
                            {mergeTarget ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-white/40 px-0.5">Choose which vendor to keep</p>
                                    {/* Option A: source → target (current direction) */}
                                    <button
                                        onClick={() => {/* already this direction */}}
                                        className="w-full p-3 rounded-lg border transition-colors text-left bg-green/10 border-green/40"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-white/40 line-through truncate max-w-[120px]">{mergeSource.name}</span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                    <span className="text-sm font-semibold text-white truncate max-w-[120px]">{mergeTarget.name}</span>
                                                </div>
                                                <p className="text-xs text-white/40 mt-0.5">
                                                    Keep <strong className="text-white/60">{mergeTarget.name}</strong> · remove {mergeSource.name}
                                                </p>
                                            </div>
                                            <div className="w-4 h-4 rounded-full border-2 border-green bg-green flex-shrink-0 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                            </div>
                                        </div>
                                    </button>
                                    {/* Option B: swap — target becomes source */}
                                    <button
                                        onClick={() => {
                                            const tmp = mergeSource;
                                            setMergeSource(mergeTarget);
                                            setMergeTarget(tmp);
                                        }}
                                        className="w-full p-3 rounded-lg border transition-colors text-left bg-white/[.03] border-white/[.10] hover:bg-white/[.06]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-white/40 line-through truncate max-w-[120px]">{mergeTarget.name}</span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                    <span className="text-sm font-semibold text-white truncate max-w-[120px]">{mergeSource.name}</span>
                                                </div>
                                                <p className="text-xs text-white/40 mt-0.5">
                                                    Keep <strong className="text-white/60">{mergeSource.name}</strong> · remove {mergeTarget.name}
                                                </p>
                                            </div>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0" />
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                /* No target yet — show the "merging from" header and vendor picker */
                                <>
                                    <div className="p-3 bg-white/[.04] rounded-lg border border-white/[.10]">
                                        <p className="text-xs text-white/40 mb-0.5">Merging from</p>
                                        <p className="font-semibold text-white/90">{mergeSource.name}</p>
                                        <p className="text-xs text-white/40 mt-0.5">{txCountByName[mergeSource.name] ?? 0} transactions</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-white/50 mb-1">Merge into…</label>
                                        <div className="relative mb-2">
                                            <input
                                                type="text"
                                                value={mergeSearchQuery}
                                                onChange={e => setMergeSearchQuery(e.target.value)}
                                                placeholder="Search vendors…"
                                                className="w-full p-2 pl-8 rounded-lg bg-white/[.05] border border-white/[.12] focus:border-green focus:outline-none text-sm transition-colors"
                                            />
                                            <Image src="/magnify.svg" alt="" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 invert" />
                                        </div>
                                        <div className="space-y-1 max-h-60 overflow-y-auto">
                                            {userVendors
                                                .filter(v => v.id !== mergeSource.id)
                                                .filter(v => !mergeSearchQuery || v.name.toLowerCase().includes(mergeSearchQuery.toLowerCase()))
                                                .map(vendor => (
                                                    <button
                                                        key={vendor.id}
                                                        onClick={() => setMergeTarget({ id: vendor.id, name: vendor.name })}
                                                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between bg-white/[.04] border border-white/[.08] text-white/70 hover:bg-white/[.07]"
                                                    >
                                                        <span className="font-medium">{vendor.name}</span>
                                                        <span className="text-xs text-white/40">{txCountByName[vendor.name] ?? 0} tx</span>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {mergeTarget && (
                                <div className="p-3 bg-green/5 border border-green/20 rounded-lg text-sm">
                                    <p className="text-green/80">
                                        All transactions from <strong>"{mergeSource.name}"</strong> will be re-assigned to <strong>"{mergeTarget.name}"</strong>. The source vendor will be removed.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/[.12] flex gap-3">
                            <button onClick={goList} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Cancel</button>
                            <button
                                onClick={handleMergeConfirm}
                                disabled={!mergeTarget || mergeMutation.isPending}
                                className="flex-1 py-3 bg-green text-black rounded-lg font-medium hover:bg-green/80 transition-colors disabled:opacity-50 text-sm"
                            >
                                {mergeMutation.isPending ? 'Merging…' : 'Merge'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── DELETE VIEW ───────────────────────────────────────── */}
                {view === 'delete' && deleteTarget && (
                    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-auto">
                        <div className="flex-1 p-4 space-y-4">
                            <div className="p-4 bg-reddy/10 border border-reddy/20 rounded-lg">
                                <p className="text-sm font-medium text-reddy mb-1">This action cannot be undone</p>
                                <p className="text-sm text-white/60">
                                    The vendor <strong className="text-white/80">"{deleteTarget.name}"</strong> will be permanently deleted.
                                    {(txCountByName[deleteTarget.name] ?? 0) > 0 && (
                                        <> The {txCountByName[deleteTarget.name]} linked transaction{txCountByName[deleteTarget.name] !== 1 ? 's' : ''} will keep their text but lose the vendor link.</>
                                    )}
                                </p>
                            </div>
                            {deleteConfirm && (
                                <div className="p-3 bg-reddy/20 border border-reddy/30 rounded-lg">
                                    <p className="text-sm text-reddy font-medium">Are you absolutely sure?</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/[.12] flex gap-3">
                            <button onClick={goList} className="flex-1 py-3 bg-white/[.05] rounded-lg text-white/60 hover:bg-white/[.08] transition-colors text-sm font-medium">Cancel</button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleteMutation.isPending}
                                className="flex-1 py-3 bg-reddy text-white rounded-lg font-medium hover:bg-old-reddy transition-colors disabled:opacity-50 text-sm"
                            >
                                {deleteMutation.isPending ? 'Deleting…' : deleteConfirm ? 'Yes, Delete' : 'Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── VendorRow sub-component ───────────────────────────────────────────────────

function VendorRow({
    name,
    txCount,
    onRename,
    onMerge,
    onDelete,
}: {
    name: string;
    txCount: number;
    onRename: () => void;
    onMerge: () => void;
    onDelete: () => void;
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
        <div ref={ref} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[.04] transition-colors group">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 truncate">{name}</p>
                <p className="text-xs text-white/35">{txCount} transaction{txCount !== 1 ? 's' : ''}</p>
            </div>
            {/* Inline action buttons — always visible on desktop, shown on tap on mobile */}
            <div className={`flex gap-1 transition-opacity ${open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                    onClick={(e) => { e.stopPropagation(); onRename(); }}
                    title="Rename"
                    className="p-1.5 rounded-md hover:bg-white/[.1] transition-colors text-white/50 hover:text-white/90 text-xs"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onMerge(); }}
                    title="Merge into another vendor"
                    className="p-1.5 rounded-md hover:bg-white/[.1] transition-colors text-white/50 hover:text-white/90 text-xs"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3" />
                        <polyline points="15 3 12 0 9 3" />
                        <line x1="12" y1="0" x2="12" y2="13" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="Delete vendor"
                    className="p-1.5 rounded-md hover:bg-reddy/20 transition-colors text-white/40 hover:text-reddy text-xs"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                </button>
            </div>
            {/* Mobile tap-to-reveal toggle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="md:hidden p-1.5 rounded-md hover:bg-white/[.07] transition-colors text-white/30"
                aria-label="Actions"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>
        </div>
    );
}
