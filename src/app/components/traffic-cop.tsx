'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

export default function TrafficCop() {
    const router = useRouter();

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            router.push('/budget');
        }
    }, [router]);

    return null;
}
