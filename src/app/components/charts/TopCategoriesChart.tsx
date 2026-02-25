'use client';

import React, { useMemo } from 'react';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

interface TopCategoriesChartProps {
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    selectedGroups: string[];
    limit?: number;
    comparisonDateRange?: { start: Date; end: Date };
}

export default function TopCategoriesChart({
    transactions,
    categories,
    dateRange,
    selectedGroups,
    limit = 10,
    comparisonDateRange,
}: TopCategoriesChartProps) {
    const data = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        // Filter transactions in date range
        const filtered = transactions.filter(t => {
            if (!t || t.type !== 'payment' || !t.category_id) return false;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return false;

            if (selectedGroups.length > 0) {
                const cat = categoryMap.get(t.category_id);
                if (!cat) return false;
                const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return false;
            }
            return true;
        });

        // Aggregate by category
        const spending: Record<string, { name: string; group: string; amount: number; count: number }> = {};
        filtered.forEach(t => {
            const cat = categoryMap.get(t.category_id);
            if (!cat) return;
            const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
            if (!spending[cat.id]) {
                spending[cat.id] = { name: cat.name, group: groupName, amount: 0, count: 0 };
            }
            spending[cat.id].amount += Math.abs(t.amount);
            spending[cat.id].count += 1;
        });

        const sorted = Object.entries(spending).sort(([, a], [, b]) => b.amount - a.amount).slice(0, limit);
        const maxAmount = sorted.length > 0 ? sorted[0][1].amount : 0;
        const totalAmount = sorted.reduce((sum, [, s]) => sum + s.amount, 0);

        // Build comparison spending map if comparisonDateRange is provided
        let comparisonSpending: Record<string, number> = {};
        if (comparisonDateRange) {
            const compFiltered = transactions.filter(t => {
                if (!t || t.type !== 'payment' || !t.category_id) return false;
                const d = new Date(t.date);
                if (d < comparisonDateRange.start || d > comparisonDateRange.end) return false;

                if (selectedGroups.length > 0) {
                    const cat = categoryMap.get(t.category_id);
                    if (!cat) return false;
                    const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                    if (!selectedGroups.includes(groupName)) return false;
                }
                return true;
            });

            compFiltered.forEach(t => {
                const catId = t.category_id;
                if (!catId) return;
                comparisonSpending[catId] = (comparisonSpending[catId] || 0) + Math.abs(t.amount);
            });
        }

        return {
            items: sorted.map(([id, s]) => ({
                id,
                name: s.name,
                group: s.group,
                amount: s.amount,
                count: s.count,
                prevAmount: comparisonSpending[id] ?? null,
            })),
            maxAmount,
            totalAmount,
        };
    }, [transactions, categories, dateRange, selectedGroups, limit, comparisonDateRange]);

    if (data.items.length === 0) {
        return (
            <div className="text-center text-white/40 py-8 text-sm">
                No category spending data for this period
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {data.items.map((item, i) => {
                const pct = data.maxAmount > 0 ? (item.amount / data.maxAmount) * 100 : 0;
                const sharePct = data.totalAmount > 0 ? (item.amount / data.totalAmount) * 100 : 0;

                // MoM delta
                let deltaEl: React.ReactNode = null;
                if (item.prevAmount !== null && item.prevAmount > 0) {
                    const delta = ((item.amount - item.prevAmount) / item.prevAmount) * 100;
                    const isUp = delta > 2;
                    const isDown = delta < -2;
                    if (isUp || isDown) {
                        deltaEl = (
                            <span className={`flex items-center gap-0.5 text-xs font-medium shrink-0 ${isUp ? 'text-orange-400' : 'text-green'}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    {isUp
                                        ? <path d="M7 17L17 7M17 7H7M17 7V17" />
                                        : <path d="M17 7L7 17M7 17H17M7 17V7" />
                                    }
                                </svg>
                                {Math.abs(delta).toFixed(0)}%
                            </span>
                        );
                    }
                }

                return (
                    <div key={item.id + i} className="group">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                                <span className="text-sm text-white/90 truncate">{item.name}</span>
                                <span className="text-xs text-white/40 shrink-0">{item.group}</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1.5">
                                {deltaEl}
                                <span className="text-sm font-medium text-white">{formatCurrency(item.amount)}</span>
                                <span className="text-xs text-white/40">{sharePct.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="w-full bg-white/[.05] rounded-full h-5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${Math.max(pct, 2)}%`,
                                    background: `linear-gradient(90deg, rgba(186, 194, 255, 0.6), rgba(186, 194, 255, 0.3))`,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
