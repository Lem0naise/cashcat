'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useSupabase } from '../contexts/supabase-provider';

// Small helper so the native app only shows auth when truly necessary.
const AUTH_ROUTES = ['/login', '/signup'];

export default function TrafficCop() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useSupabase();

    useEffect(() => {
        // Only run this guard on the Capacitor shell.
        if (!Capacitor.isNativePlatform()) return;

        // Wait until we know whether a cached/active session exists.
        if (loading) return;

        const onBudget = pathname?.startsWith('/budget');
        const onAuth = pathname ? AUTH_ROUTES.includes(pathname) : false;

        if (user) {
            // We have a cached/active session – always anchor the app to /budget for offline use.
            if (!onBudget) {
                router.replace('/budget');
            }
            return;
        }

        // No session found: only send the user to auth routes, otherwise default to login.
        if (!onAuth) {
            router.replace('/login');
        }
    }, [loading, pathname, router, user]);

    return null;
}
