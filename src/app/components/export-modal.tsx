'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useCategories } from '@/app/hooks/useCategories';
import { useAccounts } from '@/app/hooks/useAccounts';
import type { TransactionWithDetails } from '@/app/hooks/useTransactions';
import { format } from 'date-fns';

type ExportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    transactions: TransactionWithDetails[];
};

export default function ExportModal({ isOpen, onClose, transactions }: ExportModalProps) {
    const { data: categories = [] } = useCategories();
    const { data: accounts = [] } = useAccounts();

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectAllCategories, setSelectAllCategories] = useState(true);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [selectAllAccounts, setSelectAllAccounts] = useState(true);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
    const [isExporting, setIsExporting] = useState(false);

    // Initialize dates to current month or similar? Or empty for "All time"?
    // User said "from date, to date". Let's default to empty (all time) or maybe current month.
    // Let's leave empty initially or set reasonable defaults. "All time" is usually default for exports unless specified.

    useEffect(() => {
        if (isOpen) {
            // Reset or initialize state
            setSelectAllCategories(true);
            setSelectedCategoryIds([]);
            setSelectAllAccounts(true);
            setSelectedAccountIds([]);
            setExportFormat('csv');
            // Default dates: First transaction date to today? Or just empty.
            // Let's set defaults to this year maybe? Or just leave empty.
            const today = new Date().toISOString().split('T')[0];
            setToDate(today);
            // Default from date: 30 days ago?
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            setFromDate(lastMonth.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const handleCategoryToggle = (categoryId: string) => {
        if (selectAllCategories) {
            // Switch to specific mode, select all except the clicked one? 
            // Or start with just the clicked one?
            // User likely wants to select a few. 
            // Better UX: If "All" is selected, clicking a specific one unchecks "All" and selects just that one?
            // Or we have a mode switch.
            setSelectAllCategories(false);
            setSelectedCategoryIds([categoryId]);
            return;
        }

        setSelectedCategoryIds(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                return [...prev, categoryId];
            }
        });
    };

    const handleAccountToggle = (accountId: string) => {
        if (selectAllAccounts) {
            setSelectAllAccounts(false);
            setSelectedAccountIds([accountId]);
            return;
        }
        setSelectedAccountIds(prev => {
            if (prev.includes(accountId)) {
                return prev.filter(id => id !== accountId);
            } else {
                return [...prev, accountId];
            }
        });
    };

    const handleExport = () => {
        setIsExporting(true);
        try {
            // Filter transactions
            const filtered = transactions.filter(t => {
                const tDate = t.date; // string YYYY-MM-DD
                if (fromDate && tDate < fromDate) return false;
                if (toDate && tDate > toDate) return false;

                if (!selectAllAccounts) {
                    if (!t.account_id || !selectedAccountIds.includes(t.account_id)) return false;
                }

                if (!selectAllCategories) {
                    // If transaction has no category (null), it won't be in selectedCategoryIds
                    // Unless we have an "Uncategorized" option. For now, strict check.
                    if (!t.category_id || !selectedCategoryIds.includes(t.category_id)) return false;
                }

                return true;
            });

            // Create category map for details lookup
            const categoryMap = categories.reduce((acc, cat) => {
                acc[cat.id] = cat;
                return acc;
            }, {} as Record<string, typeof categories[0]>);

            const dataToExport = filtered.map(t => {
                const category = t.category_id ? categoryMap[t.category_id] : null;
                const groupName = category?.groups?.name || 'Other';

                return {
                    Date: t.date,
                    Vendor: t.vendors?.name || t.vendor || '',
                    Category: t.categories?.name || 'Uncategorized',
                    Group: groupName,
                    Account: t.accounts?.name || '',
                    Amount: t.amount,
                    Type: t.type,
                    Description: t.description || ''
                };
            });

            if (exportFormat === 'json') {
                const jsonString = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${fromDate || 'all'}_to_${toDate || 'all'}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // CSV
                const headers = ['Date', 'Vendor', 'Category', 'Group', 'Account', 'Amount', 'Type', 'Description'];
                const csvContent = [
                    headers.join(','),
                    ...dataToExport.map(row => [
                        row.Date,
                        `"${row.Vendor.replace(/"/g, '""')}"`,
                        `"${row.Category.replace(/"/g, '""')}"`,
                        `"${row.Group.replace(/"/g, '""')}"`,
                        `"${row.Account.replace(/"/g, '""')}"`,
                        row.Amount,
                        row.Type,
                        `"${row.Description.replace(/"/g, '""')}"`
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${fromDate || 'all'}_to_${toDate || 'all'}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    // Group categories by their group name for display
    const categoriesByGroup: { [key: string]: typeof categories } = {};
    categories.forEach(cat => {
        const groupName = cat.groups?.name || 'Other';
        if (!categoriesByGroup[groupName]) {
            categoriesByGroup[groupName] = [];
        }
        categoriesByGroup[groupName].push(cat);
    });

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-[fadeIn_0.2s_ease-out]">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#151515]">
                    <h2 className="text-xl font-bold text-white">Export Transactions</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white">
                        <Image src="/plus.svg" alt="Close" width={20} height={20} className="rotate-45 invert" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-8 flex-1">

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-green focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/60">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-green focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Accounts */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-white/60">Accounts</label>
                            <button
                                onClick={() => { setSelectAllAccounts(!selectAllAccounts); setSelectedAccountIds([]); }}
                                className={`text-xs px-2 py-1 rounded transition-colors ${selectAllAccounts ? 'bg-green/20 text-green' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                                {selectAllAccounts ? 'All Accounts Included' : 'Select Specific'}
                            </button>
                        </div>

                        {!selectAllAccounts && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-white/[0.02] rounded-lg border border-white/5 max-h-40 overflow-y-auto">
                                {accounts.map(acc => (
                                    <label key={acc.id} className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedAccountIds.includes(acc.id) ? 'bg-green border-green' : 'border-white/20 group-hover:border-white/40'}`}>
                                            {selectedAccountIds.includes(acc.id) && <Image src="/check.svg" alt="Check" width={10} height={10} className="invert" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedAccountIds.includes(acc.id)}
                                            onChange={() => handleAccountToggle(acc.id)}
                                        />
                                        <span className={`text-sm ${selectedAccountIds.includes(acc.id) ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{acc.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-white/60">Categories</label>
                            <button
                                onClick={() => { setSelectAllCategories(!selectAllCategories); setSelectedCategoryIds([]); }}
                                className={`text-xs px-2 py-1 rounded transition-colors ${selectAllCategories ? 'bg-green/20 text-green' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                                {selectAllCategories ? 'All Categories Included' : 'Select Specific'}
                            </button>
                        </div>

                        {!selectAllCategories && (
                            <div className="space-y-4 p-4 bg-white/[0.02] rounded-lg border border-white/5 max-h-60 overflow-y-auto">
                                {Object.entries(categoriesByGroup).map(([group, groupCategories]) => (
                                    <div key={group} className="space-y-2">
                                        <h4 className="text-xs font-semibold text-white/30 uppercase tracking-wider sticky top-0 bg-[#141414] py-1">{group}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {groupCategories.map(cat => (
                                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCategoryIds.includes(cat.id) ? 'bg-green border-green' : 'border-white/20 group-hover:border-white/40'}`}>
                                                        {selectedCategoryIds.includes(cat.id) && <Image src="/check.svg" alt="Check" width={10} height={10} className="invert" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={selectedCategoryIds.includes(cat.id)}
                                                        onChange={() => handleCategoryToggle(cat.id)}
                                                    />
                                                    <span className={`text-sm truncate ${selectedCategoryIds.includes(cat.id) ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{cat.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Format */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-white/60">Format</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${exportFormat === 'csv' ? 'bg-green/10 border-green text-green' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>
                                <input type="radio" name="format" value="csv" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} className="hidden" />
                                <span className="font-semibold">CSV</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${exportFormat === 'json' ? 'bg-green/10 border-green text-green' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>
                                <input type="radio" name="format" value="json" checked={exportFormat === 'json'} onChange={() => setExportFormat('json')} className="hidden" />
                                <span className="font-semibold">JSON</span>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-[#151515] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-lg font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-8 py-3 rounded-lg font-bold text-black bg-green hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isExporting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Image src="/transactions.svg" alt="" width={20} height={20} className="invert brightness-0" />
                                Export Data
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
