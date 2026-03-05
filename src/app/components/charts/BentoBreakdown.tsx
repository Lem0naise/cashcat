'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction, Category } from './types';

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
    /** Called when navigating all the way back to the groups view (clears group + category filter) */
    onBack?: () => void;
    /** Called when navigating from vendors back to categories (clears category filter only) */
    onBackToCategory?: () => void;
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
    isOthers?: boolean;    // true for the "Others" catch-all bucket
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
    'rgba(180,180,180,0.55)', // "Others" gets this muted colour
];

function getColor(index: number, isOthers?: boolean): string {
    if (isOthers) return 'rgba(180,180,180,0.55)';
    return PALETTE[index % (PALETTE.length - 1)];
}

// ─── Squarified treemap ───────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number; }

function worst(row: number[], w: number, total: number): number {
    if (row.length === 0) return 99;
    const s = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((w * w * max) / (s * s), (s * s) / (w * w * min)) * total * total;
}

function squarify(items: BentoItem[], rect: Rect): TileRect[] {
    if (items.length === 0) return [];

    const totalArea = rect.w * rect.h;
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
    const w = isHorizontal ? rect.w : rect.h;

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

    const rowTiles = layoutRowNorm(row, items.slice(0, row.length), rect, isHorizontal);
    rowTiles.forEach((t, j) => { t.index = out.length + j; });
    out.push(...rowTiles);

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
    const color = getColor(colorIndex, item.isOthers);

    const pxX = tile.x * containerW + GAP / 2;
    const pxY = tile.y * containerH + GAP / 2;
    const pxW = tile.w * containerW - GAP;
    const pxH = tile.h * containerH - GAP;

    const isWide = pxW > 100;
    const isNarrow = pxW < 70;

    const pad = isNarrow ? 6 : isWide ? 12 : 8;

    // Drill advances mode: groups → categories → vendors
    // "Others" tiles are not drillable
    const canDrill = !!onDrillDown && mode !== 'vendors' && !item.isOthers;
    const clickable = canDrill || (!!onTileClick && mode !== 'vendors' && !item.isOthers);

    const handleClick = () => {
        if (item.isOthers) return;
        if (onTileClick) {
            if (mode === 'groups') {
                onTileClick({ id: item.id, type: 'group' });
            } else if (mode === 'categories') {
                onTileClick({ id: item.id, type: 'category' });
            }
        }
        if (onDrillDown && mode !== 'vendors') {
            onDrillDown(item);
        }
    };

    // Scale font by the smaller dimension, then reduce for long names
    const shortSide = Math.min(pxW, pxH);
    const baseSize = Math.round(Math.min(18, Math.max(9, shortSide * 0.14)));
    const nameLen = item.name.length;
    const lengthDiscount = nameLen <= 8 ? 0 : nameLen <= 14 ? 1 : nameLen <= 20 ? 2 : 3;
    const nameFontSize = Math.max(9, baseSize - lengthDiscount);

    // Sub-label (group/category of the tile)
    const showLabel = item.label && isWide && pxH > 80;

    return (
        <div
            className={`absolute overflow-hidden rounded-xl border transition-all duration-200 ease-out ${clickable
                    ? 'border-white/[.07] hover:border-white/[.35] hover:brightness-110 cursor-pointer active:scale-[0.98]'
                    : 'border-white/[.07] hover:border-white/[.15] cursor-default'
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
            title={
                item.isOthers
                    ? `Others (${item.count} items)`
                    : canDrill
                        ? `Drill into ${item.name}`
                        : clickable
                            ? `Filter by ${item.name}`
                            : item.name
            }
        >
            {/* Full-card colour wash */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: color, opacity: item.isOthers ? 0.08 : 0.13 }}
            />

            {/* Content */}
            <div className="relative w-full h-full flex flex-col justify-center">
                {/* Name — always shown, truncated if needed */}
                <p
                    className="font-semibold text-white leading-tight w-full"
                    style={{
                        fontSize: nameFontSize,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: pxH > 60 ? 2 : 1,
                        WebkitBoxOrient: 'vertical' as any,
                        wordBreak: 'break-word',
                        opacity: item.isOthers ? 0.6 : 1,
                    }}
                >
                    {item.name}
                </p>

                {/* Sub-label: context (category or group name) */}
                {showLabel && (
                    <p
                        className="text-white/40 truncate mt-0.5"
                        style={{ fontSize: Math.max(8, nameFontSize - 2) }}
                    >
                        {item.label}
                    </p>
                )}

                {/* Drill hint for wide tiles */}
                {canDrill && isWide && pxH > 70 && (
                    <p className="text-white/25 mt-1" style={{ fontSize: 8 }}>
                        tap to drill
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Treemap container ────────────────────────────────────────────────────────
const ASPECT = 2.2;         // width / height ratio for the treemap box
const MIN_TILE_PX = 80;     // minimum tile dimension in px — ensures label is always visible

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

    // ── Height calculation: avoid division-by-zero when containerW is 0
    const tilesPerRow = containerW > 0 ? Math.max(1, Math.floor(containerW / MIN_TILE_PX)) : 1;
    const minContainerH = Math.ceil(items.length / tilesPerRow) * MIN_TILE_PX;
    const naturalH = containerW > 0 ? Math.round(containerW / ASPECT) : 0;
    const containerH = containerW > 0 ? Math.max(naturalH, minContainerH) : minContainerH;

    const adjustedItems = containerW > 0 ? enforceMinTileSize(items, containerW, containerH) : items;
    const tiles = containerW > 0
        ? squarify(adjustedItems, { x: 0, y: 0, w: 1, h: 1 })
        : [];

    return (
        <div
            ref={containerRef}
            className="relative w-full"
            style={{ height: containerH }}
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

const TOP_N = 10; // show top N items, rest go into "Others"

export default function BentoBreakdown({
    transactions,
    categories,
    dateRange,
    selectedGroups = [],
    selectedCategories = [],
    onTileClick,
    onBack,
    onBackToCategory,
}: BentoBreakdownProps) {
    const [mode, setMode] = useState<ViewMode>('groups');

    // ── Internal drill-down state ─────────────────────────────────────────────
    const [drillGroup, setDrillGroup] = useState<string | null>(null);
    const [drillCategory, setDrillCategory] = useState<string | null>(null);

    const categoryMap = useMemo(
        () => new Map(categories.map(c => [c.id, c])),
        [categories],
    );

    // ── Drill handler ─────────────────────────────────────────────────────────
    const handleDrillDown = (item: BentoItem) => {
        if (item.isOthers) return;
        if (mode === 'groups') {
            setDrillGroup(item.id);
            setDrillCategory(null);
            setMode('categories');
        } else if (mode === 'categories') {
            setDrillCategory(item.id);
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

    // ── Aggregate by selected mode — top 10 + "Others" ───────────────────────
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
            .sort((a, b) => b.amount - a.amount);

        const top = sorted.slice(0, TOP_N);
        const rest = sorted.slice(TOP_N);

        // Grand total for share calculation (top + others)
        const grandTotal = sorted.reduce((s, x) => s + x.amount, 0);

        const result: BentoItem[] = top.map(x => ({
            ...x,
            share: grandTotal > 0 ? x.amount / grandTotal : 0,
        }));

        // Append "Others" bucket if there are items beyond the top-10
        if (rest.length > 0) {
            const othersAmount = rest.reduce((s, x) => s + x.amount, 0);
            const othersCount = rest.reduce((s, x) => s + x.count, 0);
            result.push({
                id: '__others__',
                name: `Others (${rest.length})`,
                amount: othersAmount,
                count: othersCount,
                share: grandTotal > 0 ? othersAmount / grandTotal : 0,
                isOthers: true,
            });
        }

        return result;
    }, [baseTxns, mode, categoryMap]);

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
    const breadcrumbs: { label: string; onClick: () => void }[] = [];
    if (drillGroup !== null) {
        breadcrumbs.push({
            label: drillGroup,
            onClick: () => {
                setDrillGroup(null);
                setDrillCategory(null);
                setMode('groups');
                // Also clear parent filters so other charts reset
                onBack?.();
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
                // Clear the category filter in the parent
                onBackToCategory?.();
            },
        });
    }

    // Format currency for the summary line
    const fmt = (v: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v);

    return (
        <div>
            {/* Header row: summary + tab switcher */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white tabular-nums">
                        {fmt(totalSpend)}
                    </span>
                    <span className="text-xs text-white/40 tabular-nums">{totalTxns} transactions</span>
                </div>

                <div className="flex gap-1 bg-white/[.03] rounded-lg p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-all ${mode === tab.id
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
                            onBack?.();
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
