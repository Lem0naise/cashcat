'use client';

import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export default function OfflineBadge() {
    const [isOffline, setIsOffline] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        let networkListener: any;

        const updateStatus = (status: { connected: boolean }) => {
            const offline = !status.connected;
            setIsOffline(offline);
            if (offline) {
                setShow(true);
            } else {
                // Fade out then hide
                setTimeout(() => setShow(false), 300);
            }
        };

        const initNetwork = async () => {
            // Initial check
            const status = await Network.getStatus();
            updateStatus(status);

            // Listen for changes
            networkListener = await Network.addListener('networkStatusChange', updateStatus);
        };

        initNetwork();

        // Web fallback
        const handleWebOffline = () => updateStatus({ connected: false });
        const handleWebOnline = () => updateStatus({ connected: true });

        window.addEventListener('offline', handleWebOffline);
        window.addEventListener('online', handleWebOnline);

        return () => {
            if (networkListener) networkListener.remove();
            window.removeEventListener('offline', handleWebOffline);
            window.removeEventListener('online', handleWebOnline);
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
