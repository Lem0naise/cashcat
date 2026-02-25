'use client';

import React, { useMemo } from 'react';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';
import { format, startOfWeek, eachDayOfInterval } from 'date-fns';

interface SpendingHabitsWidgetProps {
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    selectedGroups: string[];
    selectedCategories: string[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SpendingHabitsWidget({
    transactions,
    categories,
    dateRange,
    selectedGroups,
    selectedCategories,
}: SpendingHabitsWidgetProps) {
    const habits = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const filtered = transactions.filter(t => {
            if (!t || t.type !== 'payment') return false;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return false;

            if (selectedGroups.length > 0 && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (!cat) return false;
                const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return false;
            }
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category_id || '')) return false;

            return true;
        });

        if (filtered.length === 0) return null;

        // Busiest day of week
        const daySpend: Record<number, { amount: number; count: number }> = {};
        for (let i = 0; i < 7; i++) daySpend[i] = { amount: 0, count: 0 };
        filtered.forEach(t => {
            const day = new Date(t.date).getDay();
            daySpend[day].amount += Math.abs(t.amount);
            daySpend[day].count += 1;
        });
        const busiestDayEntry = Object.entries(daySpend).sort(([, a], [, b]) => b.amount - a.amount)[0];
        const busiestDay = busiestDayEntry ? DAYS[parseInt(busiestDayEntry[0])] : null;
        const busiestDayAmount = busiestDayEntry ? busiestDayEntry[1].amount : 0;

        // Weekend vs weekday
        let weekendSpend = 0;
        let weekdaySpend = 0;
        filtered.forEach(t => {
            const day = new Date(t.date).getDay();
            const amount = Math.abs(t.amount);
            if (day === 0 || day === 6) weekendSpend += amount;
            else weekdaySpend += amount;
        });
        const totalSpend = weekendSpend + weekdaySpend;
        const weekendPct = totalSpend > 0 ? (weekendSpend / totalSpend) * 100 : 0;

        // Most frequent vendor
        const vendorCounts: Record<string, { count: number; amount: number }> = {};
        filtered.forEach(t => {
            const v = t.vendor || 'Unknown';
            if (!vendorCounts[v]) vendorCounts[v] = { count: 0, amount: 0 };
            vendorCounts[v].count += 1;
            vendorCounts[v].amount += Math.abs(t.amount);
        });
        const mostFreqEntry = Object.entries(vendorCounts).sort(([, a], [, b]) => b.count - a.count)[0];
        const mostFrequentVendor = mostFreqEntry ? mostFreqEntry[0] : null;
        const mostFrequentVendorCount = mostFreqEntry ? mostFreqEntry[1].count : 0;

        // Most consistent vendor (appears in most distinct weeks)
        const vendorWeeks: Record<string, Set<string>> = {};
        filtered.forEach(t => {
            const v = t.vendor || 'Unknown';
            const weekKey = format(startOfWeek(new Date(t.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            if (!vendorWeeks[v]) vendorWeeks[v] = new Set();
            vendorWeeks[v].add(weekKey);
        });
        const mostConsistentEntry = Object.entries(vendorWeeks).sort(([, a], [, b]) => b.size - a.size)[0];
        const mostConsistentVendor = mostConsistentEntry ? mostConsistentEntry[0] : null;
        const mostConsistentVendorWeeks = mostConsistentEntry ? mostConsistentEntry[1].size : 0;

        // Longest no-spend streak
        const spendDates = new Set(filtered.map(t => format(new Date(t.date), 'yyyy-MM-dd')));
        const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        let longestStreak = 0;
        let currentStreak = 0;
        for (const day of allDays) {
            if (!spendDates.has(format(day, 'yyyy-MM-dd'))) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        return {
            busiestDay,
            busiestDayAmount,
            weekendPct,
            weekendSpend,
            mostFrequentVendor,
            mostFrequentVendorCount,
            mostConsistentVendor,
            mostConsistentVendorWeeks,
            longestStreak,
            totalSpend,
        };
    }, [transactions, categories, dateRange, selectedGroups, selectedCategories]);

    if (!habits) {
        return (
            <div className="text-center text-white/40 py-6 text-sm">
                No spending data for this period
            </div>
        );
    }

    type Bullet = { icon: React.JSX.Element; label: string; value: string; sub: string };

    const maybeBullets: (Bullet | null)[] = [
        habits.busiestDay ? {
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            ),
            label: 'Busiest day',
            value: habits.busiestDay,
            sub: formatCurrency(habits.busiestDayAmount) + ' total',
        } : null,
        habits.mostFrequentVendor ? {
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9" />
                </svg>
            ),
            label: 'Most visited',
            value: habits.mostFrequentVendor,
            sub: `${habits.mostFrequentVendorCount} transactions`,
        } : null,
        (habits.mostConsistentVendor && habits.mostConsistentVendorWeeks > 1) ? {
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
            ),
            label: 'Most consistent',
            value: habits.mostConsistentVendor,
            sub: `${habits.mostConsistentVendorWeeks} distinct weeks`,
        } : null,
        habits.longestStreak > 1 ? {
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
            ),
            label: 'No-spend streak',
            value: `${habits.longestStreak} day${habits.longestStreak !== 1 ? 's' : ''}`,
            sub: 'longest consecutive',
        } : null,
        {
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
            ),
            label: 'Weekend spend',
            value: `${habits.weekendPct.toFixed(0)}%`,
            sub: `${formatCurrency(habits.weekendSpend)} of total`,
        },
    ].filter((b): b is Bullet => b !== null);

    const bullets: Bullet[] = maybeBullets.filter((b): b is Bullet => b !== null);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {bullets.map((b: Bullet, i: number) => (
                <div key={i} className="bg-white/[.03] rounded-lg p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
                        {b.icon}
                        <span className="text-xs">{b.label}</span>
                    </div>
                    <div className="text-sm font-semibold text-white truncate">{b.value}</div>
                    <div className="text-xs text-white/40">{b.sub}</div>
                </div>
            ))}
        </div>
    );
}
