'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
    x: number;
    y: number;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
    isTransfer?: boolean;
}

function ContextMenuPortal({ x, y, onEdit, onDelete, onClose, isTransfer }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x, y });

    useEffect(() => {
        // Clamp menu within viewport
        const menu = menuRef.current;
        if (!menu) return;
        const rect = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let nx = x;
        let ny = y;
        if (x + rect.width > vw - 8) nx = vw - rect.width - 8;
        if (y + rect.height > vh - 8) ny = vh - rect.height - 8;
        if (nx !== x || ny !== y) setPos({ x: nx, y: ny });
    }, [x, y]);

    useEffect(() => {
        const handler = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        // small timeout so the triggering click doesn't immediately close it
        const t = setTimeout(() => {
            document.addEventListener('mousedown', handler);
            document.addEventListener('touchstart', handler);
            document.addEventListener('keydown', keyHandler);
        }, 10);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
            document.removeEventListener('keydown', keyHandler);
        };
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            style={{ left: pos.x, top: pos.y }}
            className="font-[family-name:var(--font-suse)] fixed z-[200] min-w-[160px] bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 animate-[fadeIn_0.1s_ease-out]"
        >
            
            <button
                onMouseDown={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-reddy hover:bg-reddy/10 transition-colors text-left"
            >
                {/* trash icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete {isTransfer ? 'Transfer' : 'Transaction'}
            </button>
        </div>,
        document.body
    );
}

export interface ContextMenuState {
    x: number;
    y: number;
    isTransfer: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

export function useContextMenu() {
    const [menu, setMenu] = useState<ContextMenuState | null>(null);

    const openMenu = (
        e: React.MouseEvent,
        opts: { isTransfer: boolean; onEdit: () => void; onDelete: () => void }
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY, ...opts });
    };

    const closeMenu = () => setMenu(null);

    const Portal = menu ? (
        <ContextMenuPortal
            x={menu.x}
            y={menu.y}
            isTransfer={menu.isTransfer}
            onEdit={menu.onEdit}
            onDelete={menu.onDelete}
            onClose={closeMenu}
        />
    ) : null;

    return { openMenu, closeMenu, Portal };
}
