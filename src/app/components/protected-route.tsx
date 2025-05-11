'use client';

import { useSupabase } from '../contexts/supabase-provider';
import LoadingScreen from './loading';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isDevelopment } from '../utils/mocks';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useSupabase();
    const router = useRouter();

    useEffect(() => {
        if (!isDevelopment && !loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    if (loading && !isDevelopment) {
        return <LoadingScreen />;
    }

    if (!user && !isDevelopment) {
        return null;
    }

    return <>{children}</>;
}
