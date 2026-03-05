'use client';

import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import { formatCurrency } from './charts/utils';
import { Capacitor } from '@capacitor/core';

// ─── Types (local, not importing from charts/types to keep this self-contained) ─

type Transaction = {
    id: string;
    type: string;
    amount: number;
    date: string;
    vendor: string;
    category_id?: string | null;
};

type Category = {
    id: string;
    name: string;
    group?: string | null;
    groups?: { name: string } | null;
};

export type ShareChartType = 'overview' | 'top-vendors' | 'top-categories';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    timeRange: string;
    quickStats: {
        totalSpent: number;
        totalIncome: number;
        txnCount: number;
        dailyAvg: number;
        largestTxn: number;
        net: number;
    };
}

// ─── Colour palette (matches the app's chart colours) ──────────────────────

const PALETTE = [
    '#bac2ff', // blue/green alias
    '#84D684', // true green
    '#f2602f', // reddy
    '#FFD166', // yellow
    '#06D6A0', // teal
    '#A8DADC', // sky
    '#E76F51', // coral
    '#9381FF', // purple
    '#F4A261', // amber
    '#2EC4B6', // turquoise
];

// ─── Data helpers ────────────────────────────────────────────────────────────

function getTopVendors(transactions: Transaction[], categories: Category[], dateRange: { start: Date; end: Date }, limit = 7) {
    const filtered = transactions.filter(t => {
        if (!t || t.type !== 'payment' || !t.vendor) return false;
        const d = new Date(t.date);
        return d >= dateRange.start && d <= dateRange.end;
    });

    const spending: Record<string, { name: string; amount: number; count: number }> = {};
    filtered.forEach(t => {
        const v = t.vendor;
        if (!spending[v]) spending[v] = { name: v, amount: 0, count: 0 };
        spending[v].amount += Math.abs(t.amount);
        spending[v].count += 1;
    });

    const sorted = Object.values(spending).sort((a, b) => b.amount - a.amount).slice(0, limit);
    const total = sorted.reduce((s, x) => s + x.amount, 0);
    return { items: sorted, total, max: sorted[0]?.amount ?? 0 };
}

function getTopCategories(transactions: Transaction[], categories: Category[], dateRange: { start: Date; end: Date }, limit = 7) {
    const catMap = new Map(categories.map(c => [c.id, c]));

    const filtered = transactions.filter(t => {
        if (!t || t.type !== 'payment' || !t.category_id) return false;
        const d = new Date(t.date);
        return d >= dateRange.start && d <= dateRange.end;
    });

    const spending: Record<string, { name: string; group: string; amount: number }> = {};
    filtered.forEach(t => {
        const cat = catMap.get(t.category_id!);
        if (!cat) return;
        const group = cat.groups?.name || cat.group || '';
        if (!spending[cat.id]) spending[cat.id] = { name: cat.name, group, amount: 0 };
        spending[cat.id].amount += Math.abs(t.amount);
    });

    const sorted = Object.entries(spending)
        .sort(([, a], [, b]) => b.amount - a.amount)
        .slice(0, limit)
        .map(([, v]) => v);
    const total = sorted.reduce((s, x) => s + x.amount, 0);
    return { items: sorted, total, max: sorted[0]?.amount ?? 0 };
}

function getPeriodLabel(timeRange: string, dateRange: { start: Date; end: Date }) {
    const labels: Record<string, string> = {
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
        'mtd': format(dateRange.start, 'MMMM yyyy'),
        '3m': 'Last 3 Months',
        'ytd': `Year to Date ${format(dateRange.start, 'yyyy')}`,
        '12m': 'Last 12 Months',
        'all': 'All Time',
    };
    if (labels[timeRange]) return labels[timeRange];
    // custom
    return `${format(dateRange.start, 'd MMM yyyy')} – ${format(dateRange.end, 'd MMM yyyy')}`;
}

// ─── Share Card (the thing we screenshot) ────────────────────────────────────

