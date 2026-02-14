'use client';

import { useState, useEffect } from 'react';

export default function OfflineBadge() {
    const [isOffline, setIsOffline] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const updateStatus = () => {
            const offline = !navigator.onLine;
            setIsOffline(offline);
            if (offline) {
                setShow(true);
            } else {
                // Fade out then hide
                setTimeout(() => setShow(false), 300);
            }
        };

        updateStatus();
        window.addEventListener('offline', updateStatus);
        window.addEventListener('online', updateStatus);
        return () => {
            window.removeEventListener('offline', updateStatus);
            window.removeEventListener('online', updateStatus);
        };
    }, []);

    if (!show) return null;

    return (
        <div
            className={`fixed bottom-20 right-4 z-[100] px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all duration-300 ${isOffline
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md opacity-100'
                : 'bg-green/20 text-green border border-green/30 backdrop-blur-md opacity-0'
                }`}
        >
            {isOffline ? 'Offline' : 'Online'}
        </div>
    );
}
