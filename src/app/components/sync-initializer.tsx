'use client';

import { useEffect, useRef } from 'react';
import { useSyncAll } from '../hooks/useSyncAll';

export function SyncInitializer() {
    const { syncAll } = useSyncAll();
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            const timer = setTimeout(() => {
                syncAll();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [syncAll]);

    return null;
}
