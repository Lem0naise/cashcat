'use client';

import { useSupabase } from '../contexts/supabase-provider';
import LoadingScreen from './loading';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useSupabase();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    if (loading) {
        return <LoadingScreen />;
    }
    if (!user) {
        return null;
    }
    return <>{children}</>;
}
