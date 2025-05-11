'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSupabase } from './contexts/supabase-provider';
import Logo from './components/logo';
import { isDevelopment } from './utils/mocks';

export default function Landing() {
    const router = useRouter();
    const { user, loading } = useSupabase();

    useEffect(() => {
        if (isDevelopment || (!loading && user)) {
            router.push('/budget');
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
            <main className="container mx-auto px-6 py-16">
                <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        <Logo></Logo>
                    </h1>
                    <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl">
                        Your money, in your hands.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/login')}
                            className="px-8 py-3 bg-green text-black font-medium rounded-lg hover:bg-green-dark transition-all"
                        >
                            Get Started
                        </button>
                        <button
                            onClick={() => router.push('/learn')}
                            className="px-8 py-3 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all"
                        >
                            Learn More
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
