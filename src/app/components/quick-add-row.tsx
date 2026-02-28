'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { Parser } from 'expr-eval';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useGroups } from '../hooks/useGroups';
import { useVendors } from '../hooks/useVendors';
import { useTransactions } from '../hooks/useTransactions';
import { getCurrencySymbol } from './charts/utils';

type Vendor = { id: string; name: string };

interface QuickAddRowProps {
    onSubmit: (transaction: {
        amount: number;
        date: string;
        vendor: string;
        description?: string;
        type: string;
        account_id: string;
        category_id?: string | null;
    }) => void;
    /** Called when user presses Escape on an empty row */
    onCancel?: () => void;
    /** If true the amount field gets auto-focused */
    autoFocus?: boolean;
    /** Optional external ref to the amount input for programmatic focus */
    amountInputRef?: React.RefObject<HTMLInputElement | null>;
}

function evaluateExpression(expression: string): number {
    try {
        const sanitized = expression.replace(/[^0-9+\-*/.()]/g, '');
        if (!sanitized) return 0;
        const parser = new Parser();
        const result = parser.evaluate(sanitized);
        return typeof result === 'number' && !isNaN(result) ? Math.max(0, result) : 0;
    } catch {
        return 0;
    }
}

export default function QuickAddRow({ onSubmit, onCancel, autoFocus = false, amountInputRef }: QuickAddRowProps) {
    const { data: cachedAccounts = [] } = useAccounts();
    const { data: cachedCategories = [] } = useCategories();
    const { data: cachedGroups = [] } = useGroups();
    const { data: cachedVendors = [] } = useVendors();
    const { data: cachedTransactions = [] } = useTransactions();

    const accounts = useMemo(() =>
        cachedAccounts.map(a => ({ id: a.id, name: a.name, type: a.type, is_default: a.is_default })),
        [cachedAccounts]
    );
    const categories = useMemo(() => cachedCategories as any[], [cachedCategories]);
    const groups = useMemo(() => cachedGroups as any[], [cachedGroups]);
    const allVendors = useMemo(() =>
        cachedVendors.map(v => ({ id: v.id, name: v.name })),
        [cachedVendors]
    );

    const defaultAccount = useMemo(() => {
        const def = accounts.find(a => a.is_default);
        return def?.id || accounts[0]?.id || '';
    }, [accounts]);

    const [currencySymbol, setCurrencySymbol] = useState(() => getCurrencySymbol());

    useEffect(() => {
        const handler = () => setCurrencySymbol(getCurrencySymbol());
        window.addEventListener('currencyChanged', handler);
        return () => window.removeEventListener('currencyChanged', handler);
    }, []);

    const [type, setType] = useState<'payment' | 'income'>('payment');
    const [amount, setAmount] = useState('');
    const [vendor, setVendor] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Vendor autocomplete
    const [vendorSuggestions, setVendorSuggestions] = useState<Vendor[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);

    // Category search state (inline searchable dropdown)
    const [catSearch, setCatSearch] = useState('');
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [activeCatIdx, setActiveCatIdx] = useState(0);

    // Account dropdown
    const [showAccDropdown, setShowAccDropdown] = useState(false);
    const [activeAccIdx, setActiveAccIdx] = useState(0);

    // Refs for focus management
    const amountRef = useRef<HTMLInputElement>(null);
    // Merge internal amountRef with optional external amountInputRef
    const setAmountRef = useCallback((el: HTMLInputElement | null) => {
        (amountRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
        if (amountInputRef) (amountInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }, [amountInputRef]);
    const vendorRef = useRef<HTMLInputElement>(null);
    const vendorContainerRef = useRef<HTMLDivElement>(null);
    const catRef = useRef<HTMLInputElement>(null);
    const catContainerRef = useRef<HTMLDivElement>(null);
    const accContainerRef = useRef<HTMLDivElement>(null);
    const accButtonRef = useRef<HTMLButtonElement>(null);
    const dateRef = useRef<HTMLInputElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

    // Set default account when accounts load
    useEffect(() => {
        if (defaultAccount && !accountId) {
            setAccountId(defaultAccount);
        }
    }, [defaultAccount]);

    // Auto-focus amount on mount if requested
    useEffect(() => {
        if (autoFocus) {
            setTimeout(() => amountRef.current?.focus(), 50);
        }
    }, [autoFocus]);

    // Reset date to today each time we start fresh (on type change etc)
    const resetForm = useCallback(() => {
        setAmount('');
        setVendor('');
        setCategoryId('');
        setDate(new Date().toISOString().split('T')[0]);
        setCatSearch('');
        setShowSuggestions(false);
        setShowCatDropdown(false);
        setShowAccDropdown(false);
        // Keep accountId and type — they're sticky across entries for power users
        setTimeout(() => amountRef.current?.focus(), 30);
    }, []);

    // ── Vendor autocomplete ────────────────────────────────────────────────

    const searchVendors = useCallback(
        debounce((term: string) => {
            if (!term.trim()) { setVendorSuggestions([]); return; }
            const filtered = allVendors
                .filter(v => v.name !== 'Starting Balance' && v.name.toLowerCase().includes(term.toLowerCase()))
                .slice(0, 6);
            setVendorSuggestions(filtered);
        }, 40),
        [allVendors]
    );

    const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVendor(e.target.value);
        setActiveSuggestionIdx(-1);
        setShowSuggestions(true);
        searchVendors(e.target.value);
    };

    const selectVendor = useCallback((name: string) => {
        setVendor(name);
        setShowSuggestions(false);
        setVendorSuggestions([]);
        setActiveSuggestionIdx(-1);

        // Pre-fill category + account from most recent transaction
        const recent = cachedTransactions
            .filter(t => t.vendor === name)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (recent) {
            setCategoryId(recent.category_id ?? '');
            const accExists = accounts.find(a => a.id === recent.account_id);
            setAccountId(accExists ? (recent.account_id ?? defaultAccount) : defaultAccount);
        }

        // Move focus to category (or account if income)
        setTimeout(() => catRef.current?.focus(), 30);
    }, [cachedTransactions, accounts, defaultAccount]);

    // Close vendor suggestions on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (vendorContainerRef.current && !vendorContainerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Category dropdown ──────────────────────────────────────────────────

    const filteredCategories = useMemo(() => {
        const term = catSearch.toLowerCase();
        return categories
            .filter(c => !term || c.name.toLowerCase().includes(term))
            .map(c => {
                const g = groups.find((gr: any) => gr.id === c.group);
                return { id: c.id, name: c.name, group: g?.name || 'Other' };
            })
            .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    }, [categories, groups, catSearch]);

    const selectedCategoryName = useMemo(() =>
        categories.find(c => c.id === categoryId)?.name ?? '',
        [categories, categoryId]
    );

    useEffect(() => {
        if (!showCatDropdown) { setActiveCatIdx(0); }
    }, [showCatDropdown, catSearch]);

    useEffect(() => {
        if (showCatDropdown) setActiveCatIdx(0);
    }, [catSearch]);

    // Close cat dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (catContainerRef.current && !catContainerRef.current.contains(e.target as Node)) {
                setShowCatDropdown(false);
                setCatSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectCategory = useCallback((id: string) => {
        setCategoryId(id);
        setShowCatDropdown(false);
        setCatSearch('');
        // Focus account next
        setTimeout(() => accButtonRef.current?.focus(), 30);
    }, []);

    // ── Account dropdown ───────────────────────────────────────────────────

    useEffect(() => {
        if (!showAccDropdown) setActiveAccIdx(0);
    }, [showAccDropdown]);

    // Close acc dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (accContainerRef.current && !accContainerRef.current.contains(e.target as Node)) {
                setShowAccDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedAccountName = useMemo(() =>
        accounts.find(a => a.id === accountId)?.name ?? '',
        [accounts, accountId]
    );

    const selectAccount = useCallback((id: string) => {
        setAccountId(id);
        setShowAccDropdown(false);
        // Move focus to date
        setTimeout(() => dateRef.current?.focus(), 30);
    }, []);

    // ── Submit ─────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(() => {
        const parsedAmount = evaluateExpression(amount);
        if (!parsedAmount || parsedAmount <= 0) { amountRef.current?.focus(); return; }
        if (!vendor.trim()) { vendorRef.current?.focus(); return; }
        if (type === 'payment' && !categoryId) { catRef.current?.focus(); return; }
        if (!accountId) { accButtonRef.current?.focus(); return; }

        onSubmit({
            amount: type === 'payment' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
            type,
            date,
            vendor: vendor.trim(),
            account_id: accountId,
            category_id: type === 'payment' ? categoryId : null,
        });

        resetForm();
    }, [amount, vendor, type, categoryId, accountId, date, onSubmit, resetForm]);

    // ── Amount field keyboard ──────────────────────────────────────────────
    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            if (!e.shiftKey) {
                e.preventDefault();
                // Evaluate expression
                const val = evaluateExpression(amount);
                if (val > 0) setAmount(val.toFixed(2));
                setTimeout(() => vendorRef.current?.focus(), 30);
            }
        } else if (e.key === 'Escape') {
            if (!amount && onCancel) onCancel();
            else setAmount('');
        }
    };

    // ── Vendor field keyboard ──────────────────────────────────────────────
    const handleVendorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions && vendorSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIdx(i => Math.min(i + 1, vendorSuggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIdx(i => Math.max(i - 1, -1));
                return;
            }
            if (e.key === 'Enter' && activeSuggestionIdx >= 0) {
                e.preventDefault();
                selectVendor(vendorSuggestions[activeSuggestionIdx].name);
                return;
            }
        }
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            setShowSuggestions(false);
            if (type === 'payment') {
                setTimeout(() => catRef.current?.focus(), 30);
            } else {
                setTimeout(() => accButtonRef.current?.focus(), 30);
            }
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            setShowSuggestions(false);
            setTimeout(() => amountRef.current?.focus(), 30);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            setShowSuggestions(false);
            if (type === 'payment') {
                setTimeout(() => catRef.current?.focus(), 30);
            } else {
                setTimeout(() => accButtonRef.current?.focus(), 30);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            if (!vendor) { setTimeout(() => amountRef.current?.focus(), 30); }
        }
    };

    // ── Category field keyboard ────────────────────────────────────────────
    const handleCatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setShowCatDropdown(true);
            setActiveCatIdx(i => Math.min(i + 1, filteredCategories.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveCatIdx(i => Math.max(i - 1, 0));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showCatDropdown && filteredCategories[activeCatIdx]) {
                selectCategory(filteredCategories[activeCatIdx].id);
            } else if (categoryId) {
                // Already has a selection, move on
                setShowCatDropdown(false);
                setTimeout(() => accButtonRef.current?.focus(), 30);
            } else {
                setShowCatDropdown(true);
            }
            return;
        }
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (showCatDropdown && filteredCategories[activeCatIdx]) {
                selectCategory(filteredCategories[activeCatIdx].id);
            } else {
                setShowCatDropdown(false);
                setCatSearch('');
            }
            setTimeout(() => accButtonRef.current?.focus(), 30);
            return;
        }
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            setShowCatDropdown(false);
            setCatSearch('');
            setTimeout(() => vendorRef.current?.focus(), 30);
            return;
        }
        if (e.key === 'Escape') {
            setShowCatDropdown(false);
            setCatSearch('');
        }
    };

    // ── Account dropdown keyboard ──────────────────────────────────────────
    const handleAccKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (showAccDropdown && accounts[activeAccIdx]) {
                selectAccount(accounts[activeAccIdx].id);
            } else {
                setShowAccDropdown(v => !v);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setShowAccDropdown(true);
            setActiveAccIdx(i => Math.min(i + 1, accounts.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveAccIdx(i => Math.max(i - 1, 0));
            return;
        }
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (showAccDropdown && accounts[activeAccIdx]) {
                selectAccount(accounts[activeAccIdx].id);
            }
            setShowAccDropdown(false);
            setTimeout(() => dateRef.current?.focus(), 30);
            return;
        }
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            setShowAccDropdown(false);
            if (type === 'payment') {
                setTimeout(() => catRef.current?.focus(), 30);
            } else {
                setTimeout(() => vendorRef.current?.focus(), 30);
            }
            return;
        }
        if (e.key === 'Escape') {
            setShowAccDropdown(false);
        }
    };

    // ── Date field keyboard ────────────────────────────────────────────────
    const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            setTimeout(() => accButtonRef.current?.focus(), 30);
        } else if (e.key === 'Escape') {
            setTimeout(() => amountRef.current?.focus(), 30);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────

    const inputClass =
        'w-full h-9 px-2.5 text-sm rounded-md bg-white/[.04] border border-white/[.1] ' +
        'focus:border-green focus:bg-white/[.07] focus:outline-none transition-all placeholder:text-white/30';

    return (
        <form
            onSubmit={e => { e.preventDefault(); handleSubmit(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[.03] border border-white/[.08] hover:border-white/[.14] transition-colors group"
        >
            {/* Type toggle — Payment / Income */}
            <div className="flex-shrink-0">
                <button
                    type="button"
                    onClick={() => setType(t => t === 'payment' ? 'income' : 'payment')}
                    tabIndex={-1}
                    className={`h-9 px-2.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap border ${
                        type === 'payment'
                            ? 'bg-reddy/15 border-reddy/40 text-reddy hover:bg-reddy/25'
                            : 'bg-green/15 border-green/40 text-green hover:bg-green/25'
                    }`}
                    title="Click to toggle type (or press P/I)"
                >
                    {type === 'payment' ? '- Pay' : '+ Inc'}
                </button>
            </div>

            {/* Amount */}
            <div className="w-28 flex-shrink-0 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">{currencySymbol}</span>
                <input
                    ref={setAmountRef}
                    type="tel"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => {
                        const v = e.target.value.replace(/[^0-9+\-*/.()]/g, '');
                        setAmount(v);
                    }}
                    onKeyDown={handleAmountKeyDown}
                    onBlur={() => {
                        if (amount) {
                            const val = evaluateExpression(amount);
                            if (val > 0) setAmount(val.toFixed(2));
                        }
                    }}
                    placeholder="0.00"
                    className={`${inputClass} pl-6 tabular-nums`}
                    autoComplete="off"
                />
            </div>

            {/* Vendor */}
            <div ref={vendorContainerRef} className="w-36 flex-shrink-0 relative">
                <input
                    ref={vendorRef}
                    type="text"
                    value={vendor}
                    onChange={handleVendorChange}
                    onKeyDown={handleVendorKeyDown}
                    onFocus={() => { if (vendor) { setShowSuggestions(true); searchVendors(vendor); } }}
                    placeholder="Vendor"
                    className={inputClass}
                    autoComplete="off"
                />
                {showSuggestions && vendorSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                        {vendorSuggestions.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); selectVendor(s.name); }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                    i === activeSuggestionIdx
                                        ? 'bg-green/20 text-white'
                                        : 'hover:bg-white/[.08] text-white/80'
                                }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Category (payment only) */}
            {type === 'payment' && (
                <div ref={catContainerRef} className="flex-1 min-w-0 relative">
                    <input
                        ref={catRef}
                        type="text"
                        value={showCatDropdown ? catSearch : selectedCategoryName}
                        onChange={e => {
                            setCatSearch(e.target.value);
                            setShowCatDropdown(true);
                            setActiveCatIdx(0);
                        }}
                        onFocus={() => {
                            setCatSearch('');
                            setShowCatDropdown(true);
                            setActiveCatIdx(0);
                        }}
                        onKeyDown={handleCatKeyDown}
                        placeholder="Category"
                        className={`${inputClass} ${!categoryId && !showCatDropdown ? 'border-white/20' : ''}`}
                        autoComplete="off"
                    />
                    {showCatDropdown && filteredCategories.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto">
                            {filteredCategories.map((cat, i) => {
                                const prevGroup = i > 0 ? filteredCategories[i - 1].group : null;
                                const showGroupHeader = cat.group !== prevGroup;
                                return (
                                    <div key={cat.id}>
                                        {showGroupHeader && (
                                            <div className="px-3 py-1 text-xs font-semibold text-green bg-bz sticky top-0">
                                                {cat.group}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            ref={el => { if (i === activeCatIdx && el) el.scrollIntoView({ block: 'nearest' }); }}
                                            onMouseDown={e => { e.preventDefault(); selectCategory(cat.id); }}
                                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                                                i === activeCatIdx
                                                    ? 'bg-green-dark/80 text-white'
                                                    : categoryId === cat.id
                                                        ? 'bg-white/[.06] text-green'
                                                        : 'hover:bg-white/[.06] text-white/80'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Account */}
            <div ref={accContainerRef} className="w-32 flex-shrink-0 relative">
                <button
                    ref={accButtonRef}
                    type="button"
                    onClick={() => setShowAccDropdown(v => !v)}
                    onKeyDown={handleAccKeyDown}
                    className={`${inputClass} text-left flex items-center justify-between gap-1 ${
                        !accountId ? 'text-white/30' : 'text-white/90'
                    }`}
                >
                    <span className="truncate text-sm">
                        {selectedAccountName || 'Account'}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 10 10" className={`opacity-40 flex-shrink-0 transition-transform ${showAccDropdown ? 'rotate-180' : ''}`}>
                        <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                </button>
                {showAccDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        {accounts.map((acc, i) => (
                            <button
                                key={acc.id}
                                type="button"
                                ref={el => { if (i === activeAccIdx && el) el.scrollIntoView({ block: 'nearest' }); }}
                                onMouseDown={e => { e.preventDefault(); selectAccount(acc.id); }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                    i === activeAccIdx
                                        ? 'bg-green-dark/80 text-white'
                                        : accountId === acc.id
                                            ? 'bg-white/[.06] text-green'
                                            : 'hover:bg-white/[.06] text-white/80'
                                }`}
                            >
                                <div className="font-medium truncate">{acc.name}</div>
                                <div className="text-xs text-white/40 truncate">{acc.type}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Date */}
            <div className="w-32 flex-shrink-0">
                <input
                    ref={dateRef}
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    onKeyDown={handleDateKeyDown}
                    className={`${inputClass} [color-scheme:dark]`}
                />
            </div>

            {/* Submit */}
            <div className="flex-shrink-0 flex gap-1">
                <button
                    ref={submitRef}
                    type="submit"
                    className="h-9 px-3 bg-green text-black text-sm font-semibold rounded-md hover:bg-green-dark transition-colors whitespace-nowrap"
                    title="Add transaction (Enter)"
                >
                    Add
                </button>
            </div>
        </form>
    );
}
