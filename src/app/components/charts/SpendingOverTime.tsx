'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format, startOfWeek, startOfMonth, startOfDay, differenceInDays } from 'date-fns';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale);

type Granularity = 'day' | 'week' | 'month';
type EntityType = 'all' | 'vendor';

interface SpendingOverTimeProps {
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    selectedGroups: string[];
    selectedCategories: string[];
}

export default function SpendingOverTime({
    transactions,
    categories,
    dateRange,
    selectedGroups,
    selectedCategories,
}: SpendingOverTimeProps) {
    const [granularity, setGranularity] = useState<Granularity>('week');
    const [entityType, setEntityType] = useState<EntityType>('all');
    const [entityId, setEntityId] = useState<string>('');
    const chartRef = useRef<any>(null);

    // Auto-select granularity based on date range
    useEffect(() => {
        const days = differenceInDays(dateRange.end, dateRange.start);
        if (days <= 31) setGranularity('day');
        else if (days <= 180) setGranularity('week');
        else setGranularity('month');
    }, [dateRange]);

    // Build entity options
    const entityOptions = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const groups = new Set<string>();
        const cats = new Map<string, string>();
        const vendors = new Set<string>();

        transactions.forEach(t => {
            if (!t || t.type !== 'payment') return;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return;

            // Apply group filter
            if (selectedGroups.length > 0 && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (!cat) return;
                const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return;
            }

            // Apply category filter
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category_id)) return;

            if (t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (cat) {
                    const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                    groups.add(groupName);
                    cats.set(cat.id, cat.name);
                }
            }
            if (t.vendor) vendors.add(t.vendor);
        });

        return {
            groups: Array.from(groups).sort(),
            categories: Array.from(cats.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
            vendors: Array.from(vendors).sort(),
        };
    }, [transactions, categories, dateRange, selectedGroups, selectedCategories]);

    // Reset entityId when type changes
    useEffect(() => {
        setEntityId('');
    }, [entityType]);

    // Build chart data
    const chartData = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        // Filter transactions
        const filtered = transactions.filter(t => {
            if (!t || t.type !== 'payment') return false;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return false;

            // Apply global filters
            if (selectedGroups.length > 0 && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (!cat) return false;
                const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
                if (!selectedGroups.includes(groupName)) return false;
            }
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category_id)) return false;

            // Apply entity filter
            if (entityType === 'vendor' && entityId) {
                if (t.vendor !== entityId) return false;
            }

            return true;
        });

        // Generate all time periods in the date range
        const buckets: Record<string, number> = {};
        let current = new Date(dateRange.start);
        const end = new Date(dateRange.end);

        while (current <= end) {
            let key: string;

            if (granularity === 'day') {
                key = format(startOfDay(current), 'yyyy-MM-dd');
                current = new Date(current);
                current.setDate(current.getDate() + 1);
            } else if (granularity === 'week') {
                key = format(startOfWeek(current, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                current = new Date(current);
                current.setDate(current.getDate() + 7);
            } else {
                key = format(startOfMonth(current), 'yyyy-MM-dd');
                current = new Date(current);
                current.setMonth(current.getMonth() + 1);
            }

            buckets[key] = 0; // Initialize with 0
        }

        // Fill buckets with transaction data
        filtered.forEach(t => {
            const d = new Date(t.date);
            let key: string;

            if (granularity === 'day') {
                key = format(startOfDay(d), 'yyyy-MM-dd');
            } else if (granularity === 'week') {
                key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            } else {
                key = format(startOfMonth(d), 'yyyy-MM-dd');
            }

            buckets[key] = (buckets[key] || 0) + Math.abs(t.amount);
        });

        // Sort by date
        const sortedKeys = Object.keys(buckets).sort();

        return {
            labels: sortedKeys,
            datasets: [
                {
                    label: 'Spending',
                    data: sortedKeys.map(k => buckets[k]),
                    backgroundColor: 'rgba(186, 194, 255, 0.5)',
                    borderColor: 'rgba(186, 194, 255, 0.8)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9,
                },
            ],
        };
    }, [transactions, categories, dateRange, selectedGroups, selectedCategories, entityType, entityId, granularity]);

    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(186, 194, 255, 0.3)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                callbacks: {
                    title: (items: any[]) => {
                        if (!items.length) return '';
                        const label = items[0].label;
                        if (granularity === 'week') return `Week of ${format(new Date(label), 'MMM dd, yyyy')}`;
                        if (granularity === 'month') return format(new Date(label), 'MMMM yyyy');
                        return format(new Date(label), 'EEE, MMM dd, yyyy');
                    },
                    label: (item: any) => formatCurrency(item.raw),
                },
            },
        },
        scales: {
            x: {
                type: 'category' as const,
                ticks: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    font: { size: 10 },
                    maxRotation: 45,
                    callback: function (this: any, _val: any, index: number) {
                        const label = chartData.labels[index];
                        if (!label) return '';
                        const d = new Date(label);
                        if (granularity === 'month') return format(d, 'MMM yy');
                        if (granularity === 'week') return format(d, 'MMM dd');
                        return format(d, 'dd');
                    },
                },
                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                border: { display: false },
            },
            y: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    font: { size: 10 },
                    callback: (value: number) => {
                        if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
                        return `£${value}`;
                    },
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                border: { display: false },
            },
        },
    };

    const entityLabel = entityType === 'all'
        ? 'All Spending'
        : entityId
            ? entityId
            : `Select a ${entityType}...`;

    return (
        <div>
            {/* Controls row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {/* Granularity toggle */}
                <div className="flex gap-1 bg-white/[.03] rounded-lg p-1">
                    {(['day', 'week', 'month'] as Granularity[]).map(g => (
                        <button
                            key={g}
                            onClick={() => setGranularity(g)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${granularity === g
                                ? 'bg-green text-black font-medium'
                                : 'text-white/60 hover:text-white/80'
                                }`}
                        >
                            {g}
                        </button>
                    ))}
                </div>

                {/* Entity type selector */}
                <div className="flex gap-1 bg-white/[.03] rounded-lg p-1">
                    {([
                        { value: 'all' as EntityType, label: 'All' },
                        { value: 'vendor' as EntityType, label: 'By Vendor' },
                    ]).map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setEntityType(opt.value)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-all ${entityType === opt.value
                                ? 'bg-green text-black font-medium'
                                : 'text-white/60 hover:text-white/80'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Entity picker */}
            {entityType !== 'all' && (
                <div className="mb-4 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-1.5 pb-1">
                        {(entityOptions.vendors.map((v: string) => ({ id: v, name: v }))
                        ).map((item: { id: string; name: string }) => (
                            <button
                                key={item.id}
                                onClick={() => setEntityId(item.id)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 ${entityId === item.id
                                    ? 'bg-green text-black font-medium'
                                    : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                                    }`}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="h-[280px] sm:h-[320px]">
                {chartData.labels.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/40 text-sm">
                        {entityType !== 'all' && !entityId
                            ? `Select a ${entityType} to view spending over time`
                            : 'No spending data for this period'}
                    </div>
                ) : (
                    <Bar ref={chartRef} data={chartData} options={options} />
                )}
            </div>
        </div>
    );
}
