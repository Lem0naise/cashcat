'use client';

import { useMemo } from 'react';
import type { ParsedTransaction, ExistingCategory } from '../types';

interface ReviewCommitStepProps {
    parsedTransactions: ParsedTransaction[];
    existingCategories: ExistingCategory[];
    categoryActions: Record<string, { type: string; name?: string; targetCategoryName?: string }>;
    targetAccountName: string;
    isCommitting: boolean;
    commitProgress: number;
    commitTotal: number;
    commitDone: boolean;
    commitError: string | null;
    onToggleDuplicate: (index: number) => void;
    onCommit: () => void;
}

export default function ReviewCommitStep({
    parsedTransactions,
    existingCategories,
    categoryActions,
    targetAccountName,
    isCommitting,
    commitProgress,
    commitTotal,
    commitDone,
    commitError,
    onToggleDuplicate,
    onCommit,
}: ReviewCommitStepProps) {
    const stats = useMemo(() => {
        const total = parsedTransactions.length;
        const duplicates = parsedTransactions.filter(tx => tx.isDuplicate && !tx.includeAnyway).length;
        const starting = parsedTransactions.filter(tx => tx.isStartingBalance).length;
        const importing = total - duplicates;
        const categorized = parsedTransactions.filter(tx => tx.assignedCategoryId && !tx.isDuplicate).length;
        const uncategorized = importing - starting - categorized;

        return { total, duplicates, starting, importing, categorized, uncategorized };
    }, [parsedTransactions]);

    const getCategoryName = (tx: ParsedTransaction): string => {
        if (!tx.assignedCategoryId) return '—';
        if (tx.assignedCategoryId.startsWith('new:')) {
            const csvCat = tx.assignedCategoryId.replace('new:', '');
            const action = categoryActions[csvCat];
            return action?.name || csvCat;
        }
        const cat = existingCategories.find(c => c.id === tx.assignedCategoryId);
        return cat?.name || '—';
    };

    const getStatusBadge = (tx: ParsedTransaction) => {
        if (tx.isStartingBalance) {
            return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Starting Balance</span>;
        }
        if (tx.isDuplicate && !tx.includeAnyway) {
            return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Duplicate</span>;
        }
        if (tx.isDuplicate && tx.includeAnyway) {
            return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/60">Forced</span>;
        }
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green/20 text-green">Ready</span>;
    };

    // Success state
    if (commitDone) {
        return (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green/20 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-white">Import Complete!</h3>
                    <p className="text-sm text-white/50 mt-1">
                        Successfully imported {stats.importing} transaction{stats.importing !== 1 ? 's' : ''} to {targetAccountName}.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-semibold text-white">Review & Import</h3>
                <p className="text-sm text-white/50 mt-0.5">
                    Review your transactions before importing them
                </p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Importing" value={stats.importing} color="text-green" />
                <StatCard label="Categorized" value={stats.categorized} color="text-green" />
                <StatCard label="Duplicates" value={stats.duplicates} color="text-amber-400" />
                <StatCard label="Uncategorized" value={stats.uncategorized} color="text-white/50" />
            </div>

            {/* Error message */}
            {commitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-reddy/10 border border-reddy/30">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-reddy mt-0.5 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <div>
                        <p className="text-sm text-reddy/90 font-medium">Import failed</p>
                        <p className="text-xs text-reddy/70 mt-0.5">{commitError}</p>
                    </div>
                </div>
            )}

            {/* Transaction table */}
            <div className="overflow-x-auto rounded-lg border border-white/10 max-h-[35vh] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-[#1a1a1a]">
                            <th className="px-3 py-2 text-left text-xs font-medium text-white/40">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-white/40">Vendor</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-white/40">Amount</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-white/40">Category</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-white/40">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parsedTransactions.map(tx => {
                            const isSkipped = tx.isDuplicate && !tx.includeAnyway;
                            return (
                                <tr
                                    key={tx.index}
                                    className={`border-t border-white/[.05] transition-colors ${
                                        isSkipped ? 'opacity-40' : ''
                                    } ${tx.isDuplicate ? 'bg-amber-500/[.03]' : ''} ${tx.isStartingBalance ? 'bg-blue-500/[.03]' : ''}`}
                                >
                                    <td className="px-3 py-2 text-white/70 whitespace-nowrap text-xs">{tx.date}</td>
                                    <td className="px-3 py-2 text-white/80 whitespace-nowrap max-w-[150px] truncate">{tx.vendor}</td>
                                    <td className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${
                                        tx.amount >= 0 ? 'text-green' : 'text-white/80'
                                    }`}>
                                        {tx.amount >= 0 ? '+' : ''}£{Math.abs(tx.amount).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-white/60 whitespace-nowrap text-xs max-w-[120px] truncate">
                                        {getCategoryName(tx)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {tx.isDuplicate ? (
                                            <button
                                                onClick={() => onToggleDuplicate(tx.index)}
                                                className="inline-block"
                                                title={tx.includeAnyway ? 'Click to skip' : 'Click to include anyway'}
                                            >
                                                {getStatusBadge(tx)}
                                            </button>
                                        ) : (
                                            getStatusBadge(tx)
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {stats.duplicates > 0 && (
                <p className="text-xs text-amber-400/60">
                    {stats.duplicates} duplicate{stats.duplicates !== 1 ? 's' : ''} will be skipped. Click a duplicate&apos;s status badge to include it anyway.
                </p>
            )}

            {/* Import button / progress */}
            {isCommitting ? (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/50">
                        <span>Importing transactions...</span>
                        <span>{commitProgress} / {commitTotal}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-green transition-all duration-300"
                            style={{ width: `${commitTotal > 0 ? (commitProgress / commitTotal) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            ) : (
                <button
                    onClick={onCommit}
                    disabled={stats.importing === 0}
                    className="w-full py-3 px-4 rounded-lg bg-green hover:bg-green/90 text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Import {stats.importing} Transaction{stats.importing !== 1 ? 's' : ''}
                </button>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="p-3 rounded-lg bg-white/[.03] border border-white/[.06] text-center">
            <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-white/40">{label}</p>
        </div>
    );
}
