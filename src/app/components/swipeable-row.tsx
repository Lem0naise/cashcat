'use client';
import { useRef, useState, useCallback, ReactNode } from 'react';

interface SwipeableRowProps {
    children: ReactNode;
    onDelete: () => void;
    /** Disable swipe (e.g. for starting-balance rows) */
    disabled?: boolean;
}

const SWIPE_THRESHOLD = 60;   // px before action triggers
const MAX_SWIPE = 80;         // max reveal distance

export default function SwipeableRow({ children, onDelete, disabled }: SwipeableRowProps) {
    const startXRef = useRef<number | null>(null);
    const startYRef = useRef<number | null>(null);
    const [offsetX, setOffsetX] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const committedRef = useRef(false);

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled) return;
        startXRef.current = e.touches[0].clientX;
        startYRef.current = e.touches[0].clientY;
        committedRef.current = false;
        setSwiping(false);
    }, [disabled]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (disabled || startXRef.current === null || startYRef.current === null) return;

        const dx = e.touches[0].clientX - startXRef.current;
        const dy = e.touches[0].clientY - startYRef.current;

        // Only handle left swipes; ignore right swipes and vertical scrolls
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        if (Math.abs(dy) > Math.abs(dx)) return; // primarily vertical — let scroll happen
        if (dx > 0) return; // right swipe — ignore

        if (Math.abs(dx) > 8) {
            e.preventDefault(); // prevent scroll while swiping left
            setSwiping(true);
        }

        setOffsetX(clamp(dx, -MAX_SWIPE, 0));
    }, [disabled]);

    const handleTouchEnd = useCallback(() => {
        if (disabled || startXRef.current === null) return;

        if (offsetX <= -SWIPE_THRESHOLD && !committedRef.current) {
            committedRef.current = true;
            // Snap to full reveal, then fire delete
            setOffsetX(-MAX_SWIPE);
            setTimeout(() => {
                setOffsetX(0);
                setSwiping(false);
                onDelete();
            }, 200);
        } else {
            setOffsetX(0);
            setSwiping(false);
        }

        startXRef.current = null;
        startYRef.current = null;
    }, [disabled, offsetX, onDelete]);

    const deleteProgress = Math.min(1, Math.abs(offsetX) / SWIPE_THRESHOLD);

    return (
        <div className="relative overflow-hidden rounded-lg">
            {/* Delete action background — revealed by left swipe */}
            {offsetX < 0 && (
                <div
                    className="absolute inset-y-0 right-0 flex items-center justify-end px-4 rounded-lg"
                    style={{
                        background: `rgba(242, 96, 47, ${0.15 + deleteProgress * 0.5})`,
                        width: Math.abs(offsetX) + 2,
                    }}
                >
                    <svg
                        width="18" height="18"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{ opacity: deleteProgress, color: '#f2602f', transform: `scale(${0.6 + deleteProgress * 0.4})` }}
                    >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                </div>
            )}

            {/* Content layer */}
            <div
                style={{
                    transform: swiping || offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
                    transition: swiping ? 'none' : 'transform 0.2s ease',
                    willChange: 'transform',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}
