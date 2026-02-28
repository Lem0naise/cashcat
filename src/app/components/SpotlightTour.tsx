'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

export type TourStep = {
    /** ID of the target DOM element to highlight. Null = centred modal (no highlight). */
    targetId: string | null;
    title: string;
    body: string;
    /** Preferred tooltip position relative to target. Default 'bottom'. */
    position?: 'top' | 'bottom' | 'left' | 'right';
};

interface SpotlightTourProps {
    steps: TourStep[];
    onFinish: () => void;
    /** Zero-based index of the current step */
    stepIndex?: number;
    onStepChange?: (index: number) => void;
}

const PAD = 12; // px padding around the highlighted element
const TOOLTIP_W = 320; // px tooltip width
const TOOLTIP_MARGIN = 16; // px gap between spotlight rect and tooltip

function useRect(targetId: string | null, stepIndex: number) {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
        if (!targetId) { setRect(null); return; }

        const update = () => {
            const el = document.getElementById(targetId);
            if (el) {
                const r = el.getBoundingClientRect();
                setRect(r);
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            } else {
                setRect(null);
            }
        };

        update();
        // Re-measure after a short delay to allow scroll to finish
        const t = setTimeout(update, 350);
        return () => clearTimeout(t);
    }, [targetId, stepIndex]);

    return rect;
}

function computeTooltipStyle(
    rect: DOMRect | null,
    position: TourStep['position'] = 'bottom',
    vpW: number,
    vpH: number
): React.CSSProperties {
    const tooltipW = Math.min(TOOLTIP_W, vpW - 24);

    if (!rect) {
        // Centred
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: tooltipW,
            zIndex: 10001,
        };
    }

    const spotTop = rect.top - PAD;
    const spotBottom = rect.bottom + PAD;
    const spotLeft = rect.left - PAD;
    const spotRight = rect.right + PAD;
    const spotCenterX = (rect.left + rect.right) / 2;
    const spotCenterY = (rect.top + rect.bottom) / 2;

    let top: number | undefined;
    let left: number | undefined;
    let resolvedPos = position;

    // Try preferred, then fallbacks
    const positions: TourStep['position'][] = [position, 'bottom', 'top', 'right', 'left'];
    for (const pos of positions) {
        if (pos === 'bottom' && spotBottom + TOOLTIP_MARGIN + 120 < vpH) {
            top = spotBottom + TOOLTIP_MARGIN;
            left = Math.min(Math.max(spotCenterX - tooltipW / 2, 12), vpW - tooltipW - 12);
            resolvedPos = 'bottom';
            break;
        }
        if (pos === 'top' && spotTop - TOOLTIP_MARGIN - 120 > 0) {
            top = spotTop - TOOLTIP_MARGIN - 150; // rough estimate; adjusted below
            left = Math.min(Math.max(spotCenterX - tooltipW / 2, 12), vpW - tooltipW - 12);
            resolvedPos = 'top';
            break;
        }
        if (pos === 'right' && spotRight + TOOLTIP_MARGIN + tooltipW < vpW) {
            left = spotRight + TOOLTIP_MARGIN;
            top = Math.min(Math.max(spotCenterY - 80, 12), vpH - 180);
            resolvedPos = 'right';
            break;
        }
        if (pos === 'left' && spotLeft - TOOLTIP_MARGIN - tooltipW > 0) {
            left = spotLeft - TOOLTIP_MARGIN - tooltipW;
            top = Math.min(Math.max(spotCenterY - 80, 12), vpH - 180);
            resolvedPos = 'left';
            break;
        }
    }

    // Fallback: centre
    if (top === undefined || left === undefined) {
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: tooltipW,
            zIndex: 10001,
        };
    }

    return {
        position: 'fixed',
        top,
        left,
        width: tooltipW,
        zIndex: 10001,
    };
}

export default function SpotlightTour({ steps, onFinish, stepIndex = 0, onStepChange }: SpotlightTourProps) {
    const [current, setCurrent] = useState(stepIndex);
    const [vpSize, setVpSize] = useState({ w: 0, h: 0 });
    const step = steps[current];
    const rect = useRect(step?.targetId ?? null, current);

    // Keep internal state in sync with controlled prop
    useEffect(() => { setCurrent(stepIndex); }, [stepIndex]);

    useEffect(() => {
        const update = () => setVpSize({ w: window.innerWidth, h: window.innerHeight });
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const go = useCallback((idx: number) => {
        if (idx >= steps.length) { onFinish(); return; }
        setCurrent(idx);
        onStepChange?.(idx);
    }, [steps.length, onFinish, onStepChange]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'Enter') go(current + 1);
        if (e.key === 'ArrowLeft') go(Math.max(0, current - 1));
        if (e.key === 'Escape') onFinish();
    }, [current, go, onFinish]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!step) return null;

    // Spotlight box (with padding)
    const spotTop = rect ? Math.max(0, rect.top - PAD) : 0;
    const spotLeft = rect ? Math.max(0, rect.left - PAD) : 0;
    const spotW = rect ? rect.width + PAD * 2 : 0;
    const spotH = rect ? rect.height + PAD * 2 : 0;

    const tooltipStyle = computeTooltipStyle(rect, step.position, vpSize.w, vpSize.h);
    const isLast = current === steps.length - 1;
    const isFirst = current === 0;

    return (
        <div
            className="fixed inset-0 z-[10000] font-[family-name:var(--font-suse)]"
            aria-modal="true"
            role="dialog"
            aria-label={step.title}
        >
            {/* Dark overlay using SVG cutout approach for the spotlight */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <mask id="spotlight-mask">
                        {/* White = visible (overlay), black = cutout (target shows through) */}
                        <rect width="100%" height="100%" fill="white" />
                        {rect && (
                            <rect
                                x={spotLeft}
                                y={spotTop}
                                width={spotW}
                                height={spotH}
                                rx="8"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.72)"
                    mask="url(#spotlight-mask)"
                />
                {/* Glowing border around spotlight */}
                {rect && (
                    <rect
                        x={spotLeft}
                        y={spotTop}
                        width={spotW}
                        height={spotH}
                        rx="8"
                        fill="none"
                        stroke="rgba(186,194,255,0.5)"
                        strokeWidth="2"
                    />
                )}
            </svg>

            {/* Click-through region on the spotlight itself — clicking overlay advances */}
            {rect && (
                <div
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{ top: spotTop, left: spotLeft, width: spotW, height: spotH, borderRadius: 8 }}
                    onClick={() => go(current + 1)}
                />
            )}

            {/* Backdrop click also advances (but not the tooltip card) */}
            <div
                className="absolute inset-0 pointer-events-auto cursor-pointer"
                style={{ zIndex: -1 }}
                onClick={() => go(current + 1)}
            />

            {/* Tooltip card */}
            <div
                style={tooltipStyle}
                className="bg-[#111] border border-white/[.12] rounded-2xl shadow-2xl p-5 flex flex-col gap-4 pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                {/* Step counter */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-[#bac2ff]' : 'w-1.5 bg-white/20'}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={onFinish}
                        className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                        Skip tour
                    </button>
                </div>

                {/* Content */}
                <div>
                    <h3 className="text-base font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-white/65 leading-relaxed">{step.body}</p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => go(Math.max(0, current - 1))}
                        disabled={isFirst}
                        className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/[.06] transition-all disabled:opacity-0"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={() => go(current + 1)}
                        className="flex-1 py-2 rounded-xl bg-[#bac2ff] hover:bg-[#a5aef0] text-black text-sm font-semibold transition-colors"
                    >
                        {isLast ? 'Done!' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
