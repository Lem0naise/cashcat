'use client';

import React, { useMemo, useState } from 'react';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

interface TopVendorsChartProps {
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    selectedGroups: string[];
    selectedCategories: string[];
    limit?: number;
}

export default function TopVendorsChart({
    transactions,
    categories,
    dateRange,
    selectedGroups,
    selectedCategories,
    limit = 10,
}: TopVendorsChartProps) {
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Build available categories for the filter dropdown
    const availableCategories = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const seen = new Map<string, string>(); // id -> name

        transactions.forEach(t => {
            if (!t || t.type !== 'payment' || !t.category_id || !t.vendor) return;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return;

            if (selectedGroups.length > 0) {
                const cat = categoryMap.get(t.category_id);
                if (!cat) return;
                const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return;
            }

            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category_id)) return;

            const cat = categoryMap.get(t.category_id);
            if (cat && !seen.has(cat.id)) {
                seen.set(cat.id, cat.name);
            }
        });

        return Array.from(seen.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [transactions, categories, dateRange, selectedGroups, selectedCategories]);

    const data = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const filtered = transactions.filter(t => {
            if (!t || t.type !== 'payment' || !t.vendor) return false;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return false;

            if (selectedGroups.length > 0 && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (!cat) return false;
                const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return false;
            }

            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category_id)) return false;

            if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;

            return true;
        });

        const spending: Record<string, { name: string; amount: number; count: number }> = {};
        filtered.forEach(t => {
            const vendor = t.vendor || 'Unknown';
            if (!spending[vendor]) {
                spending[vendor] = { name: vendor, amount: 0, count: 0 };
            }
            spending[vendor].amount += Math.abs(t.amount);
            spending[vendor].count += 1;
        });

        const sorted = Object.values(spending).sort((a, b) => b.amount - a.amount).slice(0, limit);
        const maxAmount = sorted.length > 0 ? sorted[0].amount : 0;
        const totalAmount = sorted.reduce((sum, s) => sum + s.amount, 0);

        return { items: sorted, maxAmount, totalAmount };
    }, [transactions, categories, dateRange, selectedGroups, selectedCategories, categoryFilter, limit]);

    return (
        <div>


            {data.items.length === 0 ? (
                <div className="text-center text-white/40 py-8 text-sm">
                    No vendor spending data for this period
                </div>
            ) : (
                <div className="space-y-2">
                    {data.items.map((item, i) => {
                        const pct = data.maxAmount > 0 ? (item.amount / data.maxAmount) * 100 : 0;
                        const sharePct = data.totalAmount > 0 ? (item.amount / data.totalAmount) * 100 : 0;
                        return (
                            <div key={item.name + i} className="group">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-white/90 truncate mr-3 flex-1 min-w-0">{item.name}</span>
                                    <div className="text-right shrink-0 flex items-center gap-2">
                                        <span className="text-xs text-white/40">{item.count} txns</span>
                                        <span className="text-sm font-medium text-white">{formatCurrency(item.amount)}</span>
                                        <span className="text-xs text-white/40">{sharePct.toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white/[.05] rounded-full h-5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 ease-out"
                                        style={{
                                            width: `${Math.max(pct, 2)}%`,
                                            background: `linear-gradient(90deg,  rgba(186, 194, 255, 0.6), rgba(186, 194, 255, 0.3))`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