interface ShareCardProps {
    chart: ShareChartType;
    hideAmounts: boolean;
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    timeRange: string;
    quickStats: ShareModalProps['quickStats'];
}

function Redacted({ wide = false }: { wide?: boolean }) {
    return (
        <span
            className={`inline-block rounded ${wide ? 'w-16' : 'w-10'} h-[1em] bg-white/20 align-middle`}
            aria-hidden
        />
    );
}

function ShareCard({ chart, hideAmounts, transactions, categories, dateRange, timeRange, quickStats }: ShareCardProps) {
    const periodLabel = getPeriodLabel(timeRange, dateRange);
    const vendors = getTopVendors(transactions, categories, dateRange);
    const cats = getTopCategories(transactions, categories, dateRange);

    const amt = (n: number, wide = false) =>
        hideAmounts ? <Redacted wide={wide} /> : <>{formatCurrency(n)}</>;

    return (
        // Fixed 390 × auto card — designed to look good as a 9:16 crop on mobile
        <div
            style={{
                width: 390,
                background: 'linear-gradient(145deg, #111118 0%, #0d0d14 60%, #10101a 100%)',
                borderRadius: 20,
                overflow: 'hidden',
                fontFamily: 'var(--font-suse), system-ui, -apple-system, sans-serif',
                color: '#ededed',
                padding: '28px 24px 20px',
                boxSizing: 'border-box',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Spending Summary
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ededed' }}>
                        {periodLabel}
                    </div>
                </div>
                {/* Logo mark */}
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(186,194,255,0.12)',
                    border: '1px solid rgba(186,194,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="CashCat" width={28} height={28} style={{ objectFit: 'contain' }} />
                </div>
            </div>

            {/* ── KPI strip (always shown) ── */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 20,
            }}>
                {[
                    { label: 'Spent', value: quickStats.totalSpent },
                    { label: 'Income', value: quickStats.totalIncome },
                    { label: 'Net', value: quickStats.net, accent: quickStats.net >= 0 },
                ].map(({ label, value, accent }) => (
                    <div key={label} style={{
                        flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                        padding: '10px 10px 8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
                        <div style={{
                            fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                            color: accent !== undefined ? (accent ? '#84D684' : '#f2602f') : '#ededed',
                        }}>
                            {hideAmounts
                                ? <span style={{ display: 'inline-block', width: 48, height: '1em', background: 'rgba(255,255,255,0.15)', borderRadius: 4, verticalAlign: 'middle' }} />
                                : (label === 'Net' && value >= 0 ? '+' : '') + formatCurrency(value)
                            }
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Chart section ── */}
            {chart === 'overview' && (
                <OverviewChart hideAmounts={hideAmounts} quickStats={quickStats} />
            )}
            {chart === 'top-vendors' && (
                <BarList
                    title="Top Vendors"
                    items={vendors.items.map((v, i) => ({
                        name: v.name,
                        amount: v.amount,
                        pct: vendors.max > 0 ? (v.amount / vendors.max) * 100 : 0,
                        sharePct: vendors.total > 0 ? (v.amount / vendors.total) * 100 : 0,
                        color: PALETTE[i % PALETTE.length],
                    }))}
                    hideAmounts={hideAmounts}
                />
            )}
            {chart === 'top-categories' && (
                <BarList
                    title="Top Categories"
                    items={cats.items.map((c, i) => ({
                        name: c.name,
                        subtitle: c.group,
                        amount: c.amount,
                        pct: cats.max > 0 ? (c.amount / cats.max) * 100 : 0,
                        sharePct: cats.total > 0 ? (c.amount / cats.total) * 100 : 0,
                        color: PALETTE[i % PALETTE.length],
                    }))}
                    hideAmounts={hideAmounts}
                />
            )}

            {/* Watermark */}
            <div style={{
                marginTop: 20, paddingTop: 14,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
                    Made with CashCat
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
                    cashcat.app
                </span>
            </div>
        </div>
    );
}

function OverviewChart({ hideAmounts, quickStats }: { hideAmounts: boolean; quickStats: ShareModalProps['quickStats'] }) {
    const stats = [
        { label: 'Transactions', value: quickStats.txnCount.toString(), raw: true },
        { label: 'Daily Avg', value: formatCurrency(quickStats.dailyAvg) },
        { label: 'Largest', value: formatCurrency(quickStats.largestTxn) },
        { label: 'Per Txn', value: quickStats.txnCount > 0 ? formatCurrency(quickStats.totalSpent / quickStats.txnCount) : '—' },
    ];

    // Spending vs income bar
    const total = Math.max(quickStats.totalIncome, quickStats.totalSpent, 1);
    const incomePct = (quickStats.totalIncome / total) * 100;
    const spendPct = (quickStats.totalSpent / total) * 100;

    return (
        <div>
            {/* Stacked progress bar */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Income vs Spending</span>
                </div>
                <div style={{
                    height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999,
                    overflow: 'hidden', display: 'flex', gap: 2,
                }}>
                    <div style={{ height: '100%', width: `${incomePct}%`, background: '#84D684', borderRadius: 999 }} />
                    <div style={{ height: '100%', width: `${spendPct}%`, background: 'rgba(255,255,255,0.3)', borderRadius: 999 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#84D684' }}>
                        {hideAmounts
                            ? <span style={{ display: 'inline-block', width: 40, height: '1em', background: 'rgba(255,255,255,0.15)', borderRadius: 4, verticalAlign: 'middle' }} />
                            : formatCurrency(quickStats.totalIncome)
                        } income
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                        {hideAmounts
                            ? <span style={{ display: 'inline-block', width: 40, height: '1em', background: 'rgba(255,255,255,0.15)', borderRadius: 4, verticalAlign: 'middle' }} />
                            : formatCurrency(quickStats.totalSpent)
                        } spent
                    </span>
                </div>
            </div>

            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {stats.map(({ label, value, raw }) => (
                    <div key={label} style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                        padding: '10px 12px',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#ededed', fontVariantNumeric: 'tabular-nums' }}>
                            {hideAmounts && !raw
                                ? <span style={{ display: 'inline-block', width: 48, height: '1em', background: 'rgba(255,255,255,0.15)', borderRadius: 4, verticalAlign: 'middle' }} />
                                : value
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface BarListItem {
    name: string;
    subtitle?: string;
    amount: number;
    pct: number;
    sharePct: number;
    color: string;
}

function BarList({ title, items, hideAmounts }: { title: string; items: BarListItem[]; hideAmounts: boolean }) {
    if (items.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '24px 0', fontSize: 13 }}>
                No data for this period
            </div>
        );
    }

    return (
        <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {items.map((item, i) => (
                    <div key={item.name + i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, marginRight: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name}
                                </span>
                                {item.subtitle && (
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{item.subtitle}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                    {item.sharePct.toFixed(0)}%
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#ededed', fontVariantNumeric: 'tabular-nums', minWidth: 56, textAlign: 'right' }}>
                                    {hideAmounts
                                        ? <span style={{ display: 'inline-block', width: 40, height: '1em', background: 'rgba(255,255,255,0.15)', borderRadius: 4, verticalAlign: 'middle' }} />
                                        : formatCurrency(item.amount)
                                    }
                                </span>
                            </div>
                        </div>
                        {/* Bar */}
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.max(item.pct, 2)}%`,
                                background: item.color,
                                opacity: 0.7,
                                borderRadius: 999,
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

const CHART_OPTIONS: { id: ShareChartType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'top-categories', label: 'Top Categories' },
    { id: 'top-vendors', label: 'Top Vendors' },
];

export default function ShareModal({ isOpen, onClose, transactions, categories, dateRange, timeRange, quickStats }: ShareModalProps) {
    const [selectedChart, setSelectedChart] = useState<ShareChartType>('overview');
    const [hideAmounts, setHideAmounts] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const isNative = Capacitor.isNativePlatform();

    const capture = useCallback(async () => {
        if (!cardRef.current) return;
        setIsCapturing(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2,
                skipAutoScale: false,
                backgroundColor: undefined, // card has its own bg
                // Ensure fonts are embedded
                fontEmbedCSS: '',
            });

            if (isNative) {
                // On Capacitor: use Web Share API (available in WKWebView / Android WebView)
                if (navigator.share) {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], 'cashcat-share.png', { type: 'image/png' });
                    await navigator.share({ files: [file], title: 'My CashCat Spending Summary' });
                } else {
                    // Fallback: just download
                    downloadImage(dataUrl);
                }
            } else {
                // Web: try Web Share API first (mobile browsers), fall back to download
                if (navigator.share && navigator.canShare?.({ files: [new File([], 'x.png', { type: 'image/png' })] })) {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], 'cashcat-share.png', { type: 'image/png' });
                    await navigator.share({ files: [file], title: 'My CashCat Spending Summary' });
                } else {
                    downloadImage(dataUrl);
                }
            }
        } catch (err) {
            // User cancelled share sheet — not an error
            const msg = err instanceof Error ? err.message : '';
            if (!msg.includes('AbortError') && !msg.includes('cancel')) {
                console.error('Share failed:', err);
            }
        } finally {
            setIsCapturing(false);
        }
    }, [isNative]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 font-[family-name:var(--font-suse)]"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full sm:max-w-lg bg-[#111118] sm:rounded-2xl border border-white/[.08] shadow-2xl overflow-hidden animate-[slideIn_0.2s_ease-out]">

                {/* Modal header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[.06]">
                    <div>
                        <h2 className="text-base font-bold text-white">Share {getPeriodLabel(timeRange, dateRange)}</h2>
                        <p className="text-xs text-white/40 mt-0.5">Export a beautiful snapshot to share anywhere</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[.06] transition-colors text-white/50"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto max-h-[85dvh]">

                    {/* Chart picker */}
                    <div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mb-2.5">Chart</div>
                        <div className="flex gap-2">
                            {CHART_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedChart(opt.id)}
                                    className={`flex-1 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                                        selectedChart === opt.id
                                            ? 'bg-green/10 border-green/40 text-green'
                                            : 'bg-white/[.03] border-white/[.08] text-white/50 hover:bg-white/[.06] hover:text-white/70'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hide amounts toggle */}
                    <div className="flex items-center justify-between py-3 px-4 bg-white/[.03] rounded-xl border border-white/[.06]">
                        <div>
                            <div className="text-sm text-white font-medium">Hide amounts</div>
                            <div className="text-xs text-white/40 mt-0.5">Replace numbers with redacted bars</div>
                        </div>
                        <button
                            onClick={() => setHideAmounts(v => !v)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${hideAmounts ? 'bg-green' : 'bg-white/[.12]'}`}
                            role="switch"
                            aria-checked={hideAmounts}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${hideAmounts ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Live preview */}
                    <div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Preview</div>
                        <div className="flex justify-center overflow-hidden rounded-2xl">
                            {/* Scale the 390px card to fit the modal */}
                            <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center', marginBottom: '-18%' }}>
                                <div ref={cardRef}>
                                    <ShareCard
                                        chart={selectedChart}
                                        hideAmounts={hideAmounts}
                                        transactions={transactions}
                                        categories={categories}
                                        dateRange={dateRange}
                                        timeRange={timeRange}
                                        quickStats={quickStats}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-1 pb-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/[.05] border border-white/[.08] text-white/60 text-sm font-medium hover:bg-white/[.08] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={capture}
                            disabled={isCapturing}
                            className="flex-2 flex-1 py-3 rounded-xl bg-green text-black text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isCapturing ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Capturing…
                                </>
                            ) : isNative || (typeof navigator !== 'undefined' && !!navigator.share) ? (
                                <>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                                    </svg>
                                    Share
                                </>
                            ) : (
                                <>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadImage(dataUrl: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cashcat-${format(new Date(), 'yyyy-MM')}.png`;
    a.click();
}
