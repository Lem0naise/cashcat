'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction, Category } from './types';
import { formatCurrency } from './utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BentoTileClick {
    id: string;      // group name | category id | vendor name
    type: 'group' | 'category' | 'vendor';
}

interface BentoBreakdownProps {
    transactions: Transaction[];
    categories: Category[];
    dateRange: { start: Date; end: Date };
    selectedGroups?: string[];
    selectedCategories?: string[];
    onTileClick?: (tile: BentoTileClick) => void;
}

type ViewMode = 'groups' | 'categories' | 'vendors';

interface BentoItem {
    id: string;
    name: string;
    label?: string;
    amount: number;
    count: number;
    share: number;         // 0–1 fraction of total visible spend (may be boosted for layout)
    displayShare?: number; // original share before any min-size boost, for display only
}

interface TileRect {
    x: number; // 0–1 fraction of container width
    y: number; // 0–1 fraction of container height
    w: number;
    h: number;
    item: BentoItem;
    index: number;
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = [
    'rgba(186,194,255,0.85)',
    'rgba(134,182,255,0.75)',
    'rgba(134,232,196,0.75)',
    'rgba(255,198,134,0.75)',
    'rgba(255,150,130,0.75)',
    'rgba(210,134,255,0.75)',
    'rgba(134,210,255,0.75)',
    'rgba(255,234,134,0.75)',
    'rgba(255,134,190,0.75)',
    'rgba(134,255,200,0.75)',
    'rgba(200,200,200,0.60)',
    'rgba(255,180,100,0.70)',
];

function getColor(index: number): string {
    return PALETTE[index % PALETTE.length];
}

// ─── Squarified treemap ───────────────────────────────────────────────────────
// All coordinates are in [0,1] normalised space; the caller scales to px.

interface Rect { x: number; y: number; w: number; h: number; }

function worst(row: number[], w: number, total: number): number {
    if (row.length === 0) return 99;
    const s = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((w * w * max) / (s * s), (s * s) / (w * w * min)) * total * total;
}

function layoutRow(row: number[], rect: Rect, isHorizontal: boolean): TileRect[] {
    const tiles: TileRect[] = [];
    const sum = row.reduce((a, b) => a + b, 0);
    let offset = isHorizontal ? rect.y : rect.x;
    const stripSize = isHorizontal
        ? (sum / rect.w) * rect.h      // height of strip
        : (sum / rect.h) * rect.w;     // width of strip

    for (const val of row) {
        const dim = isHorizontal
            ? (val / sum) * rect.w
            : (val / sum) * rect.h;

        tiles.push({
            x: isHorizontal ? rect.x + (isHorizontal ? 0 : offset - rect.x) : rect.x + offset - rect.x,
            y: isHorizontal ? offset : rect.y + (isHorizontal ? offset - rect.y : 0),
            w: isHorizontal ? dim : stripSize,
            h: isHorizontal ? stripSize : dim,
            item: null as any,
            index: -1,
        });
        offset += dim;
    }
    return tiles;
}

function squarify(items: BentoItem[], rect: Rect): TileRect[] {
    if (items.length === 0) return [];

    const totalArea = rect.w * rect.h;
    // Normalise values to sum to totalArea
    const totalShare = items.reduce((s, x) => s + x.share, 0);
    const values = items.map(x => (x.share / totalShare) * totalArea);

    const result: TileRect[] = [];
    squarifyInto(values, items, rect, result);
    return result;
}

function squarifyInto(
    values: number[],
    items: BentoItem[],
    rect: Rect,
    out: TileRect[],
): void {
    if (values.length === 0) return;
    if (values.length === 1) {
        out.push({ ...rect, item: items[0], index: 0 });
        return;
    }

    const isHorizontal = rect.w >= rect.h;
    const w = isHorizontal ? rect.w : rect.h; // length of the shorter side

    let row: number[] = [];
    let i = 0;

    while (i < values.length) {
        const next = values[i];
        if (worst([...row, next], w, 1) <= worst(row, w, 1) || row.length === 0) {
            row.push(next);
            i++;
        } else {
            break;
        }
    }

    // Layout the committed row
    const rowTiles = layoutRowNorm(row, items.slice(0, row.length), rect, isHorizontal);
    rowTiles.forEach((t, j) => { t.index = out.length + j; });
    out.push(...rowTiles);

    // Remaining rectangle
    const sum = row.reduce((a, b) => a + b, 0);
    const stripSize = isHorizontal
        ? (sum / rect.w) * rect.h
        : (sum / rect.h) * rect.w;

    const remaining: Rect = isHorizontal
        ? { x: rect.x, y: rect.y + stripSize, w: rect.w, h: rect.h - stripSize }
        : { x: rect.x + stripSize, y: rect.y, w: rect.w - stripSize, h: rect.h };

    squarifyInto(values.slice(row.length), items.slice(row.length), remaining, out);
}

function layoutRowNorm(
    row: number[],
    rowItems: BentoItem[],
    rect: Rect,
    isHorizontal: boolean,
): TileRect[] {
    const tiles: TileRect[] = [];
    const sum = row.reduce((a, b) => a + b, 0);
    const stripSize = isHorizontal
        ? (sum / rect.w) * rect.h
        : (sum / rect.h) * rect.w;

    let offset = isHorizontal ? rect.x : rect.y;

    for (let k = 0; k < row.length; k++) {
        const val = row[k];
        const dim = isHorizontal ? (val / sum) * rect.w : (val / sum) * rect.h;

        tiles.push({
            x: isHorizontal ? offset : rect.x,
            y: isHorizontal ? rect.y : offset,
            w: isHorizontal ? dim : stripSize,
            h: isHorizontal ? stripSize : dim,
            item: rowItems[k],
            index: k,
        });
        offset += dim;
    }
    return tiles;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
const GAP = 3; // px gap between tiles

function BentoCard({
    tile,
    containerW,
    containerH,
    colorIndex,
    mode,
    onTileClick,
    onDrillDown,
}: {
    tile: TileRect;
    containerW: number;
    containerH: number;
    colorIndex: number;
    mode: ViewMode;
    onTileClick?: (tile: BentoTileClick) => void;
    onDrillDown?: (item: BentoItem) => void;
}) {
    const { item } = tile;
    const color = getColor(colorIndex);
    const sharePct = Math.round((item.displayShare ?? item.share) * 100);

    const pxX = tile.x * containerW + GAP / 2;
    const pxY = tile.y * containerH + GAP / 2;
    const pxW = tile.w * containerW - GAP;
    const pxH = tile.h * containerH - GAP;

    const isWide = pxW > 120;
    const isTall = pxH > 80;
    const isTiny = pxW < 80 || pxH < 72;

    const pad = isTiny ? 6 : isWide ? 14 : 10;

    // Name font size: scale with the smaller tile dimension, then shrink for long names.
    const shortSide = Math.min(pxW, pxH);
    const baseNameSize = Math.round(Math.min(22, Math.max(10, shortSide * 0.13)));
    const nameLen = item.name.length;
    const lengthDiscount = nameLen <= 6 ? 0 : nameLen <= 12 ? 1 : nameLen <= 18 ? 2 : 3;
    const nameFontSize = Math.max(10, baseNameSize - lengthDiscount);

    // Drill advances mode: groups → categories → vendors
    const canDrill = !!onDrillDown && mode !== 'vendors';
    const clickable = canDrill || (!!onTileClick && mode !== 'vendors');

    const handleClick = () => {
        // Fire external filter callback first
        if (onTileClick) {
            if (mode === 'groups') {
                onTileClick({ id: item.id, type: 'group' });
            } else if (mode === 'categories') {
                onTileClick({ id: item.id, type: 'category' });
            }
        }
        // Advance internal drill-down
        if (onDrillDown && mode !== 'vendors') {
            onDrillDown(item);
        }
    };

    return (
        <div
            className={`absolute overflow-hidden rounded-xl border transition-all duration-200 ease-out ${
                clickable
                    ? 'border-white/[.07] hover:border-white/[.35] hover:brightness-110 cursor-pointer active:scale-[0.98]'
                    : 'border-white/[.07] hover:border-white/[.20] cursor-default'
            }`}
            style={{
                left: pxX,
                top: pxY,
                width: pxW,
                height: pxH,
                background: 'rgba(255,255,255,0.04)',
                padding: pad,
            }}
            onClick={clickable ? handleClick : undefined}
            title={canDrill ? `Drill into ${item.name}` : clickable ? `Filter by ${item.name}` : undefined}
        >
            {/* Full-card colour wash */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: color, opacity: 0.13 }}
            />

            {/* Content — hide progressively as card shrinks */}
            <div className="relative w-full h-full flex flex-col justify-between">
                {/* Top row: rank + share */}
                <div className="flex items-start justify-between">
                    <span
                        className="text-[9px] font-bold rounded-full flex items-center justify-center shrink-0"
                        style={{
                            background: color,
                            color: 'rgba(10,10,10,0.85)',
                            width: isTiny ? 14 : 18,
                            height: isTiny ? 14 : 18,
                            fontSize: isTiny ? 8 : 10,
                        }}
                    >
                        {colorIndex + 1}
                    </span>
                    {!isTiny && (
                        <span className="text-[10px] text-white/40 tabular-nums">{sharePct}%</span>
                    )}
                </div>

                {/* Name block — only when tall enough */}
                {isTall && (
                    <div className="mt-1">
                        <p
                            className="font-semibold text-white leading-tight"
                            style={{ fontSize: isWide ? 12 : 10 }}
                            title={item.name}
                        >
                            {item.name}
                        </p>
                        {item.label && isWide && (
                            <p className="text-[9px] text-white/40 truncate mt-0.5">{item.label}</p>
                        )}
                    </div>
                )}

                {/* Amount */}
                <div className="flex items-end justify-between gap-1 mt-auto">
                    <span
                        className="font-bold tabular-nums text-white truncate"
                        style={{ fontSize: isWide ? 13 : 11 }}
                    >
                        {formatCurrency(item.amount)}
                    </span>
                    {isWide && !isTiny && (
                        <span className="text-[9px] text-white/35 tabular-nums shrink-0">
                            {item.count} txn{item.count !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Treemap container ────────────────────────────────────────────────────────
const ASPECT = 2.2;         // width / height ratio for the treemap box
const MIN_TILE_PX = 56;     // minimum tile dimension in px (both width and height)

/**
 * Boost items whose natural share would produce a tile smaller than MIN_TILE_PX
 * so that every tile is at least MIN_TILE_PX × MIN_TILE_PX pixels.
 */
function enforceMinTileSize(items: BentoItem[], containerW: number, containerH: number): BentoItem[] {
    if (items.length === 0) return items;
    const totalArea = containerW * containerH;
    const minShare = (MIN_TILE_PX * MIN_TILE_PX) / totalArea;

    const boosted = items.map(item => ({
        ...item,
        displayShare: item.displayShare ?? item.share,
        share: Math.max(item.share, minShare),
    }));

    const newTotal = boosted.reduce((s, x) => s + x.share, 0);
    return boosted.map(item => ({ ...item, share: item.share / newTotal }));
}

function BentoGrid({
    items,
    mode,
    onTileClick,
    onDrillDown,
}: {
    items: BentoItem[];
    mode: ViewMode;
    onTileClick?: (tile: BentoTileClick) => void;
    onDrillDown?: (item: BentoItem) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerW, setContainerW] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            setContainerW(entries[0].contentRect.width);
        });
        ro.observe(el);
        setContainerW(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    if (items.length === 0) {
        return (
            <div className="text-center text-white/40 py-10 text-sm">
                No spending data for this period
            </div>
        );
    }

    // Minimum container height: enough rows of MIN_TILE_PX to fit all items
    const minContainerH = Math.ceil(items.length / Math.floor(Math.max(containerW, 1) / MIN_TILE_PX)) * MIN_TILE_PX;
    const naturalH = containerW > 0 ? Math.round(containerW / ASPECT) : 0;
    const containerH = Math.max(naturalH, minContainerH);

    const adjustedItems = containerW > 0 ? enforceMinTileSize(items, containerW, containerH) : items;
    const tiles = containerW > 0
        ? squarify(adjustedItems, { x: 0, y: 0, w: 1, h: 1 })
        : [];

    return (
        <div
            ref={containerRef}
            className="relative w-full"
            style={{ height: containerH || undefined }}
        >
            {containerW > 0 && tiles.map((tile, i) => (
                <BentoCard
                    key={tile.item.id}
                    tile={tile}
                    containerW={containerW}
                    containerH={containerH}
                    colorIndex={i}
                    mode={mode}
                    onTileClick={onTileClick}
                    onDrillDown={onDrillDown}
                />
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BentoBreakdown({
    transactions,
    categories,
    dateRange,
    selectedGroups = [],
    selectedCategories = [],
    onTileClick,
}: BentoBreakdownProps) {
    const [mode, setMode] = useState<ViewMode>('groups');
    const [limit] = useState(12);

    // ── Internal drill-down state ─────────────────────────────────────────────
    // drillGroup: group name the user drilled into (set when clicking a group tile)
    // drillCategory: category id the user drilled into (set when clicking a category tile)
    const [drillGroup, setDrillGroup] = useState<string | null>(null);
    const [drillCategory, setDrillCategory] = useState<string | null>(null);

    const categoryMap = useMemo(
        () => new Map(categories.map(c => [c.id, c])),
        [categories],
    );

    // ── Drill handler ─────────────────────────────────────────────────────────
    const handleDrillDown = (item: BentoItem) => {
        if (mode === 'groups') {
            setDrillGroup(item.id);   // item.id === group name for groups mode
            setDrillCategory(null);
            setMode('categories');
        } else if (mode === 'categories') {
            setDrillCategory(item.id); // item.id === category id
            setMode('vendors');
        }
    };

    // Reset drill when manually switching tabs
    const handleTabChange = (newMode: ViewMode) => {
        setMode(newMode);
        if (newMode === 'groups') {
            setDrillGroup(null);
            setDrillCategory(null);
        } else if (newMode === 'categories') {
            setDrillCategory(null);
        }
    };

    // ── Base filtered transactions ────────────────────────────────────────────
    const baseTxns = useMemo(() => {
        return transactions.filter(t => {
            if (!t || t.type !== 'payment') return false;
            const d = new Date(t.date);
            if (d < dateRange.start || d > dateRange.end) return false;

            const cat = t.category_id ? categoryMap.get(t.category_id) : null;
            const groupName = cat ? ((cat as any).groups?.name || cat.group || 'Uncategorized') : 'Uncategorized';

            // External filters (from parent)
            if (selectedGroups.length > 0) {
                if (!selectedGroups.includes(groupName)) return false;
            }
            if (selectedCategories.length > 0) {
                if (!selectedCategories.includes(t.category_id ?? '')) return false;
            }

            // Internal drill filters
            if (drillGroup !== null && groupName !== drillGroup) return false;
            if (drillCategory !== null && t.category_id !== drillCategory) return false;

            return true;
        });
    }, [transactions, dateRange, selectedGroups, selectedCategories, categoryMap, drillGroup, drillCategory]);

    // ── Aggregate by selected mode ────────────────────────────────────────────
    const items: BentoItem[] = useMemo(() => {
        const map = new Map<string, { name: string; label?: string; amount: number; count: number }>();

        baseTxns.forEach(t => {
            let key: string;
            let name: string;
            let label: string | undefined;

            if (mode === 'groups') {
                const cat = t.category_id ? categoryMap.get(t.category_id) : null;
                const gn = cat ? ((cat as any).groups?.name || cat.group || 'Uncategorized') : 'Uncategorized';
                key = gn;
                name = gn;
            } else if (mode === 'categories') {
                const cat = t.category_id ? categoryMap.get(t.category_id) : null;
                if (!cat) {
                    key = '__uncategorized__';
                    name = 'Uncategorized';
                } else {
                    key = cat.id;
                    name = cat.name;
                    label = (cat as any).groups?.name || cat.group || undefined;
                }
            } else {
                // vendors
                key = t.vendor || '__unknown__';
                name = t.vendor || 'Unknown vendor';
                if (t.category_id) {
                    const cat = categoryMap.get(t.category_id);
                    label = cat ? cat.name : undefined;
                }
            }

            const existing = map.get(key);
            if (existing) {
                existing.amount += Math.abs(t.amount);
                existing.count += 1;
            } else {
                map.set(key, { name, label, amount: Math.abs(t.amount), count: 1 });
            }
        });

        const sorted = Array.from(map.entries())
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);

        const total = sorted.reduce((s, x) => s + x.amount, 0);

        return sorted.map(x => ({
            ...x,
            share: total > 0 ? x.amount / total : 0,
        }));
    }, [baseTxns, mode, categoryMap, limit]);

    // ── Total summary ─────────────────────────────────────────────────────────
    const totalSpend = useMemo(
        () => baseTxns.reduce((s, t) => s + Math.abs(t.amount), 0),
        [baseTxns],
    );
    const totalTxns = baseTxns.length;

    const tabs: { id: ViewMode; label: string }[] = [
        { id: 'groups', label: 'Groups' },
        { id: 'categories', label: 'Categories' },
        { id: 'vendors', label: 'Vendors' },
    ];

    // ── Breadcrumb trail ──────────────────────────────────────────────────────
    // Shows the drill path and lets the user click to navigate back up
    const breadcrumbs: { label: string; onClick: () => void }[] = [];
    if (drillGroup !== null) {
        breadcrumbs.push({
            label: drillGroup,
            onClick: () => {
                setDrillGroup(null);
                setDrillCategory(null);
                setMode('groups');
            },
        });
    }
    if (drillCategory !== null) {
        const cat = categoryMap.get(drillCategory);
        breadcrumbs.push({
            label: cat?.name ?? drillCategory,
            onClick: () => {
                setDrillCategory(null);
                setMode('categories');
            },
        });
    }

    return (
        <div>
            {/* Header row: summary + tab switcher */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white tabular-nums">
                        {formatCurrency(totalSpend)}
                    </span>
                    <span className="text-xs text-white/40 tabular-nums">{totalTxns} transactions</span>
                </div>

                <div className="flex gap-1 bg-white/[.03] rounded-lg p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                                mode === tab.id
                                    ? 'bg-green text-black font-medium'
                                    : 'text-white/60 hover:text-white/80'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Breadcrumb trail — only shown when drilled in */}
            {breadcrumbs.length > 0 && (
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                    <button
                        className="text-xs text-white/40 hover:text-white/70 transition-colors"
                        onClick={() => {
                            setDrillGroup(null);
                            setDrillCategory(null);
                            setMode('groups');
                        }}
                    >
                        All
                    </button>
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            <span className="text-white/20 text-xs">/</span>
                            {i < breadcrumbs.length - 1 ? (
                                <button
                                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                                    onClick={crumb.onClick}
                                >
                                    {crumb.label}
                                </button>
                            ) : (
                                <span className="text-xs text-white/70 font-medium">{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            <BentoGrid
                items={items}
                mode={mode}
                onTileClick={onTileClick}
                onDrillDown={handleDrillDown}
            />
        </div>
    );
}
