'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from './components/logo';
import { useSupabase } from './contexts/supabase-provider';

export default function Landing() {
    const router = useRouter();
    const { user, loading } = useSupabase();

    useEffect(() => {
        if ((!loading && user)) {
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
                    <p className="text-lg md:text-xl text-white/70 mb-4 max-w-2xl">
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
                    {/* Early Access Notice */}
                    <div className="mb-8 p-6 mt-15 bg-white/[.03] rounded-lg border-l-4 border-l-green">
                        <div className="flex items-start gap-4">
                            <div>
                                <h2 className="text-lg font-medium mb-1">Early Access Notice</h2>
                                <p className="text-white/70">
                                    This application is in very early access. Many features are not implemented, and existing features are in various levels of functionality. Bugs may appear. Feel free to create an account and we will contact you when new features are added!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
