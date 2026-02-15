'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useSupabase } from '../contexts/supabase-provider';
import Logo from './logo';

export default function TrafficCop() {
    const router = useRouter();
    const { user, loading } = useSupabase();
    // Use state to track platform to ensure consistent rendering/hydrating if needed,
    // though Capacitor.isNativePlatform() is generally safe access.
    // For simplicity and safety with hooks:
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        // If not native, strictly do nothing.
        if (!isNative) return;

        // Wait for auth to load
        if (loading) return;

        if (user) {
            // User is logged in -> Go to budget
            router.replace('/budget');
        } else {
            // User is NOT logged in -> Go to login
            router.replace('/login');
        }
    }, [isNative, loading, router, user]);


    // If we are NOT on a native platform (Capacitor), do nothing.
    // Web users should see the landing page as normal.
    if (!isNative) {
        return null;
    }

    // If we ARE on Capacitor, this overlay hides the underlying Landing Page
    // while the useEffect above handles the redirection.
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
            <Logo />
        </div>
    );
}
